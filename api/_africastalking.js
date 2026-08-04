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
// For sandbox, use whatever channel you registered (default "1212")
// For live, these would be provider-specific channels from your AT dashboard
function toATChannel(provider) {
  // If AT_PROVIDER_CHANNEL is explicitly set, use it for all providers
  if (process.env.AT_PROVIDER_CHANNEL) {
    return process.env.AT_PROVIDER_CHANNEL;
  }
  // Otherwise try to map known providers
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

// Clean phone to international format: +260XXXXXXXXX
function toInternationalPhone(raw) {
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('260') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  if (cleaned.length === 9) {
    return '+260' + cleaned;
  }
  // Already has country code prefix
  return '+' + cleaned.replace(/^\+/, '');
}

/**
 * Initiate a mobile money checkout (C2B) request.
 * This pushes a USSD prompt to the customer's phone asking them to enter their PIN.
 *
 * @param {Object} params
 * @param {string} params.phoneNumber — Customer phone number
 * @param {number} params.amount — Amount to charge
 * @param {string} params.currency — Currency code (default "ZMW")
 * @param {string} params.provider — Provider name (airtel/mtn/zamtel)
 * @param {Object} params.metadata — Additional metadata for the transaction
 * @param {string} params.reference — Optional custom reference
 */
async function initiateMobileCheckout({ phoneNumber, amount, currency, provider, metadata, reference }) {
  if (!isPaymentsEnabled()) {
    throw new Error('AT_API_KEY and AT_USERNAME must be configured');
  }

  const ref = reference || generateReference();
  const phone = toInternationalPhone(phoneNumber);
  const providerChannel = toATChannel(provider);
  const currencyCode = currency || 'ZMW';

  const body = {
    username: AT_USERNAME,
    productName: AT_PRODUCT_NAME,
    providerChannel: providerChannel,
    phoneNumber: phone,
    currencyCode: currencyCode,
    amount: Math.round(amount), // AT expects integer
    metadata: metadata || {}
  };

  const url = baseURL() + '/mobile/checkout/request';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apiKey': AT_API_KEY
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (res.status === 201 || data.status === 'PendingConfirmation') {
    return {
      success: true,
      transactionId: data.transactionId,
      providerChannel: data.providerChannel,
      status: data.status,        // "PendingConfirmation"
      description: data.description, // "Waiting for user input"
      reference: ref
    };
  }

  // Payment initiation failed
  throw new Error(data.description || data.errorMessage || 'Payment initiation failed');
}

/**
 * Check the status of a payment transaction.
 * Since Africa's Talking doesn't have automatic webhooks for checkout,
 * we poll this endpoint to see if payment was completed.
 *
 * @param {string} transactionId — The ATPid_xxx from initiateMobileCheckout
 */
async function checkTransactionStatus(transactionId) {
  if (!isPaymentsEnabled()) {
    throw new Error('AT_API_KEY and AT_USERNAME must be configured');
  }

  const url = baseURL() + '/query/transaction/find';
  const body = {
    username: AT_USERNAME,
    transactionId: transactionId
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apiKey': AT_API_KEY
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (res.ok || data.status === 'Success') {
    return {
      transactionId: data.transactionId,
      status: data.status,           // "Success", "Failed", "PendingConfirmation"
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
