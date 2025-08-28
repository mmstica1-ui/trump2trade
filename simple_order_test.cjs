// Simple direct order test
const axios = require('axios');

async function testDirectOrder() {
  console.log('🧪 Testing direct NVDA order placement...');
  
  const baseUrl = 'https://8000-igsze8jx1po9nx2jjg1ut.e2b.dev';
  const accountId = 'DUA065113';
  
  const orderData = {
    orders: [{
      symbol: 'NVDA',
      side: 'BUY', 
      orderType: 'MKT',
      quantity: 1,
      secType: 'OPT',
      strike: 140,
      right: 'C',
      expiry: '20241220'
    }]
  };
  
  try {
    console.log(`📡 Sending to: ${baseUrl}/v1/api/iserver/account/${accountId}/orders`);
    console.log(`📝 Order data:`, JSON.stringify(orderData, null, 2));
    
    const response = await axios.post(
      `${baseUrl}/v1/api/iserver/account/${accountId}/orders`,
      orderData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    console.log('✅ Order placed successfully!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Order failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    throw error;
  }
}

testDirectOrder();