/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@codeduel/shared', '@codeduel/ui'],
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
};

module.exports = nextConfig;
