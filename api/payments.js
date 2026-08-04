// Flutterwave webhook receiver — called by Flutterwave when a payment completes
// Also supports manual status check via GET ?chargeId=xxx&bookingId=xxx

const { readBookings, writeBookings } = require('./_db');
const flw = require('./_flutterwave');

// Verify the webhook came from Flutterwave (using secret hash)
function verifyWebhookSignature(payload, signature) {
  if (!signature || !process.env.FLW_SECRET_HASH) {
    // If no hash secret is set, we can't verify — but we still process
    // In production, always set FLW_SECRET_HASH on Vercel
    console.warn('FLW_SECRET_HASH not configured — webhook signature not verified');
    return true;
  }
  const crypto = require('crypto');
  const computed = crypto.createHmac('sha256', process.env.FLW_SECRET_HASH)
    .update(JSON.stringify(payload))
    .digest('hex');
  return computed === signature;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, verif-hash');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: check payment status (used by frontend polling)
  if (req.method === 'GET') {
    const { bookingId } = req.query;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Missing bookingId' });
    }

    const bookings = await readBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // If we have a Flutterwave charge ID and payment isn't confirmed yet, verify with Flutterwave
    if (booking.flwChargeId && !booking.paid && process.env.FLW_SECRET_KEY) {
      try {
        const charge = await flw.verifyCharge(booking.flwChargeId);
        if (charge) {
          booking.flwStatus = charge.status;
          if (charge.status === 'succeeded' || charge.status === 'successful') {
            booking.paid = true;
            booking.status = 'confirmed';
            booking.paidAt = new Date().toISOString();
            booking.flwProcessorResponse = charge.processor_response
              ? (charge.processor_response.type || charge.processor_response.code)
              : 'approved';
            await writeBookings(bookings);
          }
        }
      } catch (e) {
        console.error('Flutterwave charge verification failed:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      paid: booking.paid,
      status: booking.status,
      flwStatus: booking.flwStatus
    });
  }

  // POST: Flutterwave webhook
  if (req.method === 'POST') {
    const signature = req.headers['verif-hash'];

    // Verify webhook (skip in sandbox/dev if FLW_SECRET_HASH not set)
    if (process.env.FLW_SECRET_HASH && !verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body;

    // We only care about charge.completed events
    if (event.event !== 'charge.completed' && event.type !== 'charge.completed') {
      return res.status(200).json({ success: true, message: 'Event ignored: ' + (event.event || event.type) });
    }

    const chargeData = event.data;
    const chargeId = chargeData.id;
    const chargeStatus = chargeData.status;
    const bookingId = chargeData.meta && chargeData.meta.bookingId;

    if (!bookingId) {
      // Try to find booking by charge ID
      const bookings = await readBookings();
      const booking = bookings.find(b => b.flwChargeId === chargeId);
      if (!booking) {
        return res.status(200).json({ success: true, message: 'No booking found for this charge' });
      }

      // Update booking
      booking.flwStatus = chargeStatus;
      if (chargeStatus === 'succeeded' || chargeStatus === 'successful') {
        booking.paid = true;
        booking.status = 'confirmed';
        booking.paidAt = new Date().toISOString();
        booking.flwProcessorResponse = chargeData.processor_response
          ? (chargeData.processor_response.type || chargeData.processor_response.code)
          : 'approved';
      } else if (chargeStatus === 'failed') {
        booking.flwStatus = 'failed';
        booking.flwProcessorResponse = chargeData.processor_response
          ? (chargeData.processor_response.type || chargeData.processor_response.code)
          : 'failed';
      }
      await writeBookings(bookings);

      return res.status(200).json({ success: true, message: 'Booking updated from webhook' });
    }

    // Find booking by ID from meta
    const bookings = await readBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      return res.status(200).json({ success: true, message: 'Booking not found by meta id' });
    }

    booking.flwStatus = chargeStatus;
    if (chargeStatus === 'succeeded' || chargeStatus === 'successful') {
      booking.paid = true;
      booking.status = 'confirmed';
      booking.paidAt = new Date().toISOString();
      booking.flwProcessorResponse = chargeData.processor_response
        ? (chargeData.processor_response.type || chargeData.processor_response.code)
        : 'approved';
    } else if (chargeStatus === 'failed') {
      booking.flwStatus = 'failed';
      booking.flwProcessorResponse = chargeData.processor_response
        ? (chargeData.processor_response.type || chargeData.processor_response.code)
        : 'failed';
    }

    await writeBookings(bookings);

    return res.status(200).json({ success: true, message: 'Booking updated' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
