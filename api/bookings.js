// API endpoint for bookings — supports GET (list all or single by id) and POST (create new + initiate Africa's Talking mobile checkout)

const { readBookings, writeBookings } = require('./_db');
const at = require('./_africastalking');
const sms = require('./_sms');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: list all bookings or fetch one by id
  if (req.method === 'GET') {
    const bookings = await readBookings();

    // Single booking lookup (used for polling after payment init)
    if (req.query.id) {
      const booking = bookings.find(b => b.id === req.query.id);
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      return res.status(200).json({ success: true, booking });
    }

    return res.status(200).json({ success: true, bookings });
  }

  // POST: create booking + optionally initiate Africa's Talking mobile checkout
  if (req.method === 'POST') {
    const { name, phone, email, room, checkin, checkout, paymentMethod, deposit, total, nights, ref } = req.body;

    const missing = [];
    if (!name) missing.push('name');
    if (!phone) missing.push('phone');
    if (!room) missing.push('room');
    if (!checkin) missing.push('checkin');
    if (!checkout) missing.push('checkout');

    if (missing.length > 0) {
      return res.status(422).json({ success: false, error: 'Missing fields', fields: missing });
    }

    // Double-booking check
    const bookings = await readBookings();
    const ci = new Date(checkin);
    const co = new Date(checkout);
    const conflict = bookings.find(b => {
      if (b.room !== room) return false;
      if (b.status === 'cancelled') return false;
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
      email: email || null,
      room,
      checkin,
      checkout,
      nights: nights || 1,
      total: total || 0,
      deposit: deposit || 0,
      balance: (total || 0) - (deposit || 0),
      paymentMethod: paymentMethod || null,
      paid: false,
      createdAt: now.toISOString(),
      status: 'pending',
      atTransactionId: null,
      atRef: null,
      atStatus: null
    };

    let atResult = null;
    let paymentInitiated = false;
    let fallbackReason = null;
    const hasPaymentAPI = at.isPaymentsEnabled();

    if (paymentMethod && deposit > 0) {
      newBooking.paymentMethod = paymentMethod;
      newBooking.deposit = deposit;
      newBooking.balance = (total || 0) - deposit;

      if (hasPaymentAPI) {
        try {
          atResult = await at.initiateMobileCheckout({
            phoneNumber: phone,
            amount: deposit,
            currency: 'ZMW',
            provider: paymentMethod,
            metadata: { bookingId: newBooking.id, room: room, checkin: checkin, checkout: checkout, guestName: name },
            reference: bookingRef
          });

          newBooking.atTransactionId = atResult.transactionId;
          newBooking.atRef = atResult.reference;
          newBooking.atStatus = atResult.status;
          paymentInitiated = true;
        } catch (e) {
          console.error('AT payment failed, saving as pending:', e.message);
          fallbackReason = 'api_error';
          newBooking.atStatus = 'api_unavailable';
        }
      } else {
        fallbackReason = 'no_api_key';
      }
    }

    bookings.push(newBooking);
    await writeBookings(bookings);

    if (paymentMethod) {
      const reason = paymentInitiated ? 'payment_initiated' : fallbackReason;
      sms.notifyAdminNewBooking(newBooking, reason).catch(e => {
        console.error('SMS notification failed:', e);
      });
    }

    return res.status(201).json({
      success: true,
      booking: newBooking,
      paymentInitiated: paymentInitiated,
      fallbackReason: fallbackReason,
      at: atResult ? {
        transactionId: atResult.transactionId,
        reference: atResult.reference,
        status: atResult.status,
        description: atResult.description
      } : null
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
