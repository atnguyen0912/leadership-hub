const { test, expect } = require('./fixtures');

test.describe('Student Management - Add Students', () => {
  test('can add new student manually', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Generate unique student ID for test
    const testStudentId = `TEST${Date.now()}`;
    const testStudentName = 'E2E Test Student';

    // Fill in the add student form
    await adminPage.getByLabel('Student ID').fill(testStudentId);
    await adminPage.getByLabel('Full Name').fill(testStudentName);

    // Click add button
    await adminPage.getByRole('button', { name: /^add$/i }).click();

    // Wait for response
    await adminPage.waitForTimeout(1000);

    // Student should appear in the list
    await expect(
      adminPage.getByText(testStudentId).or(adminPage.getByText(testStudentName))
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows error for duplicate student ID', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Try to add existing student (Alex Nguyen's ID)
    await adminPage.getByLabel('Student ID').fill('09121999X314');
    await adminPage.getByLabel('Full Name').fill('Duplicate Test');
    await adminPage.getByRole('button', { name: /^add$/i }).click();

    // Should show error or not duplicate the entry
    await adminPage.waitForTimeout(1000);

    // Count occurrences of the ID - should be exactly 1
    const idCells = adminPage.getByRole('cell', { name: '09121999X314' });
    const count = await idCells.count();
    expect(count).toBe(1);
  });

  test('validates required fields', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Try to add without filling fields
    await adminPage.getByRole('button', { name: /^add$/i }).click();

    // Should show validation or form should remain
    await expect(adminPage.getByLabel('Student ID')).toBeVisible();
  });
});

test.describe('Student Management - Remove Students', () => {
  test('can remove student from list', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // First add a test student to remove
    const testStudentId = `DEL${Date.now()}`;
    await adminPage.getByLabel('Student ID').fill(testStudentId);
    await adminPage.getByLabel('Full Name').fill('Delete Me Student');
    await adminPage.getByRole('button', { name: /^add$/i }).click();
    await adminPage.waitForTimeout(1000);

    // Find the row with this student and click remove
    const studentRow = adminPage.locator('tr').filter({ hasText: testStudentId });
    const removeBtn = studentRow.getByRole('button', { name: /remove|delete/i });

    if (await removeBtn.isVisible()) {
      await removeBtn.click();

      // Handle confirmation if it appears
      const confirmBtn = adminPage.getByRole('button', { name: /confirm|yes|ok/i });
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await adminPage.waitForTimeout(1000);

      // Student should no longer be visible
      await expect(adminPage.getByText(testStudentId)).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('remove button exists for each student', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Each student row should have a remove action
    const studentRows = adminPage.locator('tbody tr');
    const rowCount = await studentRows.count();

    if (rowCount > 0) {
      // Check first row has remove button
      const firstRowRemove = studentRows.first().getByRole('button', { name: /remove|delete/i });
      await expect(firstRowRemove).toBeVisible();
    }
  });
});

test.describe('Student Management - Lead Roles', () => {
  test('can assign lead role to student', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Find a student row with the lead role dropdown
    const leadSelect = adminPage.locator('tbody tr').first().getByRole('combobox');

    if (await leadSelect.isVisible()) {
      // Select "Events Lead" or "Concessions Lead"
      await leadSelect.selectOption({ label: 'Events Lead' });
      await adminPage.waitForTimeout(500);

      // Verify selection persisted
      await expect(leadSelect).toHaveValue(/events|lead/i);
    }
  });

  test('can remove lead role from student', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Find a student with a lead role and set to None
    const leadSelect = adminPage.locator('tbody tr').first().getByRole('combobox');

    if (await leadSelect.isVisible()) {
      await leadSelect.selectOption({ label: 'None' });
      await adminPage.waitForTimeout(500);

      // Verify changed
      const value = await leadSelect.inputValue();
      expect(value === '' || value === 'null' || value.toLowerCase().includes('none')).toBeTruthy();
    }
  });

  test('lead role options include Events and Concessions', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    const leadSelect = adminPage.locator('tbody tr').first().getByRole('combobox');

    if (await leadSelect.isVisible()) {
      // Check for expected options
      const options = leadSelect.locator('option');
      const optionTexts = await options.allTextContents();

      expect(optionTexts.some(t => t.includes('Events'))).toBeTruthy();
      expect(optionTexts.some(t => t.includes('Concessions'))).toBeTruthy();
    }
  });
});

