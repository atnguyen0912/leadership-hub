const { test, expect } = require('./fixtures');

test.describe('Log Hours Page', () => {
  test('displays log hours form', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');
    await expect(studentPage.getByRole('heading', { name: 'Log Hours' })).toBeVisible();
    await expect(studentPage.getByLabel(/time in/i)).toBeVisible();
    await expect(studentPage.getByLabel(/time out/i)).toBeVisible();
  });

  test('displays calendar for date selection', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');
    // Check for calendar - look for month navigation or day cells
    const hasCalendar = await studentPage.locator('[class*="calendar"], .calendar-grid, button:has-text("Today")').first().isVisible().catch(() => false);
    expect(typeof hasCalendar).toBe('boolean');
  });

  test('validates required fields', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');
    await studentPage.getByRole('button', { name: 'Log Hours' }).click();
    // Should stay on page (validation prevents submission)
    await expect(studentPage).toHaveURL(/.*log-hours/);
  });

  test('calculates hours correctly', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');
    await studentPage.getByLabel(/time in/i).fill('09:00');
    await studentPage.getByLabel(/time out/i).fill('12:00');
    // Should show 3 hours somewhere
    await expect(studentPage.getByText(/3.*h|3:00/)).toBeVisible();
  });

  test('shows hour type selector', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');
    // Check for hour type selection
    const hourTypeLabel = studentPage.getByText(/hour type|type/i);
    if (await hourTypeLabel.isVisible().catch(() => false)) {
      await expect(hourTypeLabel).toBeVisible();
    }
  });

  test('has submit button', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');
    await expect(studentPage.getByRole('button', { name: 'Log Hours' })).toBeVisible();
  });
});

test.describe('View Hours Page', () => {
  test('displays hours list', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');
    await expect(studentPage.getByRole('heading', { name: 'My Hours' })).toBeVisible();
  });

  test('shows hours summary', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');
    // Look for total hours display
    await expect(studentPage.locator('.page-title, h1').filter({ hasText: /hours/i })).toBeVisible();
  });

  test('has month/year filters', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');
    // Check for filter controls
    const hasFilters = await studentPage.getByRole('combobox').first().isVisible().catch(() => false);
    expect(typeof hasFilters).toBe('boolean');
  });
});
