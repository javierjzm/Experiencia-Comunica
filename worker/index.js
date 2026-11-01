import { QaRoom } from './qa-room.js';

export { QaRoom };

// One room for the whole event: every phone, the projector and the presenter share it.
const ROOM_NAME = 'evento-2026-11-14';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/qa/')) {
      const room = env.QA_ROOM.get(env.QA_ROOM.idFromName(ROOM_NAME));
      return room.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
