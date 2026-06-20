module.exports = {
  apps: [
    {
      name: 'tiktok-vf-server',
      cwd: './apps/server',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 4000 },
      log_file: './logs/server.log',
      error_file: './logs/server-error.log',
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
    },
    {
      name: 'tiktok-vf-worker',
      cwd: './apps/server',
      script: 'dist/services/worker.js',
      instances: 1,
      env: { NODE_ENV: 'production' },
      log_file: './logs/worker.log',
      max_memory_restart: '500M',
      autorestart: true,
    },
  ],
};
