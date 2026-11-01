/* Shared helpers for the live Q&A pages (/preguntas, /pantalla, /control). */
window.QA = (function () {
  'use strict';

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      // Private mode or blocked storage: the pages still work, they just forget between visits.
    }
    return null;
  }

  // Stable per-device id, used by the server to space out questions from the same phone.
  function clientId() {
    var id = store('qa-client');
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
      store('qa-client', id);
    }
    return id;
  }

  // Live connection that survives wifi drops: exponential backoff, and the server sends a full
  // snapshot on every (re)connect, so nothing is missed while it was down.
  // A dropped wifi does not close a WebSocket by itself, so the page would sit on a dead connection
  // still showing "live". A heartbeat catches that: no reply within HEARTBEAT_TIMEOUT means dead.
  var HEARTBEAT_EVERY = 5000;
  var HEARTBEAT_TIMEOUT = 10000;

  function connect(handlers) {
    var ws = null;
    var attempt = 0;
    var beatTimer = null;
    var lastSeen = 0;
    var retryTimer = null;

    function drop(socket) {
      if (socket !== ws) return;           // a stale socket we already replaced
      clearInterval(beatTimer);
      ws = null;
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      try { socket.close(); } catch (e) { /* already closed */ }
      if (handlers.onStatus) handlers.onStatus(false);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(open, Math.min(8000, 400 * Math.pow(2, attempt++)));
    }

    function open() {
      var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      var socket = new WebSocket(proto + '//' + location.host + '/api/qa/ws');
      ws = socket;

      socket.onopen = function () {
        attempt = 0;
        lastSeen = Date.now();
        if (handlers.onOpen) handlers.onOpen(api);
        if (handlers.onStatus) handlers.onStatus(true);
        clearInterval(beatTimer);
        beatTimer = setInterval(function () {
          if (Date.now() - lastSeen > HEARTBEAT_TIMEOUT) return drop(socket);
          if (socket.readyState === 1) socket.send('{"type":"ping"}');
        }, HEARTBEAT_EVERY);
      };

      socket.onmessage = function (event) {
        lastSeen = Date.now();
        var msg;
        try { msg = JSON.parse(event.data); } catch (e) { return; }
        if (msg.type !== 'pong') handlers.onMessage(msg);
      };

      socket.onclose = function () { drop(socket); };
      socket.onerror = function () { drop(socket); };
    }

    // Coming back online or to the tab: reconnect now instead of waiting out the backoff.
    function reconnectSoon() {
      if (ws && ws.readyState === 1) return;
      attempt = 0;
      clearTimeout(retryTimer);
      if (!ws) open();
    }
    window.addEventListener('online', reconnectSoon);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) reconnectSoon();
    });

    var api = {
      send: function (obj) {
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify(obj));
          return true;
        }
        return false;
      }
    };

    open();
    return api;
  }

  function initial(name) {
    var n = String(name || '').trim();
    return n && n !== 'Anónimo' ? n.charAt(0).toUpperCase() : '?';
  }

  function timeAgo(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return 'ahora';
    var m = Math.round(s / 60);
    return m < 60 ? 'hace ' + m + ' min' : 'hace ' + Math.round(m / 60) + ' h';
  }

  return { store: store, clientId: clientId, connect: connect, initial: initial, timeAgo: timeAgo };
})();
