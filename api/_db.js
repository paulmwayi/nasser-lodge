// Shared database helpers — uses Upstash Redis (REST API) when available,
// falls back to in-memory cache for local dev.

const BOOKINGS_KEY = 'bookings_list';

// In-memory fallback
const memoryStore = new Map();

async function redisFetch(command, ...args) {
  const url = `${process.env.KV_REST_API_URL}/${command}/${args.join('/')}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const data = await res.json();
  return data.result;
}

function isRedisAvailable() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function readBookings() {
  if (isRedisAvailable()) {
    try {
      const raw = await redisFetch('get', BOOKINGS_KEY);
      if (raw) return JSON.parse(raw);
      return [];
    } catch (e) {
      console.error('Redis read failed, using memory fallback:', e.message);
    }
  }
  return memoryStore.get(BOOKINGS_KEY) || [];
}

async function writeBookings(bookings) {
  if (isRedisAvailable()) {
    try {
      await redisFetch('set', BOOKINGS_KEY, JSON.stringify(bookings));
      return;
    } catch (e) {
      console.error('Redis write failed, using memory fallback:', e.message);
    }
  }
  memoryStore.set(BOOKINGS_KEY, bookings);
}

module.exports = { readBookings, writeBookings };
