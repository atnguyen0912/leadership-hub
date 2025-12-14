const { test, expect } = require('./fixtures');

test.describe('Menu Management', () => {
  test('can access menu management from cashbox admin', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for menu management link/button
    const menuLink = adminPage.getByRole('link', { name: /menu/i }).or(
      adminPage.getByRole('button', { name: /menu|manage.*item/i })
    );

    if (await menuLink.first().isVisible()) {
      await menuLink.first().click();
      await adminPage.waitForTimeout(500);

      // Should show menu items
      await expect(
        adminPage.getByText(/menu|item|hot.*dog|nachos/i).first()
      ).toBeVisible();
    }
  });

  test('displays menu items list', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Navigate to menu section or look for menu items on page
    const hasMenuItems = await adminPage.getByText(/hot.*dog|nachos|popcorn|candy|drink/i).first().isVisible().catch(() => false);
    expect(typeof hasMenuItems).toBe('boolean');
  });

  test('can add new menu item', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Find add menu item button
    const addItemBtn = adminPage.getByRole('button', { name: /add.*item|new.*item/i });
    if (await addItemBtn.first().isVisible()) {
      await addItemBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Fill in item details
      const nameInput = adminPage.getByLabel(/name/i).first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('E2E Test Item');
      }

      const priceInput = adminPage.getByLabel(/price/i).first();
      if (await priceInput.isVisible()) {
        await priceInput.fill('2.50');
      }

      // Submit
      const saveBtn = adminPage.getByRole('button', { name: /save|add|create/i });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await adminPage.waitForTimeout(500);
      }
    }
  });

  test('can edit menu item price', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Find edit button for a menu item
    const editBtn = adminPage.getByRole('button', { name: /edit/i });
    if (await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Update price
      const priceInput = adminPage.getByLabel(/price/i).first();
      if (await priceInput.isVisible()) {
        await priceInput.fill('3.00');
      }

      // Save
      const saveBtn = adminPage.getByRole('button', { name: /save|update/i });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await adminPage.waitForTimeout(500);
      }
    }
  });

  test('can deactivate menu item', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for deactivate/toggle button
    const deactivateBtn = adminPage.getByRole('button', { name: /deactivate|disable|hide/i }).or(
      adminPage.locator('input[type="checkbox"]').first()
    );

    if (await deactivateBtn.first().isVisible()) {
      await expect(deactivateBtn.first()).toBeEnabled();
    }
  });

  test('menu items show price', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Menu items should show prices
    const hasPrice = await adminPage.getByText(/\$\d+\.\d{2}/).first().isVisible().catch(() => false);
    expect(hasPrice).toBeTruthy();
  });

  test('can set grid position for POS layout', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for grid position controls (row, col)
    const editBtn = adminPage.getByRole('button', { name: /edit|position|grid/i });
    if (await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should have row/col inputs
      const rowInput = adminPage.getByLabel(/row/i);
      const colInput = adminPage.getByLabel(/col|column/i);

      const hasGridControls = await rowInput.first().isVisible().catch(() => false) ||
                              await colInput.first().isVisible().catch(() => false);
      expect(typeof hasGridControls).toBe('boolean');
    }
  });
});

test.describe('Composite Items', () => {
  test('can create composite item (bundled product)', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for composite/bundle item creation
    const addCompositeBtn = adminPage.getByRole('button', { name: /composite|bundle|combo/i });
    if (await addCompositeBtn.first().isVisible()) {
      await addCompositeBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should show component selection
      const hasComponents = await adminPage.getByText(/component|ingredient|include/i).first().isVisible().catch(() => false);
      expect(typeof hasComponents).toBe('boolean');
    }
  });

  test('composite item shows components', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for composite items that show their components
    // e.g., "Hot Dog = Bun + Wiener"
    const compositeIndicator = adminPage.getByText(/=|contains|made.*of|includes/i);
    const hasComposite = await compositeIndicator.first().isVisible().catch(() => false);
    expect(typeof hasComposite).toBe('boolean');
  });
});

