import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configuração para Capacitor (gera export estático quando CAPACITOR=true)
  output: process.env.CAPACITOR === 'true' ? 'export' : undefined,
  
  images: {
    unoptimized: process.env.CAPACITOR === 'true',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'moaxyoqjedgrfnxeskku.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  trailingSlash: process.env.CAPACITOR === 'true',
  distDir: process.env.CAPACITOR === 'true' ? 'out' : '.next',
  
  // Otimização de imports para tree-shaking
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  
  // Não sobrescrever webpack splitChunks — usar os defaults otimizados do Next.js
};

export default nextConfig;
