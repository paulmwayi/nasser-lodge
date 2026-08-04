// API endpoint for bookings — supports GET (list all or single by id) and POST (create new)

const { readBookings, writeBookings } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const bookings = await readBookings();
    if (req.query.id) {
      const booking = bookings.find(b => b.id === req.query.id);
      if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
      return res.status(200).json({ success: true, booking });
    }
    return res.status(200).json({ success: true, bookings });
  }

  if (req.method === 'POST') {
    const { name, phone, email, room, checkin, checkout, total, nights, ref } = req.body;
    const missing = [];
    if (!name) missing.push('name'); if (!phone) missing.push('phone');
    if (!room) missing.push('room'); if (!checkin) missing.push('checkin');
    if (!checkout) missing.push('checkout');
    if (missing.length > 0) return res.status(422).json({ success: false, error: 'Missing fields', fields: missing });

    const bookings = await readBookings();
    const ci = new Date(checkin); const co = new Date(checkout);
    const conflict = bookings.find(b => {
      if (b.room !== room || b.status === 'cancelled') return false;
      return ci < new Date(b.checkout) && co > new Date(b.checkin);
    });
    if (conflict) return res.status(409).json({ success: false, error: 'Room already booked for these dates', conflict: { guest: conflict.name, checkin: conflict.checkin, checkout: conflict.checkout } });

    const now = new Date();
    const bookingRef = ref || ('NL-' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(Math.floor(Math.random()*9000)+1000));

    const newBooking = {
      id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), ref: bookingRef, name,
      phone: '+260 '+phone.replace(/^\+?260?/,'').replace(/^0/,''), email: email||null,
      room, checkin, checkout, nights: nights||1, total: total||0,
      paid: false, createdAt: now.toISOString(), status: 'pending'
    };

    bookings.push(newBooking);
    await writeBookings(bookings);
    return res.status(201).json({ success: true, booking: newBooking });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
