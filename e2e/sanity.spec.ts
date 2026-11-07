import { test, expect } from '@playwright/test';

test('Verify local system Chrome can launch in headless mode', async ({ page }) => {
  await page.setContent('<html><body><h1>TrustVault E2E System Chrome Launch Verified</h1></body></html>');
  const heading = page.locator('h1');
  await expect(heading).toHaveText('TrustVault E2E System Chrome Launch Verified');
});
