import { defineConfig } from 'vitest/config';

// Engine tests need neither a web server nor workflow-specific environment variables.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/engine/**/*.test.ts'],
  },
});
