// Payment webhook — records a mobile money payment for a booking
// POST { bookingId, amount, provider, phone, pin }
// The PIN is just simulated — in production you'd integrate with a real payment gateway

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'bookings.json');

function readBookings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}

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

  // Simulate PIN validation (any 4-digit PIN works)
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ success: false, error: 'Invalid PIN. Must be 4-6 digits.' });
  }

  // Simulate a small chance of failure (like a real payment gateway)
  if (Math.random() < 0.02) {
    return res.status(502).json({ success: false, error: 'Payment failed. Network error. Please try again.' });
  }

  const bookings = readBookings();
  const booking = bookings.find(b => b.id === bookingId);

  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  // Update booking with payment info
  booking.paymentMethod = provider;
  booking.deposit = amount;
  booking.paid = true;
  booking.status = 'confirmed';
  booking.paidAt = new Date().toISOString();

  writeBookings(bookings);

  return res.status(200).json({
    success: true,
    message: 'Payment successful! Your booking is confirmed.',
    booking
  });
};
