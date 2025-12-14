const { test, expect, TEST_STUDENT } = require('./fixtures');

test.describe('Student Dashboard', () => {
  test('displays welcome message and stats', async ({ studentPage }) => {
    // Check for dashboard elements
    await expect(studentPage.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Check for total hours display
    await expect(studentPage.getByText(/total hours logged/i)).toBeVisible();
  });

  test('shows action cards for navigation', async ({ studentPage }) => {
    await expect(studentPage.getByRole('link', { name: /log hours/i })).toBeVisible();
    await expect(studentPage.getByRole('link', { name: /my hours/i })).toBeVisible();
    await expect(studentPage.getByRole('link', { name: /events/i })).toBeVisible();
    await expect(studentPage.getByRole('link', { name: /concessions/i })).toBeVisible();
  });

  test('navigates to log hours page', async ({ studentPage }) => {
    await studentPage.getByRole('link', { name: /log hours/i }).click();
    await expect(studentPage).toHaveURL(/.*log-hours/);
    await expect(studentPage.getByRole('heading', { name: /log hours/i })).toBeVisible();
  });

  test('navigates to view hours page', async ({ studentPage }) => {
    await studentPage.getByRole('link', { name: /my hours/i }).click();
    await expect(studentPage).toHaveURL(/.*view-hours/);
    await expect(studentPage.getByRole('heading', { name: /my hours/i })).toBeVisible();
  });

  test('navigates to events page', async ({ studentPage }) => {
    await studentPage.getByRole('link', { name: /events/i }).click();
    await expect(studentPage).toHaveURL(/.*events/);
    await expect(studentPage.getByRole('heading', { name: /events/i })).toBeVisible();
  });

  test('displays navbar with user info', async ({ studentPage }) => {
    // Navbar should show user name or dashboard link
    await expect(studentPage.getByRole('navigation')).toBeVisible();
  });

  test('logout returns to login page', async ({ studentPage }) => {
    // Find and click logout button
    await studentPage.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(studentPage).toHaveURL('/');
    await expect(studentPage.getByRole('heading', { name: /welcome to the/i })).toBeVisible();
  });
});
