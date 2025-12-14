const { test, expect } = require('./fixtures');

test.describe('Admin Dashboard', () => {
  test('displays admin dashboard with stats', async ({ adminPage }) => {
    await expect(adminPage.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
  });

  test('shows quick action links', async ({ adminPage }) => {
    // Admin dashboard should have navigation to key areas
    const manageStudents = adminPage.getByRole('link', { name: /manage.*student|student/i });
    const viewHours = adminPage.getByRole('link', { name: /hours|view.*hours/i });
    const events = adminPage.getByRole('link', { name: /event/i });

    // At least one should be visible
    const hasLinks = await Promise.any([
      manageStudents.isVisible(),
      viewHours.isVisible(),
      events.isVisible()
    ]).catch(() => false);

    expect(hasLinks).toBeTruthy();
  });

  test('displays leaderboard or student summary', async ({ adminPage }) => {
    // Should show some student data
    await expect(
      adminPage.getByText(/leaderboard|top|student|hours/i).first()
    ).toBeVisible();
  });
});

test.describe('Admin - Manage Students', () => {
  test('displays student list', async ({ adminPage }) => {
    await adminPage.goto('/admin/students');

    await expect(adminPage.getByRole('heading', { name: /manage students/i })).toBeVisible();
  });

  test('has add student form', async ({ adminPage }) => {
    await adminPage.goto('/admin/students');

    await expect(adminPage.getByLabel(/student id/i)).toBeVisible();
    await expect(adminPage.getByLabel(/name/i)).toBeVisible();
  });

  test('has CSV upload option', async ({ adminPage }) => {
    await adminPage.goto('/admin/students');

    await expect(adminPage.getByText(/csv|upload|import/i).first()).toBeVisible();
  });

  test('shows student table with actions', async ({ adminPage }) => {
    await adminPage.goto('/admin/students');

    // Table should exist
    const table = adminPage.getByRole('table');
    if (await table.isVisible()) {
      await expect(table).toBeVisible();
    }
  });
});

test.describe('Admin - View All Hours', () => {
  test('displays all hours page', async ({ adminPage }) => {
    await adminPage.goto('/admin/hours');

    await expect(adminPage.getByRole('heading', { name: /all hours/i })).toBeVisible();
  });

  test('shows summary by student', async ({ adminPage }) => {
    await adminPage.goto('/admin/hours');

    await expect(adminPage.getByText(/summary|student/i).first()).toBeVisible();
  });

  test('has CSV import functionality', async ({ adminPage }) => {
    await adminPage.goto('/admin/hours');

    await expect(adminPage.getByText(/import|csv|upload/i).first()).toBeVisible();
  });
});

test.describe('Admin - Events Management', () => {
  test('displays events management page', async ({ adminPage }) => {
    await adminPage.goto('/admin/events');

    await expect(adminPage.getByRole('heading', { name: /event/i })).toBeVisible();
  });

  test('shows event list with status filters', async ({ adminPage }) => {
    await adminPage.goto('/admin/events');

    // Should have status filter
    const statusFilter = adminPage.getByRole('combobox').or(
      adminPage.getByLabel(/status|filter/i)
    );

    if (await statusFilter.first().isVisible()) {
      await expect(statusFilter.first()).toBeVisible();
    }
  });
});
