import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // funciona em qualquer subcaminho, como usuario.github.io/timemind/
  plugins: [react()],
  test: { environment: 'node', exclude: ['node_modules', 'dist', '_antigo'] },
})
