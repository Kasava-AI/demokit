import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'es2020',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
  external: [
    '@mastra/core',
    '@mastra/langfuse',
    '@ai-sdk/anthropic',
    '@supabase/supabase-js',
  ],
})
