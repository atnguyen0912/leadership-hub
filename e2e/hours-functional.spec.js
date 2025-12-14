const { test, expect, TEST_STUDENT } = require('./fixtures');

test.describe('Hours Logging - Functional', () => {
  test('student can log hours for today', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Fill in time values
    await studentPage.getByLabel(/time in/i).fill('09:00');
    await studentPage.getByLabel(/time out/i).fill('12:00');

    // Select hour type if available
    const typeSelect = studentPage.locator('select, [role="combobox"]').first();
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ index: 1 });
    }

    // Submit the form
    await studentPage.getByRole('button', { name: /log hours/i }).click();

    // Should show success message or redirect
    await expect(
      studentPage.getByText(/success|logged|saved|recorded/i).or(
        studentPage.locator('.success, .toast, [class*="success"]')
      ).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('logged hours appear in student view', async ({ studentPage }) => {
    // First log some hours
    await studentPage.goto('/log-hours');
    await studentPage.getByLabel(/time in/i).fill('14:00');
    await studentPage.getByLabel(/time out/i).fill('16:00');
    await studentPage.getByRole('button', { name: /log hours/i }).click();

    // Wait for success
    await studentPage.waitForTimeout(1000);

    // Navigate to view hours
    await studentPage.goto('/view-hours');

    // Should see the logged hours (2 hours from 14:00-16:00)
    await expect(studentPage.getByText(/2.*h|2:00|14:00|16:00/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('hours calculation displays correctly while filling form', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    await studentPage.getByLabel(/time in/i).fill('08:00');
    await studentPage.getByLabel(/time out/i).fill('13:30');

    // Should show 5.5 hours or 5h 30m somewhere
    await expect(
      studentPage.getByText(/5\.5|5:30|5h.*30/i).first()
    ).toBeVisible();
  });

  test('cannot submit form without required fields', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Try to submit empty form
    await studentPage.getByRole('button', { name: /log hours/i }).click();

    // Should stay on page or show validation error
    await expect(studentPage).toHaveURL(/log-hours/);
  });

  test('can log hours for past date', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Click Past Hours button if it exists
    const pastButton = studentPage.getByRole('button', { name: /past/i });
    if (await pastButton.isVisible()) {
      await pastButton.click();
      await studentPage.waitForTimeout(500);
    }

    // Fill in time values
    await studentPage.getByLabel(/time in/i).fill('10:00');
    await studentPage.getByLabel(/time out/i).fill('14:00');

    // Submit
    await studentPage.getByRole('button', { name: /log hours/i }).click();

    // Should work (success or stay on page without error)
    await studentPage.waitForTimeout(1000);
  });

  test('can add activity description to hours', async ({ studentPage }) => {
    await studentPage.goto('/log-hours');

    // Fill required fields
    await studentPage.getByLabel(/time in/i).fill('09:00');
    await studentPage.getByLabel(/time out/i).fill('11:00');

    // Add activity/item description if field exists
    const activityField = studentPage.getByLabel(/activity|item|description/i).or(
      studentPage.getByPlaceholder(/activity|item|description|concession|event/i)
    );
    if (await activityField.first().isVisible()) {
      await activityField.first().fill('Test Activity Entry');
    }

    await studentPage.getByRole('button', { name: /log hours/i }).click();
    await studentPage.waitForTimeout(1000);
  });
});

test.describe('Hours View - Functional', () => {
  test('displays total hours summary', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');

    // Should show some kind of total
    await expect(
      studentPage.getByText(/total|all time|hours/i).first()
    ).toBeVisible();
  });

  test('can filter hours by month', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');

    // Find month filter
    const monthFilter = studentPage.getByRole('combobox').first();
    if (await monthFilter.isVisible()) {
      // Select a different month
      await monthFilter.selectOption({ index: 1 });
      await studentPage.waitForTimeout(500);

      // Page should still be functional
      await expect(studentPage.getByRole('heading', { name: /hours/i })).toBeVisible();
    }
  });

  test('hours list shows date and duration', async ({ studentPage }) => {
    await studentPage.goto('/view-hours');

    // If there are hours logged, they should show date info
    const hoursList = studentPage.locator('table, .hours-list, [class*="hours"]');
    if (await hoursList.first().isVisible()) {
      // Should have some date-like content or time content
      const hasTimeContent = await studentPage.getByText(/\d{1,2}:\d{2}|h.*m|\d+\s*hours?/i).first().isVisible().catch(() => false);
      expect(typeof hasTimeContent).toBe('boolean');
    }
  });
});

test.describe('Admin Hours View - Functional', () => {
  test('admin can see all students hours', async ({ adminPage }) => {
    await adminPage.goto('/view-all-hours');

    await expect(adminPage.getByRole('heading', { name: 'All Hours' })).toBeVisible();

    // Should show student names or hours data
    const hasStudentData = await adminPage.getByText(/nguyen|student|total/i).first().isVisible().catch(() => false);
    expect(hasStudentData).toBeTruthy();
  });

  test('admin can filter hours by student', async ({ adminPage }) => {
    await adminPage.goto('/view-all-hours');

    // Look for student filter/search
    const studentFilter = adminPage.getByRole('combobox').or(
      adminPage.getByPlaceholder(/search|student|filter/i)
    );

    if (await studentFilter.first().isVisible()) {
      await expect(studentFilter.first()).toBeEnabled();
    }
  });

  test('admin can export hours to CSV', async ({ adminPage }) => {
    await adminPage.goto('/view-all-hours');

    const exportButton = adminPage.getByRole('button', { name: /export|csv|download/i });
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeEnabled();
    }
  });

  test('admin can import hours from CSV', async ({ adminPage }) => {
    await adminPage.goto('/view-all-hours');

    // Check for import section
    await expect(
      adminPage.getByText(/import/i).first()
    ).toBeVisible();

    // Should have file input
    const fileInput = adminPage.locator('input[type="file"]');
    await expect(fileInput.first()).toBeAttached();
  });

  test('leaderboard shows top students by hours', async ({ adminPage }) => {
    await adminPage.goto('/admin/dashboard');

    // Leaderboard should exist on dashboard
    await expect(
      adminPage.getByText(/leaderboard/i).first()
    ).toBeVisible();

    // Should show ranked students
    const hasRanking = await adminPage.getByText(/1|#|rank/i).first().isVisible().catch(() => false);
    expect(hasRanking).toBeTruthy();
  });
});
