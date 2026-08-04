// Shared database helpers — uses in-memory cache for development, or persist.
// In production on Vercel, this falls back to in-memory (which resets on cold starts).
// For real persistence, connect to Vercel KV by setting KV_URL, KV_REST_API_URL,
// KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN in your Vercel environment variables.

let kv;
let isKvAvailable = false;

async function initKv() {
  if (kv !== undefined) return isKvAvailable;
  try {
    // Vercel KV uses the @vercel/kv package auto-injected
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      // Manual fetch-based KV access — no extra dependencies needed
      kv = true;
      isKvAvailable = true;
      return true;
    }
  } catch {}
  kv = false;
  isKvAvailable = false;
  return false;
}

// In-memory fallback store (lives for the serverless function's lifecycle)
const memoryStore = new Map();

const BOOKINGS_KEY = 'bookings_list';

async function kvGet(key) {
  if (await initKv()) {
    const res = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  }
  return memoryStore.get(key) || null;
}

async function kvSet(key, value) {
  if (await initKv()) {
    await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: JSON.stringify(value) })
    });
    return;
  }
  memoryStore.set(key, value);
}

async function readBookings() {
  const data = await kvGet(BOOKINGS_KEY);
  return Array.isArray(data) ? data : [];
}

async function writeBookings(bookings) {
  await kvSet(BOOKINGS_KEY, bookings);
}

module.exports = { readBookings, writeBookings };
