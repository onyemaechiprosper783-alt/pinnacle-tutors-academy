/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/apply', destination: '/apply-fixed' }];
  },
};
export default nextConfig;
