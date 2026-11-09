import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, 'packages/database/.env') });
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 45000,
  use: {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        channel: 'chrome',
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
