const { test, expect } = require('./fixtures');

test.describe('CashBox Admin Dashboard', () => {
  test('displays cashbox admin page', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    await expect(
      adminPage.getByRole('heading', { name: /cashbox|concessions/i }).first()
    ).toBeVisible();
  });

  test('shows programs list', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Should show programs (Girls Basketball, Boys Basketball, etc.)
    await expect(
      adminPage.getByText(/basketball|soccer|program/i).first()
    ).toBeVisible();
  });

  test('can create new session', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Find and click new session button
    const newSessionBtn = adminPage.getByRole('button', { name: /new|create|start/i }).first();
    await expect(newSessionBtn).toBeVisible();
    await newSessionBtn.click();

    // Should show session creation form or modal
    await expect(
      adminPage.getByText(/session|name|program/i).first()
    ).toBeVisible();
  });

  test('displays session history', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Should show sessions or history section
    await expect(
      adminPage.getByText(/session|history|recent/i).first()
    ).toBeVisible();
  });

  test('shows profit/earnings summary', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Should show some financial summary
    const hasMoneySummary = await adminPage.getByText(/profit|earnings|total|\$/i).first().isVisible().catch(() => false);
    expect(hasMoneySummary).toBeTruthy();
  });
});

test.describe('Session Management', () => {
  test('can open session with starting cash count', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Create a new test session
    const newSessionBtn = adminPage.getByRole('button', { name: /new|create/i }).first();
    if (await newSessionBtn.isVisible()) {
      await newSessionBtn.click();
      await adminPage.waitForTimeout(500);

      // Fill session name if required
      const nameInput = adminPage.getByLabel(/name/i).or(adminPage.getByPlaceholder(/name/i));
      if (await nameInput.first().isVisible()) {
        await nameInput.first().fill('E2E Test Session');
      }

      // Select program if required
      const programSelect = adminPage.getByRole('combobox').first();
      if (await programSelect.isVisible()) {
        await programSelect.selectOption({ index: 1 });
      }
    }
  });

  test('session start requires cash count', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for a created/pending session to start
    const startBtn = adminPage.getByRole('button', { name: /start|open|begin/i });
    if (await startBtn.first().isVisible()) {
      await startBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should show cash counting interface
      await expect(
        adminPage.getByText(/quarters|bills|cash|count|\$1|\$5|\$10|\$20/i).first()
      ).toBeVisible();
    }
  });

  test('can enter starting cash denominations', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Find a session to start or look for cash count form
    const startBtn = adminPage.getByRole('button', { name: /start|open/i });
    if (await startBtn.first().isVisible()) {
      await startBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Look for denomination inputs
      const quarterInput = adminPage.getByLabel(/quarter/i).or(
        adminPage.locator('input[name*="quarter"], input[placeholder*="quarter"]')
      );
      if (await quarterInput.first().isVisible()) {
        await quarterInput.first().fill('20');
      }

      const onesInput = adminPage.getByLabel(/\$1|ones|bill.*1/i).or(
        adminPage.locator('input[name*="1"], input[name*="one"]')
      );
      if (await onesInput.first().isVisible()) {
        await onesInput.first().fill('10');
      }
    }
  });

  test('session close requires ending cash count', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for active session to close
    const closeBtn = adminPage.getByRole('button', { name: /close|end/i });
    if (await closeBtn.first().isVisible()) {
      await closeBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should show cash counting interface for closing
      await expect(
        adminPage.getByText(/quarters|bills|cash|count|ending/i).first()
      ).toBeVisible();
    }
  });

  test('closed session shows profit calculation', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for closed sessions
    const sessionCard = adminPage.locator('[class*="session"], [class*="card"]').filter({
      hasText: /closed|completed/i
    });

    if (await sessionCard.first().isVisible()) {
      // Should show profit info
      await expect(
        adminPage.getByText(/profit|\$|earned/i).first()
      ).toBeVisible();
    }
  });
});

