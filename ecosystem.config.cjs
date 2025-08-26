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
      PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};