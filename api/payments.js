// Africa's Talking payment verification endpoint
// Supports polling via GET ?bookingId=xxx to check if payment was confirmed

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

    if (booking.atTransactionId && !booking.paid && at.isPaymentsEnabled()) {
      try {
        const txStatus = await at.checkTransactionStatus(booking.atTransactionId);
        booking.atStatus = txStatus.status;

        if (txStatus.status === 'Success') {
          booking.paid = true;
          booking.status = 'confirmed';
          booking.paidAt = new Date().toISOString();
          booking.atTxValue = txStatus.value;
          booking.atTxFee = txStatus.transactionFee;
          booking.atTxProvider = txStatus.provider;
          await writeBookings(bookings);
          sms.notifyAdminPaymentConfirmed(booking).catch(e => console.error('SMS failed:', e));
        } else if (txStatus.status === 'Failed') {
          booking.atTxValue = txStatus.value;
          await writeBookings(bookings);
          sms.notifyAdminPaymentFailed(booking).catch(e => console.error('SMS failed:', e));
        }
      } catch (e) {
        console.error('AT transaction lookup failed:', e.message);
      }
    }

    return res.status(200).json({ success: true, paid: booking.paid, status: booking.status, atStatus: booking.atStatus });
  }

  if (req.method === 'POST') {
    const { transactionId, bookingId } = req.body;
    if (!transactionId && !bookingId) {
      return res.status(400).json({ success: false, error: 'Missing transactionId or bookingId' });
    }
    const bookings = await readBookings();
    let booking = bookingId ? bookings.find(b => b.id === bookingId) : bookings.find(b => b.atTransactionId === transactionId);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    const txId = transactionId || booking.atTransactionId;
    if (!txId || !at.isPaymentsEnabled()) {
      return res.status(400).json({ success: false, error: 'No transaction ID or payments not configured' });
    }

    try {
      const txStatus = await at.checkTransactionStatus(txId);
      booking.atStatus = txStatus.status;
      booking.atTxValue = txStatus.value;
      booking.atTxFee = txStatus.transactionFee;
      booking.atTxProvider = txStatus.provider;

      if (txStatus.status === 'Success') {
        booking.paid = true;
        booking.status = 'confirmed';
        booking.paidAt = booking.paidAt || new Date().toISOString();
        await writeBookings(bookings);
        sms.notifyAdminPaymentConfirmed(booking).catch(e => console.error('SMS failed:', e));
        return res.status(200).json({ success: true, message: 'Payment confirmed', booking: { id: booking.id, ref: booking.ref, status: booking.status, paid: booking.paid } });
      } else if (txStatus.status === 'Failed') {
        await writeBookings(bookings);
        sms.notifyAdminPaymentFailed(booking).catch(e => console.error('SMS failed:', e));
        return res.status(200).json({ success: true, message: 'Payment failed' });
      } else {
        await writeBookings(bookings);
        return res.status(200).json({ success: true, message: 'Payment still pending', status: txStatus.status });
      }
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Transaction lookup failed: ' + e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
