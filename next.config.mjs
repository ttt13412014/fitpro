/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.exercisedb.io' },
      { protocol: 'https', hostname: 'v2.exercisedb.io' },
    ],
  },
};

export default nextConfig;
