import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@demokit-ai/core',
    '@demokit-ai/ai',
    '@demokit-ai/intelligence',
    '@demokit-ai/db',
  ],
  turbopack: {
    resolveAlias: {
      '@intelligence': './../../packages/intelligence/src',
      '@db': './../../packages/db/src',
    },
  },
}

export default nextConfig
