/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Next.js 14 uses experimental — NOT serverExternalPackages (that's v15 only)
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },

  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
};

export default nextConfig;