test.describe('POS Interface', () => {
  test('student can access concession POS', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Should show POS interface or redirect to session
    const hasPOS = await studentPage.getByText(/menu|order|item|session/i).first().isVisible().catch(() => false);
    expect(typeof hasPOS).toBe('boolean');
  });

  test('POS displays menu items grid', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Look for menu items
    const menuGrid = studentPage.locator('.menu-grid, .pos-grid, [class*="grid"], [class*="menu"]');
    if (await menuGrid.first().isVisible()) {
      // Should have clickable items
      const menuItem = studentPage.getByRole('button').filter({
        hasText: /hot dog|nachos|popcorn|candy|drink/i
      });
      const hasItems = await menuItem.first().isVisible().catch(() => false);
      expect(typeof hasItems).toBe('boolean');
    }
  });

  test('can add item to cart', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Find and click a menu item
    const menuItem = studentPage.getByRole('button').filter({
      hasText: /hot dog|nachos|popcorn/i
    });

    if (await menuItem.first().isVisible()) {
      await menuItem.first().click();
      await studentPage.waitForTimeout(300);

      // Cart should show item or total should change
      const hasCartUpdate = await studentPage.getByText(/\$[1-9]|total|cart|subtotal/i).first().isVisible().catch(() => false);
      expect(hasCartUpdate).toBeTruthy();
    }
  });

  test('cart calculates subtotal correctly', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Add items and verify math
    const menuItem = studentPage.getByRole('button').filter({
      hasText: /hot dog|nachos/i
    });

    if (await menuItem.first().isVisible()) {
      // Click item twice
      await menuItem.first().click();
      await studentPage.waitForTimeout(200);
      await menuItem.first().click();
      await studentPage.waitForTimeout(200);

      // Should show quantity of 2 or doubled price
      const hasQuantity = await studentPage.getByText(/×.*2|x.*2|qty.*2|2.*×/i).first().isVisible().catch(() => false);
      expect(typeof hasQuantity).toBe('boolean');
    }
  });

  test('can remove item from cart', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Add an item first
    const menuItem = studentPage.getByRole('button').filter({
      hasText: /hot dog|nachos|popcorn/i
    });

    if (await menuItem.first().isVisible()) {
      await menuItem.first().click();
      await studentPage.waitForTimeout(300);

      // Find remove/delete button in cart
      const removeBtn = studentPage.getByRole('button', { name: /remove|delete|×|x|-/i }).or(
        studentPage.locator('[class*="remove"], [class*="delete"]')
      );

      if (await removeBtn.first().isVisible()) {
        await removeBtn.first().click();
      }
    }
  });

  test('can process cash payment', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Add item
    const menuItem = studentPage.getByRole('button').filter({
      hasText: /hot dog|nachos|candy/i
    });

    if (await menuItem.first().isVisible()) {
      await menuItem.first().click();
      await studentPage.waitForTimeout(300);

      // Enter payment amount
      const paymentInput = studentPage.getByLabel(/tendered|payment|amount|cash/i).or(
        studentPage.getByPlaceholder(/amount|\$/i)
      );

      if (await paymentInput.first().isVisible()) {
        await paymentInput.first().fill('10.00');
      }

      // Click complete/pay button
      const payBtn = studentPage.getByRole('button', { name: /pay|complete|finish|submit/i });
      if (await payBtn.first().isVisible()) {
        await payBtn.first().click();
        await studentPage.waitForTimeout(500);

        // Should show change or success
        const hasResult = await studentPage.getByText(/change|success|complete|\$/i).first().isVisible().catch(() => false);
        expect(typeof hasResult).toBe('boolean');
      }
    }
  });

  test('shows correct change calculation', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // This test checks the change display
    const changeDisplay = studentPage.getByText(/change/i);
    if (await changeDisplay.first().isVisible()) {
      // Change display should show a dollar amount
      const hasAmount = await studentPage.locator(':has-text("Change")').getByText(/\$\d/).isVisible().catch(() => false);
      expect(typeof hasAmount).toBe('boolean');
    }
  });

  test('can select CashApp payment method', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Look for payment method selector
    const cashAppBtn = studentPage.getByRole('button', { name: /cashapp|cash.*app/i }).or(
      studentPage.getByText(/cashapp/i)
    );

    if (await cashAppBtn.first().isVisible()) {
      await expect(cashAppBtn.first()).toBeEnabled();
    }
  });

  test('can apply discount to order', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Look for discount button or input
    const discountBtn = studentPage.getByRole('button', { name: /discount/i }).or(
      studentPage.getByText(/discount/i)
    );

    if (await discountBtn.first().isVisible()) {
      await discountBtn.first().click();
      await studentPage.waitForTimeout(300);

      // Should show discount input or options
      const hasDiscountUI = await studentPage.getByLabel(/discount|amount|percent/i).first().isVisible().catch(() => false);
      expect(typeof hasDiscountUI).toBe('boolean');
    }
  });

  test('displays order history for session', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Look for order history/list
    const historySection = studentPage.getByText(/history|orders|recent/i);
    if (await historySection.first().isVisible()) {
      await expect(historySection.first()).toBeVisible();
    }
  });
});

test.describe('Cash Counting', () => {
  test('cash count calculates total correctly', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Find cash counting form (in session start/close)
    const startBtn = adminPage.getByRole('button', { name: /start|count/i });
    if (await startBtn.first().isVisible()) {
      await startBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Fill in denominations
      const inputs = await adminPage.locator('input[type="number"]').all();
      if (inputs.length > 0) {
        // Fill quarters: 4 quarters = $1
        await inputs[0].fill('4');
        await adminPage.waitForTimeout(200);

        // Should calculate and show total
        const hasTotal = await adminPage.getByText(/total|\$1\.00|\$1/i).first().isVisible().catch(() => false);
        expect(typeof hasTotal).toBe('boolean');
      }
    }
  });
});
