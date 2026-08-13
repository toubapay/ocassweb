const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces a minimal, self-contained server bundle -
  // the recommended shape for a Docker/Cloud Run image (see /Dockerfile).
  output: "standalone",
  experimental: {
    swcPlugins: [],
  },
  // The browser calls same-origin /api/*, proxied to the backend - see
  // middleware.js for the actual proxy (NOT here). next.config.js's
  // rewrites() looks like the natural place for this and used to live
  // here, but Next.js resolves rewrites() once at `next build` time and
  // freezes the result into .next/routes-manifest.json - confirmed by
  // inspecting that file after a build with no BACKEND_URL set: it
  // permanently bakes in the "http://localhost:5000" fallback. On a
  // platform where BACKEND_URL is only known/set as a runtime env var on
  // the deployed service (Render, Cloud Run) and isn't available during
  // the Docker build step, that fallback is what ships forever, no matter
  // what's set in the dashboard afterward - this bit us in production
  // (proxy silently pointed at localhost regardless of BACKEND_URL).
  // Middleware, unlike rewrites(), runs per-request and reads
  // process.env.BACKEND_URL fresh every time, which is what "runtime-
  // configurable" actually requires.
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
