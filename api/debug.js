const { readBookings } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const bookings = await readBookings();

  return res.status(200).json({
    redis: {
      hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      available: hasRedis
    },
    bookingCount: bookings.length,
    bookings: bookings.map(b => ({ id: b.id, name: b.name, room: b.room, status: b.status }))
  });
};
