/** @type {import('next').NextConfig} */
const isStatic = process.env.BUILD_STATIC === 'true';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // GitHub Pages 정적 배포 시 output: 'export' 사용
  ...(isStatic && {
    output: 'export',
    basePath: basePath,
    assetPrefix: basePath,
  }),
  // Enable JSON imports
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;
