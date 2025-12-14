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

  test('displays navbar with user info', async ({ studentPage }) => {
    await expect(studentPage.getByRole('navigation')).toBeVisible();
  });

  test('logout returns to login page', async ({ studentPage }) => {
    await studentPage.getByRole('button', { name: /logout/i }).click();
    await expect(studentPage).toHaveURL('/');
    await expect(studentPage.getByText('Welcome to the')).toBeVisible();
  });
});
