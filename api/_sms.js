// SMS notification module — sends alerts to admin via Africa's Talking SMS API
// Uses Africa's Talking SMS API: https://developers.africastalking.com/docs/sms
//
// Required env vars on Vercel:
//   SMS_USERNAME or AFRICAS_TALKING_USERNAME
//   SMS_API_KEY or AFRICAS_TALKING_API_KEY
//   ADMIN_PHONE     — Admin's phone number for receiving alerts (e.g. '+260978176195')
//   SMS_SENDER_ID   — Registered sender ID or shortcode (default: 'NASSER')

const SMS_USERNAME = process.env.SMS_USERNAME || process.env.AFRICAS_TALKING_USERNAME || '';
const SMS_API_KEY = process.env.SMS_API_KEY || process.env.AFRICAS_TALKING_API_KEY || '';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '';
const SMS_FROM = process.env.SMS_SENDER_ID || 'NASSER';

function isSmsEnabled() {
  return !!(SMS_USERNAME && SMS_API_KEY && ADMIN_PHONE);
}

async function sendSms(to, message) {
  if (!isSmsEnabled()) {
    console.log('SMS not configured — skipping notification');
    return { sent: false, reason: 'not_configured' };
  }

  const url = 'https://api.africastalking.com/version1/messaging';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'apiKey': SMS_API_KEY
      },
      body: new URLSearchParams({
        username: SMS_USERNAME,
        to: to,
        message: message,
        from: SMS_FROM
      }).toString()
    });

    const data = await res.json();

    const recipients = data.SMSMessageData && data.SMSMessageData.Recipients;
    if (recipients && recipients.length > 0) {
      const failed = recipients.filter(r => r.status !== 'Success');
      if (failed.length > 0) {
        console.error('SMS delivery failed:', failed);
        return { sent: false, reason: 'delivery_failed', details: failed };
      }
      return { sent: true };
    }

    console.error('SMS unexpected response:', data);
    return { sent: false, reason: 'unexpected_response' };
  } catch (e) {
    console.error('SMS send error:', e.message);
    return { sent: false, reason: 'error', error: e.message };
  }
}

async function notifyAdminNewBooking(booking, reason) {
  if (!isSmsEnabled()) return { sent: false };

  const nights = booking.nights || 1;
  const nightLabel = nights === 1 ? 'night' : 'nights';

  let statusLine;
  if (reason === 'payment_initiated') {
    statusLine = 'PAYMENT REQUEST SENT — awaiting customer PIN';
  } else if (reason === 'api_error') {
    statusLine = 'PAYMENT API DOWN — confirm manually';
  } else {
    statusLine = 'PENDING — confirm in admin';
  }

  const msg = [
    `Nasser Lodge — New Booking`,
    `${booking.name} | ${booking.ref}`,
    `${booking.room} | ${booking.checkin} to ${booking.checkout} (${nights} ${nightLabel})`,
    `Total: ZMW ${(booking.total || 0).toLocaleString()} | Deposit: ZMW ${(booking.deposit || 0).toLocaleString()}`,
    `${booking.phone}`,
    `Payment: ${booking.paymentMethod || 'N/A'}`,
    `Status: ${statusLine}`
  ].join('\n');

  return await sendSms(ADMIN_PHONE, msg);
}

async function notifyAdminPaymentConfirmed(booking) {
  if (!isSmsEnabled()) return { sent: false };

  const msg = [
    `Nasser Lodge — PAYMENT CONFIRMED`,
    `${booking.name} | ${booking.ref}`,
    `${booking.room} | ${booking.checkin} to ${booking.checkout}`,
    `Paid: ZMW ${(booking.deposit || 0).toLocaleString()} via ${booking.paymentMethod}`,
    `Balance: ZMW ${(booking.balance || 0).toLocaleString()}`,
    `Transaction: ${booking.atTransactionId || 'N/A'}`,
    `${booking.phone}`,
    `Status: CONFIRMED — guest can check in`
  ].join('\n');

  return await sendSms(ADMIN_PHONE, msg);
}

async function notifyAdminPaymentFailed(booking) {
  if (!isSmsEnabled()) return { sent: false };

  const msg = [
    `Nasser Lodge — PAYMENT FAILED`,
    `${booking.name} | ${booking.ref}`,
    `${booking.room} | ${booking.checkin} to ${booking.checkout}`,
    `Attempted: ZMW ${(booking.deposit || 0).toLocaleString()} via ${booking.paymentMethod}`,
    `Transaction: ${booking.atTransactionId || 'N/A'}`,
    `${booking.phone}`,
    `Action: Follow up with guest or check admin dashboard`
  ].join('\n');

  return await sendSms(ADMIN_PHONE, msg);
}

async function sendAdminAlert(subject, details) {
  if (!isSmsEnabled()) return { sent: false };
  const msg = [`Nasser Lodge — ${subject}`, details].join('\n');
  return await sendSms(ADMIN_PHONE, msg);
}

module.exports = {
  sendSms,
  notifyAdminNewBooking,
  notifyAdminPaymentConfirmed,
  notifyAdminPaymentFailed,
  sendAdminAlert,
  isSmsEnabled,
  ADMIN_PHONE
};
