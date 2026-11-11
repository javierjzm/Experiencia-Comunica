import { DurableObject } from 'cloudflare:workers';

const MIN_TEXT = 3;
const MAX_TEXT = 280;
const MAX_NAME = 40;
// Who a question can be addressed to: the round-table panel. Anything else means "everyone".
const TARGETS = ['MJ Poyato', 'Juanjo Díaz', 'Viviana Varón', 'Jenny Cárdenas'];
// One question per device every 15 s. The venue wifi puts everyone behind a single IP,
// so the per-IP limit is only a generous ceiling against a script flooding the screen.
const DEVICE_COOLDOWN_MS = 15_000;
const IP_WINDOW_MS = 60_000;
const IP_MAX_PER_WINDOW = 120;
const DUPLICATE_WINDOW_MS = 5 * 60_000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const clean = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, max);

export class QaRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0
    )`);
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    // Added after launch: rooms created earlier need the column added in place.
    const cols = this.sql.exec('PRAGMA table_info(questions)').toArray().map((c) => c.name);
    if (!cols.includes('target')) this.sql.exec('ALTER TABLE questions ADD COLUMN target TEXT');
    // Rate-limit bookkeeping lives in memory; losing it on eviction only relaxes the limits briefly.
    this.lastByDevice = new Map();
    this.hitsByIp = new Map();
  }

  // ---------- state ----------

  getMeta(key, fallback) {
    const rows = this.sql.exec('SELECT v FROM meta WHERE k = ?', key).toArray();
    return rows.length ? rows[0].v : fallback;
  }

  setMeta(key, value) {
    this.sql.exec(
      'INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v',
      key,
      String(value),
    );
  }

  isOpen() {
    // Open by default: the QR code is the only way in, so there is nothing to unlock.
    return this.getMeta('open', '1') === '1';
  }

  featuredId() {
    const id = Number(this.getMeta('featured', '0'));
    return id > 0 ? id : null;
  }

  listQuestions(includeHidden) {
    const rows = this.sql
      .exec(
        `SELECT id, name, text, target, created_at, hidden FROM questions
         ${includeHidden ? '' : 'WHERE hidden = 0'} ORDER BY id ASC`,
      )
      .toArray();
    return rows.map((r) => ({ ...r, hidden: !!r.hidden }));
  }

  getQuestion(id) {
    const rows = this.sql
      .exec('SELECT id, name, text, target, created_at, hidden FROM questions WHERE id = ?', id)
      .toArray();
    return rows.length ? { ...rows[0], hidden: !!rows[0].hidden } : null;
  }

  snapshot(role) {
    return {
      type: 'snapshot',
      open: this.isOpen(),
      featured: this.featuredId(),
      questions: this.listQuestions(role === 'control'),
    };
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        // Socket already closing; the client reconnects and gets a fresh snapshot.
      }
    }
  }

  // ---------- HTTP ----------

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/api/qa/state' && request.method === 'GET') {
      return json({ open: this.isOpen(), count: this.listQuestions(false).length });
    }

    if (url.pathname === '/api/qa/questions' && request.method === 'POST') {
      return this.submit(request);
    }

    if (url.pathname === '/api/qa/auth' && request.method === 'POST') {
      let key = '';
      try {
        key = String((await request.json()).key ?? '');
      } catch {
        // empty key → rejected below
      }
      return (await this.validKey(key)) ? json({ ok: true }) : json({ error: 'unauthorized' }, 401);
    }

    if (url.pathname === '/api/qa/ws') {
      return this.connect(request, url);
    }

    return json({ error: 'not_found' }, 404);
  }

  async submit(request) {
    if (!this.isOpen()) return json({ error: 'closed' }, 403);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid' }, 400);
    }

    const text = clean(body.text, MAX_TEXT + 1);
    const name = clean(body.name, MAX_NAME).replace(/\n/g, ' ') || 'Anónimo';
    const target = TARGETS.includes(body.to) ? body.to : null;
    const device = clean(body.clientId, 64);
    if (text.length < MIN_TEXT || text.length > MAX_TEXT || !device) {
      return json({ error: 'invalid' }, 400);
    }

    const now = Date.now();

    const last = this.lastByDevice.get(device) ?? 0;
    if (now - last < DEVICE_COOLDOWN_MS) {
      return json({ error: 'too_fast', retryIn: Math.ceil((DEVICE_COOLDOWN_MS - (now - last)) / 1000) }, 429);
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const hits = (this.hitsByIp.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
    if (hits.length >= IP_MAX_PER_WINDOW) return json({ error: 'too_fast', retryIn: 30 }, 429);

    // Same question sent twice (double tap, or two people with the identical text): keep one.
    // Compared in JS: SQLite's lower() leaves accented letters alone.
    const norm = (s) => s.toLocaleLowerCase('es').replace(/\s+/g, ' ');
    const normalized = norm(text);
    const dup = this.sql
      .exec('SELECT text FROM questions WHERE created_at > ?', now - DUPLICATE_WINDOW_MS)
      .toArray()
      .filter((r) => norm(r.text) === normalized);

    this.lastByDevice.set(device, now);
    hits.push(now);
    this.hitsByIp.set(ip, hits);

    if (dup.length) return json({ ok: true, duplicate: true }, 200);

    const row = this.sql
      .exec('INSERT INTO questions (name, text, target, created_at) VALUES (?, ?, ?, ?) RETURNING id', name, text, target, now)
      .one();
    const question = { id: row.id, name, text, target, created_at: now, hidden: false };
    this.broadcast({ type: 'question', question });
    return json({ ok: true, id: row.id }, 201);
  }

  async connect(request, url) {
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected_websocket' }, 426);

    // Everyone starts as a screen. The presenter's page then sends {type:"auth", key} as its first
    // message, so the key never appears in a URL or in request logs.
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role: 'screen' });
    server.send(JSON.stringify(this.snapshot('screen')));
    return new Response(null, { status: 101, webSocket: client });
  }

  async validKey(given) {
    const expected = this.env.PRESENTER_KEY;
    // No PRESENTER_KEY secret configured: the control page is open to whoever has its link.
    if (!expected) return true;
    if (!given) return false;
    const enc = new TextEncoder();
    const a = enc.encode(given);
    const b = enc.encode(expected);
    if (a.byteLength !== b.byteLength) return false;
    return crypto.subtle.timingSafeEqual(a, b);
  }

  // ---------- WebSocket (hibernation API) ----------

  async webSocketMessage(ws, raw) {
    const { role } = ws.deserializeAttachment() ?? {};
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (msg.type === 'auth') {
      if (await this.validKey(String(msg.key ?? ''))) {
        ws.serializeAttachment({ role: 'control' });
        ws.send(JSON.stringify({ ...this.snapshot('control'), authed: true }));
      } else {
        ws.send(JSON.stringify({ type: 'unauthorized' }));
      }
      return;
    }
    if (role !== 'control') return;

    const id = Number(msg.id);
    switch (msg.action) {
      case 'open':
      case 'close':
        this.setOpen(msg.action === 'open');
        this.broadcast({ type: 'open', open: msg.action === 'open' });
        break;
      case 'hide':
      case 'unhide': {
        const hidden = msg.action === 'hide';
        this.sql.exec('UPDATE questions SET hidden = ? WHERE id = ?', hidden ? 1 : 0, id);
        if (hidden && this.featuredId() === id) {
          this.setMeta('featured', 0);
          this.broadcast({ type: 'featured', id: null });
        }
        const question = this.getQuestion(id);
        if (question) this.broadcast({ type: hidden ? 'hidden' : 'unhidden', id, question });
        break;
      }
      case 'feature': {
        const next = this.featuredId() === id ? null : id;
        this.setMeta('featured', next ?? 0);
        this.broadcast({ type: 'featured', id: next });
        break;
      }
      case 'clear':
        this.sql.exec('DELETE FROM questions');
        this.setMeta('featured', 0);
        this.broadcast({ type: 'cleared' });
        break;
    }
  }

  setOpen(open) {
    this.setMeta('open', open ? 1 : 0);
  }

  async webSocketClose(ws, code) {
    try {
      ws.close(code, 'closing');
    } catch {
      // already closed
    }
  }
}
