// Payment webhook — records a mobile money payment for a booking

const { readBookings, writeBookings } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { bookingId, amount, provider, phone, pin } = req.body;

  if (!bookingId || !amount || !provider || !pin) {
    return res.status(422).json({ success: false, error: 'Missing fields: bookingId, amount, provider, and pin are required' });
  }

  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ success: false, error: 'Invalid PIN. Must be 4-6 digits.' });
  }

  if (Math.random() < 0.02) {
    return res.status(502).json({ success: false, error: 'Payment failed. Network error. Please try again.' });
  }

  const bookings = await readBookings();
  const booking = bookings.find(b => b.id === bookingId);

  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  booking.paymentMethod = provider;
  booking.deposit = amount;
  booking.balance = (booking.total || 0) - amount;
  booking.paid = true;
  booking.status = 'confirmed';
  booking.paidAt = new Date().toISOString();

  await writeBookings(bookings);

  return res.status(200).json({
    success: true,
    message: 'Payment successful! Your booking is confirmed.',
    booking
  });
};
