// API endpoint for bookings — supports GET (list all) and POST (create new)

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
    return res.status(200).json({ success: true, bookings });
  }

  if (req.method === 'POST') {
    const { name, phone, room, checkin, checkout, paymentMethod, deposit, total, nights, ref } = req.body;

    const missing = [];
    if (!name) missing.push('name');
    if (!phone) missing.push('phone');
    if (!room) missing.push('room');
    if (!checkin) missing.push('checkin');
    if (!checkout) missing.push('checkout');

    if (missing.length > 0) {
      return res.status(422).json({ success: false, error: 'Missing fields', fields: missing });
    }

    const bookings = await readBookings();
    const ci = new Date(checkin);
    const co = new Date(checkout);
    const conflict = bookings.find(b => {
      if (b.room !== room) return false;
      const bci = new Date(b.checkin);
      const bco = new Date(b.checkout);
      return ci < bco && co > bci;
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: 'Room already booked for these dates',
        conflict: { guest: conflict.name, checkin: conflict.checkin, checkout: conflict.checkout }
      });
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    const bookingRef = ref || ('NL-' + y + m + d + '-' + rand);

    const newBooking = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ref: bookingRef,
      name,
      phone: '+260 ' + phone.replace(/^\+?260?/, '').replace(/^0/, ''),
      room,
      checkin,
      checkout,
      nights: nights || 1,
      total: total || 0,
      deposit: deposit || 0,
      balance: (total || 0) - (deposit || 0),
      paymentMethod: paymentMethod || null,
      paid: !!paymentMethod,
      createdAt: now.toISOString(),
      status: paymentMethod ? 'confirmed' : 'pending'
    };

    bookings.push(newBooking);
    await writeBookings(bookings);

    return res.status(201).json({ success: true, booking: newBooking });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
