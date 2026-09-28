import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const r = (p: string) => resolve(__dirname, p);

export default defineConfig({
  // Relative base so the build works at the domain root or under a sub-path.
  base: './',
  build: {
    target: 'es2019',
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: {
        main: r('index.html'),
        contracting: r('contracting.html'),
        'project-management': r('project-management.html'),
        'facility-management': r('facility-management.html'),
        cinema: r('cinema.html'),
        snagging: r('snagging.html'),
        marketing: r('marketing.html'),
        consultancy: r('consultancy.html'),
        ai: r('ai.html'),
        'home-watch': r('home-watch.html'),
      },
    },
  },
});
