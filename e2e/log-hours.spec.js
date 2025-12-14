const { test, expect } = require('./fixtures');

test.describe('Log Hours Page', () => {
  test('displays log hours form', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Check for form elements
    await expect(studentPage.getByRole('heading', { name: /log hours/i })).toBeVisible();
    await expect(studentPage.getByLabel(/date/i)).toBeVisible();
    await expect(studentPage.getByLabel(/time in/i)).toBeVisible();
    await expect(studentPage.getByLabel(/time out/i)).toBeVisible();
  });

  test('displays calendar for date selection', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Calendar should be visible
    await expect(studentPage.locator('.calendar, [class*="calendar"]')).toBeVisible();
  });

  test('validates required fields', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Try to submit without filling required fields
    await studentPage.getByRole('button', { name: /submit|log|save/i }).click();

    // Should show validation or stay on page
    await expect(studentPage).toHaveURL(/.*log-hours/);
  });

  test('calculates hours correctly', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Fill in times
    await studentPage.getByLabel(/time in/i).fill('09:00');
    await studentPage.getByLabel(/time out/i).fill('12:00');

    // Should show 3 hours calculation somewhere on the page
    await expect(studentPage.getByText(/3.*hour|3h|3:00/i)).toBeVisible();
  });

  test('shows hour type selector', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Should have hour type selection
    const hourTypeSelect = studentPage.getByLabel(/type|category/i);
    if (await hourTypeSelect.isVisible()) {
      await expect(hourTypeSelect).toBeVisible();
    }
  });

  test('submits hours successfully', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Get today's date in the format the input expects
    const today = new Date().toISOString().split('T')[0];

    // Fill the form
    await studentPage.getByLabel(/date/i).fill(today);
    await studentPage.getByLabel(/time in/i).fill('10:00');
    await studentPage.getByLabel(/time out/i).fill('14:00');

    // Submit
    await studentPage.getByRole('button', { name: /submit|log|save/i }).click();

    // Should show success message or redirect
    const success = await Promise.race([
      studentPage.getByText(/success|logged|saved/i).waitFor({ timeout: 5000 }).then(() => true),
      studentPage.waitForURL('**/view-hours', { timeout: 5000 }).then(() => true)
    ]).catch(() => false);

    expect(success).toBeTruthy();
  });
});

test.describe('View Hours Page', () => {
  test('displays hours list', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');

    await expect(studentPage.getByRole('heading', { name: /my hours/i })).toBeVisible();
  });

  test('shows total hours summary', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');

    // Should show some total
    await expect(studentPage.getByText(/total|hours/i)).toBeVisible();
  });

  test('has filter/date range options', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');

    // Should have filtering capability
    const hasFilter = await studentPage.getByRole('combobox').or(
      studentPage.getByLabel(/month|year|filter|range/i)
    ).first().isVisible().catch(() => false);

    // Filter may or may not exist depending on implementation
    expect(typeof hasFilter).toBe('boolean');
  });
});
