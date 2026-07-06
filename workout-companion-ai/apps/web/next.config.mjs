/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permette a Next.js di compilare il pacchetto condiviso del monorepo
  transpilePackages: ['@wc/shared'],
};

export default nextConfig;
