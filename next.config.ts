import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', '@libsql/client'],
  transpilePackages: ['three'],
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
