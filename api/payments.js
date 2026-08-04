// Payment verification endpoint
const { readBookings, writeBookings } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { bookingId } = req.query;
    if (!bookingId) return res.status(400).json({ success: false, error: 'Missing bookingId' });
    const bookings = await readBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    return res.status(200).json({ success: true, paid: booking.paid, status: booking.status });
  }

  if (req.method === 'POST') {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, error: 'Missing bookingId' });
    const bookings = await readBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    booking.paid = true; booking.status = 'confirmed'; booking.paidAt = booking.paidAt || new Date().toISOString();
    await writeBookings(bookings);
    return res.status(200).json({ success: true, message: 'Payment confirmed', booking: { id: booking.id, ref: booking.ref, status: booking.status, paid: booking.paid } });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
