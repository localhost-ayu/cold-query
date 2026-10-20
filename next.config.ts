import type { NextConfig } from 'next';

// Vazio na raiz de um domínio (Vercel, subdomínio). Para servir em subpasta,
// como no GitHub Pages, defina NEXT_PUBLIC_BASE_PATH=/cold-query no build.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
