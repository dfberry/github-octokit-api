import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/vitest.setup.ts'], // adjust path if needed
  },
});