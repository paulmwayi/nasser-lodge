// Admin API — requires a secret key

const { readBookings, writeBookings } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nasser2026';
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const queryPassword = req.query.key || '';

  if (token !== ADMIN_PASSWORD && queryPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const bookings = await readBookings();

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

    filtered.sort((a, b) => new Date(a.checkin) - new Date(b.checkin));

    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.deposit || 0), 0),
      totalReceivable: bookings.reduce((sum, b) => sum + (b.total || 0), 0)
    };

    return res.status(200).json({ success: true, stats, bookings: filtered });
  }

  if (req.method === 'POST') {
    const { id, status, action } = req.body;

    const bookings = await readBookings();

    if (action === 'delete' && id) {
      const idx = bookings.findIndex(b => b.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
      bookings.splice(idx, 1);
      await writeBookings(bookings);
      return res.status(200).json({ success: true });
    }

    if (id && status) {
      const booking = bookings.find(b => b.id === id);
      if (!booking) return res.status(404).json({ success: false, error: 'Not found' });
      booking.status = status;
      // When admin confirms, mark as paid
      if (status === 'confirmed') {
        booking.paid = true;
        booking.paidAt = booking.paidAt || new Date().toISOString();
        // If no deposit set, default to 50% of total
        if (!booking.deposit || booking.deposit <= 0) {
          booking.deposit = Math.ceil((booking.total || 0) * 0.5);
          booking.balance = (booking.total || 0) - booking.deposit;
        }
      }
      await writeBookings(bookings);
      return res.status(200).json({ success: true, booking });
    }

    return res.status(400).json({ success: false, error: 'Missing id and status' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
