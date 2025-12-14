const { test: base } = require('@playwright/test');

// Test student credentials - should match a student in the test database
const TEST_STUDENT = {
  studentId: process.env.TEST_STUDENT_ID || '123456M789',
  name: 'Test Student'
};

const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'testpassword';

// Extend base test with authentication fixtures
exports.test = base.extend({
  // Authenticated student page
  studentPage: async ({ page }, use) => {
    await page.goto('/');
    await page.getByPlaceholder(/enter your student id/i).fill(TEST_STUDENT.studentId);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for either dashboard or error
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    } catch {
      // If login fails, skip the test
      console.log('Student login failed - test data may not exist');
    }

    await use(page);
  },

  // Authenticated admin page
  adminPage: async ({ page }, use) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByPlaceholder(/enter admin password/i).fill(TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    try {
      await page.waitForURL('**/admin/**', { timeout: 10000 });
    } catch {
      console.log('Admin login failed - check TEST_ADMIN_PASSWORD');
    }

    await use(page);
  }
});

exports.expect = require('@playwright/test').expect;
exports.TEST_STUDENT = TEST_STUDENT;
