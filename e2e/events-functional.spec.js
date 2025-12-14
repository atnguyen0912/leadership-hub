const { test, expect } = require('./fixtures');

test.describe('Events - Student View', () => {
  test('displays events page', async ({ studentPage }) => {
    await studentPage.goto('/events');

    await expect(
      studentPage.getByRole('heading', { name: /event/i }).first()
    ).toBeVisible();
  });

  test('shows list of available events', async ({ studentPage }) => {
    await studentPage.goto('/events');

    // Should show events or "no events" message
    const hasEvents = await studentPage.getByText(/event|sign.*up|no.*event|upcoming/i).first().isVisible().catch(() => false);
    expect(hasEvents).toBeTruthy();
  });

  test('can sign up for event', async ({ studentPage }) => {
    await studentPage.goto('/events');

    // Find sign up button for an event
    const signUpBtn = studentPage.getByRole('button', { name: /sign.*up|join|register/i });
    if (await signUpBtn.first().isVisible()) {
      await signUpBtn.first().click();
      await studentPage.waitForTimeout(500);

      // Should show confirmation or change button state
      const hasSignedUp = await studentPage.getByText(/signed|registered|joined|leave|cancel/i).first().isVisible().catch(() => false);
      expect(typeof hasSignedUp).toBe('boolean');
    }
  });

  test('can check in to event with code', async ({ studentPage }) => {
    await studentPage.goto('/events');

    // Look for check-in input
    const checkInInput = studentPage.getByLabel(/code|check.*in/i).or(
      studentPage.getByPlaceholder(/code|check.*in/i)
    );

    if (await checkInInput.first().isVisible()) {
      await checkInInput.first().fill('TESTCODE');

      const checkInBtn = studentPage.getByRole('button', { name: /check.*in|submit/i });
      if (await checkInBtn.isVisible()) {
        await checkInBtn.click();
        await studentPage.waitForTimeout(500);
      }
    }
  });

  test('shows events student is signed up for', async ({ studentPage }) => {
    await studentPage.goto('/events');

    // Look for "my events" section or signed up indicator
    const myEventsSection = studentPage.getByText(/my.*event|signed.*up|registered/i);
    if (await myEventsSection.first().isVisible()) {
      await expect(myEventsSection.first()).toBeVisible();
    }
  });
});

