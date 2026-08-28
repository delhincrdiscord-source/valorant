/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // We rely on TypeScript + Zod rather than ESLint gating the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
