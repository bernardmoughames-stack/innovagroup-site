import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works at the domain root or under a sub-path.
  base: './',
  build: {
    target: 'es2019',
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
});
