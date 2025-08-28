const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/v1/api/iserver/auth/status', (req, res) => {
  console.log('✅ Auth status check');
  res.json({
    authenticated: true,
    connected: true,
    competing: false,
    message: 'Connected to IBKR paper trading',
    MAC: '00:11:22:33:44:55'
  });
});

app.get('/v1/api/portfolio/DU7428350/summary', (req, res) => {
  console.log('💰 Balance request');
  res.json({
    total: { amount: 99000, currency: 'USD' },
    netLiquidation: 99000,
    totalCash: 99000,
    buyingPower: 396000
  });
});

app.get('/v1/api/portfolio/DU7428350/positions/0', (req, res) => {
  console.log('📊 Positions request');
  res.json([]);
});

app.post('/v1/api/iserver/secdef/search', (req, res) => {
  console.log('🔍 Security search:', req.body?.symbol);
  const { symbol } = req.body || {};
  const contracts = {
    'AAPL': { conid: 265598, symbol: 'AAPL' },
    'TSLA': { conid: 76792991, symbol: 'TSLA' }
  };
  res.json(contracts[symbol] ? [contracts[symbol]] : []);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    ibkr_connected: true,
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(5555, '0.0.0.0', () => {
  console.log('🏦 Quick IBKR Mock Server running on port 5555');
});

process.on('SIGINT', () => {
  console.log('Server shutting down...');
  server.close();
  process.exit(0);
});