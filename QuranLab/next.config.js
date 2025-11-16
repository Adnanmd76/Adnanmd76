/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['sqlite3', 'better-sqlite3'],
  },
  
  // API configuration for file uploads and audio processing
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increased for audio file uploads
    },
    responseLimit: '50mb',
  },
  
  // Headers for CORS and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Webpack configuration for handling audio files and SQLite
  webpack: (config, { isServer }) => {
    // Handle audio files
    config.module.rules.push({
      test: /\.(mp3|wav|ogg|m4a)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/audio/',
          outputPath: 'static/audio/',
        },
      },
    });
    
    // Handle SQLite for server-side
    if (isServer) {
      config.externals.push('sqlite3', 'better-sqlite3');
    }
    
    return config;
  },
  
  // Environment variables
  env: {
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
    DATABASE_PATH: process.env.DATABASE_PATH || './data/quran_abjad.db',
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Output configuration for deployment
  output: 'standalone',
  
  // Compression
  compress: true,
  
  // Power by header removal for security
  poweredByHeader: false,
  
  // Generate build ID
  generateBuildId: async () => {
    return 'quranlab-' + Date.now();
  },
};

module.exports = nextConfig;