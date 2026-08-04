// SMS notification module
const SMS_USERNAME = process.env.SMS_USERNAME || '';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '';
const SMS_FROM = process.env.SMS_SENDER_ID || 'NASSER';

function isSmsEnabled() { return !!(SMS_USERNAME && SMS_API_KEY && ADMIN_PHONE); }

async function sendSms(to, message) {
  if (!isSmsEnabled()) { console.log('SMS not configured'); return { sent: false, reason: 'not_configured' }; }
  const url = process.env.SMS_API_URL || 'https://api.example.com/sms';
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'apiKey': SMS_API_KEY }, body: new URLSearchParams({ username: SMS_USERNAME, to, message, from: SMS_FROM }).toString() });
    const data = await res.json();
    if (res.ok) return { sent: true };
    console.error('SMS delivery failed:', data);
    return { sent: false, reason: 'delivery_failed', details: data };
  } catch (e) { console.error('SMS send error:', e.message); return { sent: false, reason: 'error', error: e.message }; }
}

async function notifyAdminNewBooking(booking) {
  if (!isSmsEnabled()) return { sent: false };
  const nights = booking.nights || 1;
  const msg = ['Nasser Lodge - New Booking', `${booking.name} | ${booking.ref}`, `${booking.room} | ${booking.checkin} to ${booking.checkout} (${nights} ${nights===1?'night':'nights'})`, `Total: ZMW ${(booking.total||0).toLocaleString()}`, `${booking.phone}`, 'Status: PENDING'].join('\n');
  return await sendSms(ADMIN_PHONE, msg);
}

async function notifyAdminPaymentConfirmed(booking) {
  if (!isSmsEnabled()) return { sent: false };
  const msg = ['Nasser Lodge - PAYMENT CONFIRMED', `${booking.name} | ${booking.ref}`, `${booking.room} | ${booking.checkin} to ${booking.checkout}`, `${booking.phone}`, 'Status: CONFIRMED'].join('\n');
  return await sendSms(ADMIN_PHONE, msg);
}

async function notifyAdminPaymentFailed(booking) {
  if (!isSmsEnabled()) return { sent: false };
  const msg = ['Nasser Lodge - PAYMENT FAILED', `${booking.name} | ${booking.ref}`, `${booking.room} | ${booking.checkin} to ${booking.checkout}`, `${booking.phone}`, 'Action: Follow up with guest'].join('\n');
  return await sendSms(ADMIN_PHONE, msg);
}

module.exports = { sendSms, notifyAdminNewBooking, notifyAdminPaymentConfirmed, notifyAdminPaymentFailed, isSmsEnabled, ADMIN_PHONE };
