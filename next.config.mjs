/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: 'http://91.98.116.217:9000/gainwave/:path*'
      }
    ];
  }
};
export default nextConfig;
