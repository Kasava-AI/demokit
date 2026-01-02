import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@demokit-ai/core',
    '@demokit-ai/ai',
    '@demokit-ai/intelligence',
    '@demokit-ai/db',
  ],
  webpack: (config) => {
    // Add aliases for internal packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@intelligence': path.resolve(__dirname, '../../packages/intelligence/src'),
      '@db': path.resolve(__dirname, '../../packages/db/src'),
    }
    return config
  },
}

export default nextConfig
