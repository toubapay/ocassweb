const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces a minimal, self-contained server bundle -
  // the recommended shape for a Docker/Cloud Run image (see /Dockerfile).
  output: "standalone",
  experimental: {
    swcPlugins: [],
  },
  // The browser calls same-origin /api/*, which the Next.js server proxies
  // to the backend. This avoids CORS and keeps the backend's real URL as a
  // server-only, runtime-configurable env var (BACKEND_URL) instead of a
  // NEXT_PUBLIC_ value baked into the client bundle at build time - the
  // backend's Cloud Run URL isn't known until after its own first deploy.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn, remove log, info, debug, etc.
    } : false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**', // allows all https domains
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**', // allows all https domains
        pathname: '/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;



// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   images: {
//     domains: [
//       "bjorn66.com",
//       "6ammart-test.6amdev.xyz",
//       "192.168.50.168",
//       "6ammart-dev.6amdev.xyz",
//     ], // Add the domain here
//   },
// };
//
// module.exports = nextConfig;
