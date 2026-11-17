import { defineConfig } from 'vitest/config';
import source from '../../vitest.config.ts';

export default defineConfig({ ...source, test: { ...source.test,
  include: ['test/ci21-runtime/**/*.test.ts'], exclude: ['**/node_modules/**'], passWithNoTests: false,
} });
