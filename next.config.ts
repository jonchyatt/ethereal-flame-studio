import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', '@libsql/client'],
  transpilePackages: ['three'],
  experimental: {
    middlewareClientMaxBodySize: Number(process.env.STORAGE_UPLOAD_MAX_BYTES) || 500 * 1024 * 1024,
  },
  async headers() {
    // Brand marks and store mockups keep their file names, so cache for a day and revalidate quietly.
    return [{
      source: '/brand/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
    }];
  },
  webpack: (config) => {
    // Add GLSL shader file support
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;
