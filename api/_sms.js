// SMS notification module — sends alerts to admin when fallback bookings come in
// Uses Africa's Talking SMS API: https://developers.africastalking.com/docs/sms
// Set SMS_USERNAME and SMS_API_KEY env vars on Vercel to enable

const SMS_USERNAME = process.env.SMS_USERNAME || process.env.AFRICAS_TALKING_USERNAME || '';
const SMS_API_KEY = process.env.SMS_API_KEY || process.env.AFRICAS_TALKING_API_KEY || '';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '';  // e.g. '+260976327007'
const SMS_FROM = process.env.SMS_SENDER_ID || 'NASSER';  // Registered sender ID or shortcode

function isSmsEnabled() {
  return !!(SMS_USERNAME && SMS_API_KEY && ADMIN_PHONE);
}

async function sendSms(to, message) {
  if (!isSmsEnabled()) {
    console.log('SMS not configured — skipping notification');
    return { sent: false, reason: 'not_configured' };
  }

  // Use Africa's Talking SMS endpoint
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

    // Africa's Talking returns { SMSMessageData: { Recipients: [...] } }
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

// Send booking notification to admin
async function notifyAdminNewBooking(booking, reason) {
  if (!isSmsEnabled()) return { sent: false };

  const nights = booking.nights || 1;
  const nightLabel = nights === 1 ? 'night' : 'nights';
  const reasonTag = reason === 'api_error'
    ? 'PAYMENT API DOWN — confirm manually'
    : 'PENDING — confirm in admin';
  const msg = [
    `Nasser Lodge Booking`,
    `${booking.name} — ${booking.ref}`,
    `${booking.room} | ${booking.checkin} to ${booking.checkout} (${nights} ${nightLabel})`,
    `Total: ZMW ${(booking.total || 0).toLocaleString()} | Deposit: ZMW ${(booking.deposit || 0).toLocaleString()}`,
    `${booking.phone}`,
    `Status: ${reasonTag}`
  ].join('\n');

  return await sendSms(ADMIN_PHONE, msg);
}

module.exports = { sendSms, notifyAdminNewBooking, isSmsEnabled, ADMIN_PHONE };
