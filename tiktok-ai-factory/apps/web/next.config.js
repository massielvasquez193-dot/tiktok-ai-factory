/** @type {import('next').NextConfig} */
const path = require('path');

module.exports = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: 'http://localhost:4002/uploads/:path*' },
      { source: '/output/:path*', destination: 'http://localhost:4002/output/:path*' },
      { source: '/api/:path*', destination: 'http://localhost:4002/api/:path*' },
    ];
  },
};
