// Diagnostic endpoint for Africa's Talking + network connectivity
module.exports = async (req, res) => {
  const AT_API_KEY = process.env.AT_API_KEY || process.env.AFRICAS_TALKING_API_KEY || '';
  const AT_USERNAME = process.env.AT_USERNAME || process.env.AFRICAS_TALKING_USERNAME || '';
  const AT_PRODUCT_NAME = process.env.AT_PRODUCT_NAME || 'NasserLodgeDeposits';
  const AT_PROVIDER_CHANNEL = process.env.AT_PROVIDER_CHANNEL || '1212';

  const result = {
    config: {
      AT_API_KEY: AT_API_KEY ? `${AT_API_KEY.slice(0, 6)}...${AT_API_KEY.slice(-4)}` : '(empty)',
      AT_USERNAME: AT_USERNAME || '(empty)',
      AT_PRODUCT_NAME,
      AT_PROVIDER_CHANNEL,
      isSandbox: AT_USERNAME === 'sandbox' || (AT_API_KEY && AT_API_KEY.length < 30)
    },
    tests: {}
  };

  // Test 1: network connectivity to httpbin
  try {
    const hb = await fetch('https://httpbin.org/post', { method: 'POST', body: 'test' });
    result.tests.httpbin = { ok: hb.ok, status: hb.status };
  } catch (e) {
    result.tests.httpbin = { error: e.message };
  }

  // Test 2: AT sandbox
  const baseURL = AT_USERNAME === 'sandbox' ? 'https://payments.sandbox.africastalking.com' : 'https://payments.africastalking.com';
  try {
    const atRes = await fetch(baseURL + '/mobile/checkout/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apiKey': AT_API_KEY },
      body: JSON.stringify({ username: AT_USERNAME, productName: AT_PRODUCT_NAME, providerChannel: AT_PROVIDER_CHANNEL, phoneNumber: '+260978176195', currencyCode: 'ZMW', amount: 100 })
    });
    const data = await atRes.json();
    result.tests.africastalking = { ok: atRes.ok, status: atRes.status, body: data };
  } catch (e) {
    result.tests.africastalking = { error: e.message, cause: e.cause ? e.cause.message : null };
  }

  // Test 3: plain DNS resolution
  const dns = require('dns').promises;
  try {
    const addr = await dns.resolve4('payments.sandbox.africastalking.com');
    result.tests.dns = { addresses: addr };
  } catch (e) {
    result.tests.dns = { error: e.message };
  }

  res.json(result);
};
