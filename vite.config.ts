import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: el build funciona servido desde cualquier subcarpeta.
  base: './',
  build: {
    // Three.js (~580 kB) va en un fragmento aparte que solo se descarga si hay WebGL y vista 3D.
    chunkSizeWarningLimit: 650,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
