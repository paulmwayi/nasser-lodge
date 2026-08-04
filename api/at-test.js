// Diagnostic endpoint for Africa's Talking integration
module.exports = async (req, res) => {
  const AT_API_KEY = process.env.AT_API_KEY || process.env.AFRICAS_TALKING_API_KEY || '';
  const AT_USERNAME = process.env.AT_USERNAME || process.env.AFRICAS_TALKING_USERNAME || '';
  const AT_PRODUCT_NAME = process.env.AT_PRODUCT_NAME || 'NasserLodgeDeposits';
  const AT_PROVIDER_CHANNEL = process.env.AT_PROVIDER_CHANNEL || '1212';

  const hasAPIKey = AT_API_KEY.length > 0;
  const hasUsername = AT_USERNAME.length > 0;
  const isSandbox = AT_USERNAME === 'sandbox' || (AT_API_KEY && AT_API_KEY.length < 30);

  const baseURL = isSandbox
    ? 'https://payments.sandbox.africastalking.com'
    : 'https://payments.africastalking.com';

  const result = {
    config: {
      AT_API_KEY: AT_API_KEY ? `${AT_API_KEY.slice(0, 6)}...${AT_API_KEY.slice(-4)}` : '(empty)',
      AT_USERNAME: AT_USERNAME || '(empty)',
      AT_PRODUCT_NAME,
      AT_PROVIDER_CHANNEL,
      isSandbox,
      baseURL
    }
  };

  // Test the actual API call
  if (req.method === 'POST' && hasAPIKey && hasUsername) {
    const { phone, amount, provider } = req.body;
    const phone_cleaned = '+260' + (phone || '978176195').replace(/[^0-9]/g, '').replace(/^0+/, '').replace(/^260/, '');

    const body = {
      username: AT_USERNAME,
      productName: AT_PRODUCT_NAME,
      providerChannel: AT_PROVIDER_CHANNEL,
      phoneNumber: phone_cleaned,
      currencyCode: 'ZMW',
      amount: Math.round(amount || 100),
      metadata: { test: true }
    };

    try {
      const atRes = await fetch(baseURL + '/mobile/checkout/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': AT_API_KEY
        },
        body: JSON.stringify(body)
      });

      const data = await atRes.json();
      result.apiCall = {
        statusCode: atRes.status,
        payload: body,
        response: data
      };
    } catch (err) {
      result.apiCall = {
        error: err.message,
        payload: body
      };
    }
  }

  res.json(result);
};
