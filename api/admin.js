// Admin API — requires a secret key

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple auth — check password in header or query
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nasser2026';
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const queryPassword = req.query.key || '';

  if (token !== ADMIN_PASSWORD && queryPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Provide ?key=password or Bearer token.' });
  }

  // Import bookings handler logic
  const fs = require('fs');
  const path = require('path');
  const DATA_FILE = path.join(process.cwd(), 'data', 'bookings.json');

  function readBookings() {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
      return [];
    }
  }

  function writeBookings(bookings) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
  }

  if (req.method === 'GET') {
    const bookings = readBookings();

    // Optional query filters
    let filtered = bookings;
    if (req.query.status) {
      filtered = filtered.filter(b => b.status === req.query.status);
    }
    if (req.query.room) {
      filtered = filtered.filter(b => b.room === req.query.room);
    }
    if (req.query.search) {
      const s = req.query.search.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(s) ||
        b.phone.includes(s) ||
        b.ref.toLowerCase().includes(s)
      );
    }

    // Sort by check-in date, nearest first
    filtered.sort((a, b) => new Date(a.checkin) - new Date(b.checkin));

    // Stats
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.deposit || 0), 0),
      totalReceivable: bookings.reduce((sum, b) => sum + (b.total || 0), 0)
    };

    return res.status(200).json({ success: true, stats, bookings: filtered });
  }

  // POST — update booking status
  if (req.method === 'POST') {
    const { id, status, action } = req.body;

    if (action === 'delete' && id) {
      const bookings = readBookings();
      const idx = bookings.findIndex(b => b.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
      bookings.splice(idx, 1);
      writeBookings(bookings);
      return res.status(200).json({ success: true });
    }

    if (id && status) {
      const bookings = readBookings();
      const booking = bookings.find(b => b.id === id);
      if (!booking) return res.status(404).json({ success: false, error: 'Not found' });
      booking.status = status;
      writeBookings(bookings);
      return res.status(200).json({ success: true, booking });
    }

    return res.status(400).json({ success: false, error: 'Missing id and status' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
