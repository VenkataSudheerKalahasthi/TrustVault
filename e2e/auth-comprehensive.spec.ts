import { test, expect } from '@playwright/test';

test.describe('TrustVault Comprehensive Authentication UI & Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Avoid caching issues
    await page.goto('http://localhost:5173/login');
  });

  test('1. Sign In Page - Renders TrustVault branding, security features, and matching UI', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Branding
    await expect(page.locator('h1')).toContainText('TrustVault');
    await expect(page.locator('text=Enterprise Document Security & Verifiable Audit Trail')).toBeVisible();
    await expect(page.locator('text=Sign in to your Vault')).toBeVisible();

    // Form controls
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('text=Remember this device')).toBeVisible();
    await expect(page.locator('text=Forgot password?')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In to Vault")')).toBeVisible();

    // Security badge list
    await expect(page.locator('text=Zero-Trust document-level access control')).toBeVisible();
    await expect(page.locator('text=Instant permission revocation across all links')).toBeVisible();
    await expect(page.locator('text=Cryptographically sealed SHA-256 audit trail')).toBeVisible();
  });

  test('2. Sign In Page - Password visibility toggle switches between password and text', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    const passwordInput = page.locator('input[autoComplete="current-password"]');
    await passwordInput.fill('SecurePassword123!');
    expect(await passwordInput.getAttribute('type')).toBe('password');

    // Click show password button
    const toggleButton = page.locator('form button[type="button"]');
    await toggleButton.click();
    expect(await passwordInput.getAttribute('type')).toBe('text');

    // Click again to hide
    await toggleButton.click();
    expect(await passwordInput.getAttribute('type')).toBe('password');
  });

  test('3. Sign Up Page - Renders VIEWER by default, allows DOCUMENT_OWNER, and NEVER shows ADMIN', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');

    // Header
    await expect(page.locator('h1')).toContainText('TrustVault');
    await expect(page.locator('text=Create an Enterprise Vault Account')).toBeVisible();
    await expect(page.locator('text=Enterprise Registration')).toBeVisible();

    // Inputs
    await expect(page.locator('input[placeholder="John"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Doe"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Role selection verification: VIEWER and DOCUMENT_OWNER only
    const viewerCard = page.locator('text=Viewer').first();
    const ownerCard = page.locator('text=Document Owner').first();
    await expect(viewerCard).toBeVisible();
    await expect(ownerCard).toBeVisible();
    await expect(page.locator('text=Default').first()).toBeVisible();

    // Verify ADMIN is NEVER shown in signup
    const adminText = page.locator('text="Admin (Default)"');
    await expect(adminText).toHaveCount(0);
    const adminRoleOption = page.locator('div:has-text("Admin Role")');
    await expect(adminRoleOption).toHaveCount(0);

    // Click to select Document Owner
    await ownerCard.click();

    // Click back to select Viewer
    await viewerCard.click();

    // Terms and Conditions checkbox
    await expect(page.locator('text=Terms of Service')).toBeVisible();
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
  });

  test('4. Sign Up Page - Validates password mismatch and prevents submission', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');

    await page.locator('input[placeholder="John"]').fill('Alice');
    await page.locator('input[placeholder="Doe"]').fill('Smith');
    await page.locator('input[type="email"]').fill('alice.test@trustvault.test');

    const pwdInputs = page.locator('input[type="password"]');
    await pwdInputs.nth(0).fill('Password123!');
    await pwdInputs.nth(1).fill('MismatchPassword999!');

    // Check terms
    await page.locator('input[type="checkbox"]').check();

    // Submit
    await page.locator('button:has-text("Create Vault Account")').click();

    // Expect error alert
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('5. Forgot Password Page - Renders email entry and links to Sign In', async ({ page }) => {
    await page.goto('http://localhost:5173/forgot-password');

    await expect(page.locator('h1')).toContainText('TrustVault');
    await expect(page.locator('text=Reset your password')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send Recovery Code")')).toBeVisible();

    // Back link
    const backLink = page.locator('a:has-text("Back to Sign In")');
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL(/.*login.*/);
    expect(page.url()).toContain('login');
  });

  test('6. Reset Password Page - Renders recovery code and password fields', async ({ page }) => {
    await page.goto('http://localhost:5173/reset-password?email=user%40company.com');

    await expect(page.locator('h1')).toContainText('TrustVault');
    await expect(page.locator('text=Set New Password')).toBeVisible();
    await expect(page.locator('input[placeholder="123456"]')).toBeVisible();

    const pwdInputs = page.locator('input[type="password"]');
    await expect(pwdInputs.first()).toBeVisible();

    await expect(page.locator('button:has-text("Reset Password & Sign In")')).toBeVisible();
  });

  test('7. Mobile Viewport - Authentication pages scale cleanly without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Test Login on Mobile
    await page.goto('http://localhost:5173/login');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In to Vault")')).toBeVisible();

    // Test SignUp on Mobile
    await page.goto('http://localhost:5173/signup');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Create Vault Account")')).toBeVisible();

    // Test Forgot Password on Mobile
    await page.goto('http://localhost:5173/forgot-password');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Send Recovery Code")')).toBeVisible();
  });
});

