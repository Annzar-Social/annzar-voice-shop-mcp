import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    // Each test file runs in isolation — required for integration test
    // which sets process.env before importing the server module.
    pool:        'forks',
    include:     ['src/tests/**/*.test.ts'],
  },
})
