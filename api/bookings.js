// API endpoint for bookings — supports GET (list all or single by id) and POST (create new + initiate Flutterwave charge)

const { readBookings, writeBookings } = require('./_db');
const flw = require('./_flutterwave');
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

  // POST: create booking + optionally initiate Flutterwave charge
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
      // Flutterwave tracking fields
      flwChargeId: null,
      flwRef: null,
      flwStatus: null
    };

    // If paymentMethod and deposit are provided, try to initiate payment charge
    // Falls back gracefully if no payment API key is configured OR if API call fails
    let flwResult = null;
    let paymentInitiated = false;
    let fallbackReason = null;  // null, 'no_api_key', or 'api_error'
    const hasPaymentAPI = !!(process.env.FLW_SECRET_KEY);

    if (paymentMethod && deposit > 0) {
      newBooking.paymentMethod = paymentMethod;
      newBooking.deposit = deposit;
      newBooking.balance = (total || 0) - deposit;

      if (hasPaymentAPI) {
        try {
          flwResult = await flw.initiateMobileMoneyCharge({
            name: name,
            phone: phone,
            email: email || ('guest-' + phone.replace(/[^0-9]/g, '') + '@nasserlodge.com'),
            network: paymentMethod,
            amount: deposit,
            currency: 'ZMW',
            reference: bookingRef,
            meta: { bookingId: newBooking.id, room: room, checkin: checkin, checkout: checkout }
          });

          newBooking.flwChargeId = flwResult.chargeId;
          newBooking.flwRef = flwResult.reference;
          newBooking.flwStatus = flwResult.status;
          paymentInitiated = true;
        } catch (e) {
          console.error('Payment API failed, saving as pending:', e.message);
          fallbackReason = 'api_error';
          newBooking.flwStatus = 'api_unavailable';
        }
      } else {
        fallbackReason = 'no_api_key';
      }
      // When no payment API is configured or API fails, booking stays pending — admin confirms manually
    }

    bookings.push(newBooking);
    await writeBookings(bookings);

    // Send SMS notification to admin for fallback bookings
    if (!paymentInitiated && paymentMethod) {
      sms.notifyAdminNewBooking(newBooking, fallbackReason).catch(e => {
        console.error('SMS notification failed:', e);
      });
    }

    return res.status(201).json({
      success: true,
      booking: newBooking,
      paymentInitiated: paymentInitiated,
      fallbackReason: fallbackReason,
      flw: flwResult ? {
        chargeId: flwResult.chargeId,
        reference: flwResult.reference,
        status: flwResult.status,
        nextAction: flwResult.nextAction
      } : null
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
