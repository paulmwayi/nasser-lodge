// Africa's Talking Payments integration helper
// Uses the Mobile Checkout (C2B) API to initiate mobile money payments
// API docs: https://developers.africastalking.com/docs
//
// Required env vars on Vercel:
//   AT_API_KEY         — Your Africa's Talking API key
//   AT_USERNAME        — Your Africa's Talking app username (not "sandbox")
//   AT_PRODUCT_NAME    — Your payment product name (e.g. "NasserLodgeDeposits")
//   AT_PROVIDER_CHANNEL— Provider channel (e.g. "1212" for sandbox, provider-specific for live)

const AT_API_KEY = process.env.AT_API_KEY || process.env.AFRICAS_TALKING_API_KEY || '';
const AT_USERNAME = process.env.AT_USERNAME || process.env.AFRICAS_TALKING_USERNAME || '';
const AT_PRODUCT_NAME = process.env.AT_PRODUCT_NAME || 'NasserLodgeDeposits';
const AT_PROVIDER_CHANNEL = process.env.AT_PROVIDER_CHANNEL || '1212';

// Detect sandbox vs live
function isSandbox() {
  return (
    (process.env.NODE_ENV === 'development') ||
    AT_USERNAME === 'sandbox' ||
    (AT_API_KEY && AT_API_KEY.length < 30)
  );
}

function baseURL() {
  return isSandbox()
    ? 'https://payments.sandbox.africastalking.com'
    : 'https://payments.africastalking.com';
}

function isPaymentsEnabled() {
  return !!(AT_API_KEY && AT_USERNAME);
}

function generateReference() {
  return 'NL-' + Date.now().toString(36).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Map our provider names to Africa's Talking provider channels
function toATChannel(provider) {
  if (process.env.AT_PROVIDER_CHANNEL) {
    return process.env.AT_PROVIDER_CHANNEL;
  }
  const map = {
    'airtel': 'AIRTEL',
    'mtn': 'MTN',
    'zamtel': 'ZAMTEL',
    'Airtel Money': 'AIRTEL',
    'MTN Mobile Money (MoMo)': 'MTN',
    'Zamtel Kwacha': 'ZAMTEL'
  };
  return map[provider] || provider.toUpperCase();
}

function toInternationalPhone(raw) {
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('260') && cleaned.length === 12) return '+' + cleaned;
  if (cleaned.length === 9) return '+260' + cleaned;
  return '+' + cleaned.replace(/^\+/, '');
}

/**
 * Initiate a mobile money checkout (C2B) request.
 */
async function initiateMobileCheckout({ phoneNumber, amount, currency, provider, metadata, reference }) {
  if (!isPaymentsEnabled()) {
    throw new Error('AT_API_KEY and AT_USERNAME must be configured');
  }

  const ref = reference || generateReference();
  const phone = toInternationalPhone(phoneNumber);
  const providerChannel = toATChannel(provider);
  const currencyCode = currency || 'ZMW';

  const payload = {
    username: AT_USERNAME,
    productName: AT_PRODUCT_NAME,
    providerChannel: providerChannel,
    phoneNumber: phone,
    currencyCode: currencyCode,
    amount: Math.round(amount),
    metadata: metadata || {}
  };

  const url = baseURL() + '/mobile/checkout/request';
  console.log('AT Payment Request →', url, JSON.stringify({ ...payload, metadata: '...' }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': AT_API_KEY
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    console.log('AT Payment Response ←', res.status, JSON.stringify(data).slice(0, 300));

    if (res.status === 201 || data.status === 'PendingConfirmation') {
      return {
        success: true,
        transactionId: data.transactionId,
        providerChannel: data.providerChannel,
        status: data.status,
        description: data.description,
        reference: ref
      };
    }

    throw new Error(data.description || data.errorMessage || data.raw || `AT returned HTTP ${res.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check the status of a payment transaction.
 */
async function checkTransactionStatus(transactionId) {
  if (!isPaymentsEnabled()) {
    throw new Error('AT_API_KEY and AT_USERNAME must be configured');
  }

  const body = {
    username: AT_USERNAME,
    transactionId: transactionId
  };

  const url = baseURL() + '/query/transaction/find';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': AT_API_KEY
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const data = await res.json();

    if (res.ok || data.status === 'Success') {
      return {
        transactionId: data.transactionId,
        status: data.status,
        value: data.value,
        category: data.category,
        provider: data.provider,
        providerChannel: data.providerChannel,
        source: data.source,
        destination: data.destination,
        transactionFee: data.transactionFee,
        creationTime: data.creationTime
      };
    }

    throw new Error(data.description || 'Transaction lookup failed');
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  initiateMobileCheckout,
  checkTransactionStatus,
  generateReference,
  toInternationalPhone,
  toATChannel,
  isPaymentsEnabled,
  isSandbox
};
