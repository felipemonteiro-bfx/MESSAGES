/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração para Capacitor (gera export estático quando CAPACITOR=true)
  output: process.env.CAPACITOR === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.CAPACITOR === 'true', // Necessário para export estático
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'moaxyoqjedgrfnxeskku.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
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
  trailingSlash: process.env.CAPACITOR === 'true', // Melhor compatibilidade com Capacitor
  distDir: process.env.CAPACITOR === 'true' ? 'out' : '.next', // Diretório de saída (usado pelo Capacitor)
};

export default nextConfig;
