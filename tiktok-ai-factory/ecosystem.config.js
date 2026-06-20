// ============================================================
// TikTok AI Factory — PM2 Process Manager Configuration
// ============================================================
// Usage:
//   pm2 start ecosystem.config.js           # Start all
//   pm2 status                              # View status
//   pm2 logs                                # View logs
//   pm2 reload ecosystem.config.js          # Zero-downtime reload
//   pm2 save                                # Save for resurrection
//   pm2 startup                             # Auto-start on boot
// ============================================================

module.exports = {
  apps: [
    // ─── API Server ───────────────────────────────────
    {
      name: 'tiktok-vf-server',
      cwd: './apps/server',
      script: 'dist/index.js',
      instances: process.env.SERVER_INSTANCES || 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        NODE_OPTIONS: '--max-old-space-size=2048',
      },
      // Logging
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_file: './logs/server-out.log',
      error_file: './logs/server-err.log',
      merge_logs: true,
      // Process management
      max_memory_restart: '2G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 10000,
      listen_timeout: 15000,
      // Health
      wait_ready: true,
      shutdown_with_message: true,
      // Watch (disabled in prod)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'uploads', 'output'],
    },

    // ─── BullMQ Worker ────────────────────────────────
    {
      name: 'tiktok-vf-worker',
      cwd: './apps/server',
      script: 'dist/services/worker.js',
      instances: process.env.WORKER_INSTANCES || 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=1024',
      },
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_file: './logs/worker-out.log',
      error_file: './logs/worker-err.log',
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      kill_timeout: 30000,           // Allow time for in-flight jobs
      watch: false,
    },

    // ─── Automation Scheduler ─────────────────────────
    {
      name: 'tiktok-vf-scheduler',
      cwd: './apps/server',
      script: 'dist/routes/automationTasks.js',
      args: '--scheduler-only',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      log_file: './logs/scheduler-out.log',
      error_file: './logs/scheduler-err.log',
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
    },
  ],

  // ─── Deployment (CI/CD via ssh) ─────────────────────
  deploy: {
    production: {
      user: 'deploy',
      host: process.env.DEPLOY_HOST || 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/tiktok-ai-factory.git',
      path: '/opt/tiktok-vf',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    },
  },
};
