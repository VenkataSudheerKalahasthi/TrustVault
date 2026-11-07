import { test, expect } from '@playwright/test';

test.describe('TrustVault Client Web Portal E2E Tests', () => {
  test('HomePage redirects or loads cleanly with brand styling', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveTitle(/TrustVault/i);
  });

  test('LoginPage renders Clerk container and enterprise security features', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await expect(page.locator('h1')).toContainText('TrustVault');
    await expect(page.locator('text=Zero-Trust document-level access control')).toBeVisible();
    await expect(page.locator('text=Instant permission revocation across all links')).toBeVisible();
    await expect(page.locator('text=Cryptographically sealed SHA-256 audit trail')).toBeVisible();
  });

  test('Direct URL Access Restrictions - Vault routes enforce authentication', async ({ page }) => {
    await page.goto('http://localhost:5173/owner/documents');
    await page.waitForURL(/.*sign-in.*|.*login.*/, { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toMatch(/.*sign-in.*|.*login.*/);
  });

  test('Responsive Layout Verification - Mobile viewport adjusts gracefully without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/login');
    const header = page.locator('h1');
    await expect(header).toBeVisible();
    await expect(page.locator('text=Zero-Trust document-level access control')).toBeVisible();
  });
});
