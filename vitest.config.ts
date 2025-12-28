import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		testTimeout: 30000, // 30 seconds for emulator tests
		hookTimeout: 30000,
		// Use project-specific TypeScript config for tests
		typecheck: {
			tsconfig: './tests/tsconfig.json',
		},
	},
});