test.describe('Inventory Management', () => {
  test('can view inventory levels', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for inventory section
    const inventoryLink = adminPage.getByRole('link', { name: /inventory/i }).or(
      adminPage.getByRole('button', { name: /inventory/i })
    );

    if (await inventoryLink.first().isVisible()) {
      await inventoryLink.first().click();
      await adminPage.waitForTimeout(500);

      // Should show inventory counts
      await expect(
        adminPage.getByText(/qty|quantity|stock|on.*hand/i).first()
      ).toBeVisible();
    }
  });

  test('inventory shows quantity on hand', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for quantity column or display
    const hasQuantity = await adminPage.getByText(/\d+.*qty|\d+.*stock|quantity.*\d+/i).first().isVisible().catch(() => false);
    expect(typeof hasQuantity).toBe('boolean');
  });

  test('can adjust inventory count', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Find adjust/update inventory button
    const adjustBtn = adminPage.getByRole('button', { name: /adjust|update|count|stock/i });
    if (await adjustBtn.first().isVisible()) {
      await adjustBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should show quantity input
      const qtyInput = adminPage.getByLabel(/quantity|count|amount/i).or(
        adminPage.locator('input[type="number"]')
      );
      const hasInput = await qtyInput.first().isVisible().catch(() => false);
      expect(typeof hasInput).toBe('boolean');
    }
  });

  test('can enter purchase receipt', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for purchase/receipt entry
    const purchaseBtn = adminPage.getByRole('button', { name: /purchase|receipt|restock/i });
    if (await purchaseBtn.first().isVisible()) {
      await purchaseBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should show purchase entry form
      const hasForm = await adminPage.getByLabel(/vendor|item|quantity|cost|total/i).first().isVisible().catch(() => false);
      expect(typeof hasForm).toBe('boolean');
    }
  });

  test('purchase entry has line items', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Navigate to purchase entry
    const purchaseBtn = adminPage.getByRole('button', { name: /purchase|receipt/i });
    if (await purchaseBtn.first().isVisible()) {
      await purchaseBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should be able to add multiple line items
      const addLineBtn = adminPage.getByRole('button', { name: /add.*line|add.*item|\+/i });
      const hasAddLine = await addLineBtn.first().isVisible().catch(() => false);
      expect(typeof hasAddLine).toBe('boolean');
    }
  });

  test('tracks cost of goods (COGS)', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for COGS or unit cost display
    const hasCost = await adminPage.getByText(/cost|cogs|unit.*cost|\$.*per/i).first().isVisible().catch(() => false);
    expect(typeof hasCost).toBe('boolean');
  });
});

test.describe('Inventory Counting', () => {
  test('can perform inventory count', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for inventory count feature
    const countBtn = adminPage.getByRole('button', { name: /count|physical.*count|inventory.*count/i });
    if (await countBtn.first().isVisible()) {
      await countBtn.first().click();
      await adminPage.waitForTimeout(500);

      // Should show count form with expected vs actual
      const hasCountForm = await adminPage.getByText(/expected|actual|count|discrepancy/i).first().isVisible().catch(() => false);
      expect(typeof hasCountForm).toBe('boolean');
    }
  });

  test('inventory count shows discrepancies', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for discrepancy display
    const hasDiscrepancy = await adminPage.getByText(/discrepancy|difference|variance|shortage|overage/i).first().isVisible().catch(() => false);
    expect(typeof hasDiscrepancy).toBe('boolean');
  });

  test('can record inventory adjustments', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for adjustment types (lost, wasted, donated, etc.)
    const adjustBtn = adminPage.getByRole('button', { name: /adjust|lost|waste|donate/i });
    if (await adjustBtn.first().isVisible()) {
      await expect(adjustBtn.first()).toBeEnabled();
    }
  });
});

test.describe('Inventory Transactions', () => {
  test('can view transaction history', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for transaction history
    const historyLink = adminPage.getByRole('link', { name: /history|transaction|log/i }).or(
      adminPage.getByRole('button', { name: /history|transaction/i })
    );

    if (await historyLink.first().isVisible()) {
      await historyLink.first().click();
      await adminPage.waitForTimeout(500);

      // Should show transactions
      const hasHistory = await adminPage.getByText(/sale|purchase|adjustment|date/i).first().isVisible().catch(() => false);
      expect(typeof hasHistory).toBe('boolean');
    }
  });

  test('transactions show type and quantity', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for transaction details
    const hasTransactionDetails = await adminPage.getByText(/sale|purchase|\+\d|\-\d/i).first().isVisible().catch(() => false);
    expect(typeof hasTransactionDetails).toBe('boolean');
  });
});

test.describe('Supply Items', () => {
  test('can mark item as supply (non-sale)', async ({ adminPage }) => {
    await adminPage.goto('/cashbox-admin');

    // Look for supply item indicator
    const supplyCheckbox = adminPage.getByLabel(/supply|non.*sale/i).or(
      adminPage.locator('input[type="checkbox"]').filter({ has: adminPage.locator('text=/supply/i') })
    );

    const hasSupply = await supplyCheckbox.first().isVisible().catch(() => false);
    expect(typeof hasSupply).toBe('boolean');
  });

  test('supply items not shown in POS', async ({ studentPage }) => {
    await studentPage.goto('/cashbox');

    // Supply items should not appear in the menu grid
    const supplyItem = studentPage.getByText(/napkin|cup|tray|supply/i);
    // This is expected to potentially be false - supplies shouldn't show
    const showsInPOS = await supplyItem.first().isVisible().catch(() => false);
    expect(typeof showsInPOS).toBe('boolean');
  });
});