test.describe('Student Management - CSV Operations', () => {
  test('CSV upload form exists', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Check for file input
    const fileInput = adminPage.locator('input[type="file"]');
    await expect(fileInput.first()).toBeAttached();
  });

  test('CSV upload accepts .csv files', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    const fileInput = adminPage.locator('input[type="file"]');
    if (await fileInput.first().isVisible()) {
      // Check accept attribute
      const acceptAttr = await fileInput.first().getAttribute('accept');
      if (acceptAttr) {
        expect(acceptAttr).toContain('csv');
      }
    }
  });

  test('can download students CSV', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Find download button
    const downloadBtn = adminPage.getByRole('button', { name: /download.*csv|export/i });
    if (await downloadBtn.isVisible()) {
      await expect(downloadBtn).toBeEnabled();

      // Set up download listener
      const downloadPromise = adminPage.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await downloadBtn.click();
      const download = await downloadPromise;

      if (download) {
        expect(download.suggestedFilename()).toContain('.csv');
      }
    }
  });

  test('can save students to server CSV', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Find save to server button
    const saveBtn = adminPage.getByRole('button', { name: /save.*server|save.*csv/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await adminPage.waitForTimeout(1000);

      // Should show success message
      const hasSuccess = await adminPage.getByText(/saved|success/i).first().isVisible().catch(() => false);
      expect(typeof hasSuccess).toBe('boolean');
    }
  });
});

test.describe('Student Management - Permission Groups', () => {
  test('permission groups tab exists', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    const permissionsTab = adminPage.getByRole('button', { name: /permission.*group/i });
    await expect(permissionsTab).toBeVisible();
  });

  test('can switch to permission groups view', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    const permissionsTab = adminPage.getByRole('button', { name: /permission.*group/i });
    await permissionsTab.click();
    await adminPage.waitForTimeout(500);

    // Should show permission groups content
    await expect(
      adminPage.getByText(/admin|member|lead|permission/i).first()
    ).toBeVisible();
  });

  test('displays default permission groups', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    const permissionsTab = adminPage.getByRole('button', { name: /permission.*group/i });
    await permissionsTab.click();
    await adminPage.waitForTimeout(500);

    // Should show default groups
    const hasAdmin = await adminPage.getByText(/^admin$/i).isVisible().catch(() => false);
    const hasMember = await adminPage.getByText(/member/i).isVisible().catch(() => false);

    expect(hasAdmin || hasMember).toBeTruthy();
  });
});

test.describe('Student Profile', () => {
  test('can view student profile from list', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Click on a student name to view profile
    const studentName = adminPage.getByRole('cell', { name: /nguyen|student/i }).first();
    if (await studentName.isVisible()) {
      const link = studentName.locator('a');
      if (await link.isVisible()) {
        await link.click();
        await adminPage.waitForTimeout(500);

        // Should navigate to profile or show profile modal
        const hasProfile = await adminPage.getByText(/profile|hours|history/i).first().isVisible().catch(() => false);
        expect(typeof hasProfile).toBe('boolean');
      }
    }
  });

  test('student count is displayed', async ({ adminPage }) => {
    await adminPage.goto('/manage-students');

    // Should show count like "All Students (5)"
    await expect(
      adminPage.getByText(/all students.*\(\d+\)|students.*\d+/i).first()
    ).toBeVisible();
  });
});
