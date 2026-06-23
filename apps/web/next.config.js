/** @type {import('next').NextConfig} */

// Docker Compose service name "server" resolves internally;
// override INTERNAL_API_URL for local dev (e.g. http://localhost:4000).
const internalApiUrl = process.env.INTERNAL_API_URL || 'http://server:4000';

module.exports = {
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: `${internalApiUrl}/uploads/:path*` },
      { source: '/output/:path*', destination: `${internalApiUrl}/output/:path*` },
      { source: '/api/:path*', destination: `${internalApiUrl}/api/:path*` },
    ];
  },
};
