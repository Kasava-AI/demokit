import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', '@trpc/client', '@trpc/server', '@trpc/react-query', '@demokit-ai/core', '@demokit-ai/react'],
})
