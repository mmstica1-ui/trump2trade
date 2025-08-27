module.exports = {
  apps: [{
    name: 'trump2trade',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '250M', // Much lower memory limit 
    node_args: ['--expose-gc', '--max-old-space-size=200', '--optimize-for-size'], // Aggressive memory optimization
    interpreter_args: '--expose-gc --max-old-space-size=200 --optimize-for-size',
    env: {
      NODE_ENV: 'development',
      PORT: 8080,
      // Telegram
      TELEGRAM_BOT_TOKEN: '7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes',
      TELEGRAM_CHAT_ID: '540751833',
      TELEGRAM_GROUP_CHAT_ID: '',
      // Gemini (Google)
      GOOGLE_API_KEY: 'DEVELOPMENT_MOCK_MODE',
      GEMINI_MODEL: 'gemini-1.5-flash',
      // SYNOPTIC
      SYNOPTIC_API_KEY: '1f082681-21a2-6b80-bf48-2c16d80faa8e',
      // Webhooks
      APIFY_WEBHOOK_SECRET: 'moshe454',
      GENSPARK_WEBHOOK_SECRET: 'moshe454',
      // Safety
      DISABLE_TRADES: 'true',
      OPS_CHECK_EVERY_MS: '60000',
      // Poller
      POLL_ENABLED: 'false',
      POLL_INTERVAL_MS: '60000',
      TRUTH_PROFILE_URL: 'https://truthsocial.com/@realDonaldTrump'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080,
      // Telegram
      TELEGRAM_BOT_TOKEN: '7597128133:AAGtGl22gep4b3tfokrEPVOPgOcmdjSTLes',
      TELEGRAM_CHAT_ID: '540751833',
      TELEGRAM_GROUP_CHAT_ID: '',
      // Gemini (Google)
      GOOGLE_API_KEY: 'DEVELOPMENT_MOCK_MODE',
      GEMINI_MODEL: 'gemini-1.5-flash',
      // SYNOPTIC
      SYNOPTIC_API_KEY: '1f082681-21a2-6b80-bf48-2c16d80faa8e',
      // Webhooks
      APIFY_WEBHOOK_SECRET: 'moshe454',
      GENSPARK_WEBHOOK_SECRET: 'moshe454',
      // Safety
      DISABLE_TRADES: 'true',
      OPS_CHECK_EVERY_MS: '60000',
      // Poller
      POLL_ENABLED: 'false',
      POLL_INTERVAL_MS: '60000',
      TRUTH_PROFILE_URL: 'https://truthsocial.com/@realDonaldTrump'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};