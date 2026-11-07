import { test, expect } from '@playwright/test';

test.describe('TrustVault Enterprise Admin Portal E2E Tests', () => {
  test('Admin LoginPage renders security branding and governance controls', async ({ page }) => {
    await page.goto('http://localhost:5174/login');
    await expect(page.locator('h1')).toContainText('TrustVault Admin');
    await expect(page.locator('text=Security Officer & Governance Authentication')).toBeVisible();
    await expect(page.locator('text=Strict least-privilege administrative access')).toBeVisible();
    await expect(page.locator('text=Immutable cryptographic audit logging')).toBeVisible();
  });

  test('Admin UnauthorizedPage renders strict 403 state', async ({ page }) => {
    await page.goto('http://localhost:5174/unauthorized');
    await expect(page.locator('h1')).toContainText('Access Restricted (HTTP 403)');
    await expect(page.locator('text=Access to the TrustVault Admin Portal is strictly restricted')).toBeVisible();
  });

  test('Admin Direct URL Access Restrictions - Protected console routes enforce authentication', async ({ page }) => {
    // Attempt navigating directly to dashboard without auth
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForURL(/.*login.*/, { timeout: 15000 });
    expect(page.url()).toContain('login');

    // Attempt navigating directly to user management without auth
    await page.goto('http://localhost:5174/users');
    await page.waitForURL(/.*login.*/, { timeout: 15000 });
    expect(page.url()).toContain('login');
  });

  test('Admin Responsive Layout - Mobile viewport scales layout cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5174/login');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Strict least-privilege administrative access')).toBeVisible();
  });
});
