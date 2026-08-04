const { writeBookings, readBookings } = require('./_db');
const { v4: uuidv4 } = require('uuid');
const at = require('./_africastalking');
const sms = require('./_sms');

/**
 * POST /api/bookings — Create a new booking
 * Body: { name, phone, email?, room, checkin, checkout, nights, total, deposit?, paymentMethod? }
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, email, room, checkin, checkout, nights, total, deposit, paymentMethod } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    if (!room || !checkin || !checkout) {
      return res.status(400).json({ error: 'Room, check-in, and check-out are required' });
    }

    // Check for duplicate bookings (same room + overlapping dates)
    const bookings = await readBookings();
    const checkinDate = new Date(checkin + 'T00:00:00Z');
    const checkoutDate = new Date(checkout + 'T00:00:00Z');

    const conflict = bookings.find(b => {
      if (b.room !== room) return false;
      const bCheckin = new Date(b.checkin + 'T00:00:00Z');
      const bCheckout = new Date(b.checkout + 'T00:00:00Z');
      return checkinDate < bCheckout && checkoutDate > bCheckin;
    });

    if (conflict) {
      return res.status(409).json({
        error: 'Room already booked for these dates.',
        conflict: {
          ref: conflict.ref,
          checkin: conflict.checkin,
          checkout: conflict.checkout
        }
      });
    }

    // Format phone number
    const cleaned = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleaned.startsWith('260')
      ? '+' + cleaned
      : cleaned.length === 9
        ? '+260' + cleaned
        : '+' + cleaned.replace(/^0+/, '260');

    const bookingRef = at.generateReference();

    const newBooking = {
      id: uuidv4(),
      ref: bookingRef,
      name: name,
      phone: formattedPhone,
      email: email || null,
      room: room,
      checkin: checkin,
      checkout: checkout,
      nights: nights || 1,
      total: total || 0,
      deposit: 0,
      balance: total || 0,
      paymentMethod: null,
      paid: false,
      createdAt: new Date().toISOString(),
      status: 'pending',
      atTransactionId: null,
      atRef: null,
      atStatus: null
    };

    // If paymentMethod and deposit are provided, try to initiate payment via Africa's Talking
    // Falls back gracefully if no payment API key is configured OR if API call fails
    let atResult = null;
    let paymentInitiated = false;
    let fallbackReason = null;  // null, 'no_api_key', or 'api_error'
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
          console.error('Africa\'s Talking payment failed, saving as pending:', e.message);
          fallbackReason = 'api_error';
          newBooking.atStatus = 'api_unavailable';
          newBooking.atError = e.message;
        }
      } else {
        fallbackReason = 'no_api_key';
      }
      // When no payment API is configured or API fails, booking stays pending — admin confirms manually
    }

    bookings.push(newBooking);
    await writeBookings(bookings);

    // Send SMS notification to admin for ALL bookings with payment (not just fallbacks)
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
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
