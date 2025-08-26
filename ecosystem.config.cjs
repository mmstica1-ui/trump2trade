module.exports = {
  apps: [{
    name: 'trump2trade',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M', // Lower memory limit to force restarts
    node_args: ['--expose-gc', '--max-old-space-size=400'], // Lower memory limit for more aggressive GC
    interpreter_args: '--expose-gc --max-old-space-size=400',
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