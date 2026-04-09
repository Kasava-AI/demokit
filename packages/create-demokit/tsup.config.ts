import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  minify: true,
  target: 'node20',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  noExternal: ['@demokit-ai/core'],
})
