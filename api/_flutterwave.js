// Flutterwave mobile money integration helper
// Uses the F4B v4 API — https://developer.flutterwave.com/v4.0/docs

const FLW_BASE = 'https://api.flutterwave.com';
const SANDBOX_BASE = 'https://developersandbox-api.flutterwave.com';

function isSandbox() {
  return (process.env.FLW_SECRET_KEY || '').startsWith('FLWSECK_TEST-');
}

function baseURL() {
  return isSandbox() ? SANDBOX_BASE : FLW_BASE;
}

function authHeader() {
  return 'Bearer ' + process.env.FLW_SECRET_KEY;
}

function generateReference() {
  return 'NL-' + Date.now().toString(36).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Map our provider names to Flutterwave network codes
function toFlwNetwork(provider) {
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

// Clean phone: strip "+260", leading zeros, spaces, dashes
function cleanPhone(raw) {
  return raw.replace(/^\+?260/, '').replace(/^0+/, '').replace(/[^0-9]/g, '');
}

// Step 1: Create a Flutterwave customer
async function createCustomer(name, email, phone) {
  const clean = cleanPhone(phone);
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || name;
  const lastName = parts.slice(1).join(' ') || firstName;

  const res = await fetch(baseURL() + '/customers', {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email || 'guest@nasserlodge.com',
      name: { first: firstName, last: lastName },
      phone: { country_code: '260', number: clean }
    })
  });

  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error('Flutterwave customer creation failed: ' + (data.message || JSON.stringify(data)));
  }
  return data.data.id; // customer_id
}

// Step 2: Create a mobile_money payment method
async function createPaymentMethod(network, phone) {
  const clean = cleanPhone(phone);

  const res = await fetch(baseURL() + '/payment-methods', {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'mobile_money',
      mobile_money: {
        country_code: '260',
        network: toFlwNetwork(network),
        phone_number: clean
      }
    })
  });

  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error('Flutterwave payment method creation failed: ' + (data.message || JSON.stringify(data)));
  }
  return data.data.id; // payment_method_id
}

// Step 3: Initiate the charge (pushes to customer's phone)
async function initiateCharge(customerId, paymentMethodId, amount, currency, reference, meta) {
  const res = await fetch(baseURL() + '/charges', {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currency: currency || 'ZMW',
      customer_id: customerId,
      payment_method_id: paymentMethodId,
      amount: amount,
      reference: reference,
      meta: meta || {}
    })
  });

  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error('Flutterwave charge failed: ' + (data.message || JSON.stringify(data)));
  }
  return data.data; // full charge object: { id, status, next_action, reference, ... }
}

// Step 4: Verify a charge (polling or after webhook)
async function verifyCharge(chargeId) {
  const res = await fetch(baseURL() + '/charges/' + chargeId, {
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  if (data.status !== 'success') {
    return null;
  }
  return data.data;
}

// Complete flow: create customer → payment method → charge
async function initiateMobileMoneyCharge({ name, phone, email, network, amount, currency, reference, meta }) {
  const ref = reference || generateReference();

  // Create customer
  const customerId = await createCustomer(name, email || ('guest+' + phone + '@nasserlodge.com'), phone);

  // Create payment method
  const paymentMethodId = await createPaymentMethod(network, phone);

  // Initiate charge
  const charge = await initiateCharge(customerId, paymentMethodId, amount, currency || 'ZMW', ref, meta);

  return {
    chargeId: charge.id,
    reference: ref,
    status: charge.status,       // typically "pending"
    nextAction: charge.next_action,
    processorResponse: charge.processor_response
  };
}

module.exports = {
  initiateMobileMoneyCharge,
  verifyCharge,
  toFlwNetwork,
  cleanPhone,
  generateReference,
  isSandbox
};
