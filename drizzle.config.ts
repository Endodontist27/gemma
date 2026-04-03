import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/infrastructure/database/schema/index.ts',
  dialect: 'sqlite',
  driver: 'expo',
});
