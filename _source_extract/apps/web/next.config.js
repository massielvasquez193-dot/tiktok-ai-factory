/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: 'http://localhost:4002/uploads/:path*' },
      { source: '/output/:path*', destination: 'http://localhost:4002/output/:path*' },
      { source: '/api/:path*', destination: 'http://localhost:4002/api/:path*' },
    ];
  },
};
