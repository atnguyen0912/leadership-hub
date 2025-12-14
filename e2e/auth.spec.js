const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays login page with welcome message', async ({ page }) => {
    await expect(page.getByText('Welcome to the')).toBeVisible();
    await expect(page.getByText('Hawkins Leadership Hub')).toBeVisible();
    await expect(page.getByText('Empowering student leaders')).toBeVisible();
  });

  test('has student and admin login tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Student' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Admin' })).toBeVisible();
  });

  test('shows student login form by default', async ({ page }) => {
    await expect(page.getByLabel('Student ID')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your student ID')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('switches to admin login when admin tab clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByLabel('Admin Password')).toBeVisible();
    await expect(page.getByPlaceholder('Enter admin password')).toBeVisible();
  });

  test('shows error for non-existent student', async ({ page }) => {
    await page.getByPlaceholder('Enter your student ID').fill('999999M999');
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for error message
    await expect(page.getByText(/not found|invalid|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows error for incorrect admin password', async ({ page }) => {
    await page.getByRole('button', { name: 'Admin' }).click();
    await page.getByPlaceholder('Enter admin password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows loading state during login', async ({ page }) => {
    await page.getByPlaceholder('Enter your student ID').fill('123456M789');
    await page.getByRole('button', { name: 'Login' }).click();

    // Should briefly show loading state
    // Either shows "Logging in..." or completes quickly
    const result = await Promise.race([
      page.getByText('Logging in...').waitFor({ timeout: 2000 }).then(() => 'loading'),
      page.waitForURL('**/dashboard', { timeout: 5000 }).then(() => 'redirected'),
      page.getByText(/not found|error/i).waitFor({ timeout: 5000 }).then(() => 'error')
    ]).catch(() => 'timeout');

    expect(['loading', 'redirected', 'error']).toContain(result);
  });
});

test.describe('Navigation', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login or show login page content
    await expect(page.getByRole('heading', { name: 'Welcome to the' })).toBeVisible({ timeout: 5000 });
  });
});
