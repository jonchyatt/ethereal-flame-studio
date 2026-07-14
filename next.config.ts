import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', '@libsql/client'],
  transpilePackages: ['three'],
  experimental: {
    middlewareClientMaxBodySize: Number(process.env.STORAGE_UPLOAD_MAX_BYTES) || 500 * 1024 * 1024,
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
