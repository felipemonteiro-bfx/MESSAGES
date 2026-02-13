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
  
  // Sugestão 28: Otimização de bundle e code splitting
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // Webpack config para code splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Otimizar chunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk separado
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Chunk para componentes pesados
            components: {
              name: 'components',
              chunks: 'all',
              test: /[\\/]src[\\/]components[\\/]/,
              priority: 10,
              minChunks: 2,
            },
            // Chunk para libs grandes
            framerMotion: {
              name: 'framer-motion',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              chunks: 'all',
              priority: 30,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
