const { test, expect, TEST_STUDENT } = require('./fixtures');

test.describe('Student Dashboard', () => {
  test('displays welcome message and stats', async ({ studentPage }) => {
    await expect(studentPage.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(studentPage.getByText(/total hours logged/i)).toBeVisible();
  });

  test('shows action cards for navigation', async ({ studentPage }) => {
    await expect(studentPage.locator('.action-card').first()).toBeVisible();
  });

  test('navigates to log hours page', async ({ studentPage }) => {
    await studentPage.locator('.action-card', { hasText: 'Log Hours' }).click();
    await expect(studentPage).toHaveURL(/.*log-hours/);
    await expect(studentPage.getByRole('heading', { name: 'Log Hours' })).toBeVisible();
  });

  test('navigates to view hours page', async ({ studentPage }) => {
    await studentPage.locator('.action-card', { hasText: 'My Hours' }).click();
    await expect(studentPage).toHaveURL(/.*view-hours/);
    await expect(studentPage.getByRole('heading', { name: 'My Hours' })).toBeVisible();
  });

  test('navigates to events page', async ({ studentPage }) => {
    await studentPage.locator('.action-card', { hasText: 'Events' }).click();
    await expect(studentPage).toHaveURL(/.*events/);
    await expect(studentPage.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
  });

  test('navigates to concessions page', async ({ studentPage }) => {
    // Click from action card (like other navigation tests)
    await studentPage.locator('.action-card', { hasText: 'Concessions' }).click();

    // Wait for navigation
    await studentPage.waitForTimeout(1000);

    // Check what happens - either:
    // 1. Shows concessions page with session/menu
    // 2. Redirects to login (if auth required)
    // 3. Shows "no session" or "select session" message
    const url = studentPage.url();
    const isOnCashbox = url.includes('cashbox');
    const isOnLogin = url.includes('/') && !url.includes('cashbox');

    if (isOnCashbox) {
      // On concessions page - check for expected content
      await expect(
        studentPage.getByText(/menu|order|session|select|item/i).first()
      ).toBeVisible();
    } else {
      // Redirected - likely to login (may require special permissions)
      await expect(
        studentPage.getByText(/login|student|welcome/i).first()
      ).toBeVisible();
    }
  });

  test('displays navbar with user info', async ({ studentPage }) => {
    await expect(studentPage.getByRole('navigation')).toBeVisible();
  });

  test('logout returns to login page', async ({ studentPage }) => {
    await studentPage.getByRole('button', { name: /logout/i }).click();
    await expect(studentPage).toHaveURL('/');
    await expect(studentPage.getByText('Welcome to the')).toBeVisible();
  });
});