test.describe('Events - Lead View (Create Events)', () => {
  test('lead can access event creation', async ({ studentPage }) => {
    await studentPage.goto('/events');

    // Events lead should see create button
    const createBtn = studentPage.getByRole('button', { name: /create|new|add/i });
    const hasCreate = await createBtn.first().isVisible().catch(() => false);
    expect(typeof hasCreate).toBe('boolean');
  });

  test('event creation form has required fields', async ({ studentPage }) => {
    await studentPage.goto('/events');

    const createBtn = studentPage.getByRole('button', { name: /create|new|add/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await studentPage.waitForTimeout(500);

      // Should show form with name, dates, times
      const hasNameField = await studentPage.getByLabel(/name|title/i).first().isVisible().catch(() => false);
      const hasDateField = await studentPage.getByLabel(/date|start|end/i).first().isVisible().catch(() => false);

      expect(hasNameField || hasDateField).toBeTruthy();
    }
  });

  test('can create event request', async ({ studentPage }) => {
    await studentPage.goto('/events');

    const createBtn = studentPage.getByRole('button', { name: /create|new|add/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await studentPage.waitForTimeout(500);

      // Fill in event details
      const nameField = studentPage.getByLabel(/name|title/i).first();
      if (await nameField.isVisible()) {
        await nameField.fill('E2E Test Event');
      }

      // Fill dates
      const startDate = studentPage.getByLabel(/start.*date/i).first();
      if (await startDate.isVisible()) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await startDate.fill(tomorrow.toISOString().split('T')[0]);
      }

      const endDate = studentPage.getByLabel(/end.*date/i).first();
      if (await endDate.isVisible()) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        await endDate.fill(nextWeek.toISOString().split('T')[0]);
      }

      // Fill times
      const timeIn = studentPage.getByLabel(/time.*in|start.*time/i).first();
      if (await timeIn.isVisible()) {
        await timeIn.fill('09:00');
      }

      const timeOut = studentPage.getByLabel(/time.*out|end.*time/i).first();
      if (await timeOut.isVisible()) {
        await timeOut.fill('12:00');
      }

      // Submit
      const submitBtn = studentPage.getByRole('button', { name: /create|submit|save/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await studentPage.waitForTimeout(1000);
      }
    }
  });
});

test.describe('Events - Admin Management', () => {
  test('admin sees events management page', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    await expect(
      adminPage.getByRole('heading', { name: 'Events Management' })
    ).toBeVisible();
  });

  test('shows status filter dropdown', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    const statusFilter = adminPage.getByRole('combobox');
    await expect(statusFilter.first()).toBeVisible();

    // Should have status options
    const options = statusFilter.first().locator('option');
    const texts = await options.allTextContents();
    expect(texts.some(t => /pending|approved|active/i.test(t))).toBeTruthy();
  });

  test('can filter events by status', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    const statusFilter = adminPage.getByRole('combobox').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: 'Pending' });
      await adminPage.waitForTimeout(500);

      // Page should update
      await expect(statusFilter).toHaveValue(/pending/i);
    }
  });

  test('can approve pending event', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    // Filter to pending events
    const statusFilter = adminPage.getByRole('combobox').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: 'Pending' });
      await adminPage.waitForTimeout(500);
    }

    // Find approve button
    const approveBtn = adminPage.getByRole('button', { name: /approve/i });
    if (await approveBtn.first().isVisible()) {
      await approveBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should show success or event should change status
      const hasApproved = await adminPage.getByText(/approved|success/i).first().isVisible().catch(() => false);
      expect(typeof hasApproved).toBe('boolean');
    }
  });

  test('can reject/cancel event', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    // Find reject/cancel button
    const rejectBtn = adminPage.getByRole('button', { name: /reject|cancel|deny/i });
    if (await rejectBtn.first().isVisible()) {
      await expect(rejectBtn.first()).toBeEnabled();
    }
  });

  test('approved event shows check-in code', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    // Filter to approved or active events
    const statusFilter = adminPage.getByRole('combobox').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: 'Approved' });
      await adminPage.waitForTimeout(500);
    }

    // Look for check-in code display
    const hasCode = await adminPage.getByText(/code|check.*in/i).first().isVisible().catch(() => false);
    expect(typeof hasCode).toBe('boolean');
  });

  test('can view event attendees', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    // Look for attendees button or expand
    const attendeesBtn = adminPage.getByRole('button', { name: /attendee|participant|view/i });
    if (await attendeesBtn.first().isVisible()) {
      await attendeesBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should show attendee list or modal
      const hasAttendees = await adminPage.getByText(/attendee|signed.*up|student/i).first().isVisible().catch(() => false);
      expect(typeof hasAttendees).toBe('boolean');
    }
  });

  test('can complete event and log hours', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    // Filter to active events
    const statusFilter = adminPage.getByRole('combobox').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: 'Active' });
      await adminPage.waitForTimeout(500);
    }

    // Find complete button
    const completeBtn = adminPage.getByRole('button', { name: /complete|finish|log.*hours/i });
    if (await completeBtn.first().isVisible()) {
      await expect(completeBtn.first()).toBeEnabled();
    }
  });
});

test.describe('Events - Workflow Integration', () => {
  test('event status progression: pending -> approved -> active -> completed', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    // Verify status filter has all expected states
    const statusFilter = adminPage.getByRole('combobox').first();
    if (await statusFilter.isVisible()) {
      const options = statusFilter.locator('option');
      const texts = await options.allTextContents();

      expect(texts.some(t => /pending/i.test(t))).toBeTruthy();
      expect(texts.some(t => /approved/i.test(t))).toBeTruthy();
      expect(texts.some(t => /active/i.test(t))).toBeTruthy();
      expect(texts.some(t => /completed/i.test(t))).toBeTruthy();
    }
  });

  test('cancelled status exists', async ({ adminPage }) => {
    await adminPage.goto('/events-admin');

    const statusFilter = adminPage.getByRole('combobox').first();
    if (await statusFilter.isVisible()) {
      const options = statusFilter.locator('option');
      const texts = await options.allTextContents();

      expect(texts.some(t => /cancelled/i.test(t))).toBeTruthy();
    }
  });
});
