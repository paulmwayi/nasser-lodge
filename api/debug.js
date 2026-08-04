const { readBookings } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // List all relevant env vars
  const envKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes('redis') ||
    k.toLowerCase().includes('kv') ||
    k.toLowerCase().includes('upstash') ||
    k.toLowerCase().includes('token') ||
    k.toLowerCase().includes('url')
  );
  const envVals = {};
  envKeys.forEach(k => {
    envVals[k] = process.env[k] ? 'SET (' + process.env[k].slice(0, 15) + '...)' : 'NOT SET';
  });

  const bookings = await readBookings();

  return res.status(200).json({
    env: envVals,
    bookingCount: bookings.length,
    bookings: bookings.map(b => ({ id: b.id, name: b.name, room: b.room, status: b.status }))
  });
};
