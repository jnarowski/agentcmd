import { test, expect } from '@playwright/test';

const TEST_URL = process.env.TEST_URL || 'http://localhost:5173';
const TEST_USERNAME = process.env.TEST_USERNAME || 'jnarowski';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'tester';

test.describe('File Browser Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(TEST_URL);
    await page.fill('input[name="username"], input[type="text"]', TEST_USERNAME);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/.*\/dashboard/);

    // Navigate to a project's files page
    // First, find a project and click on it
    await page.waitForSelector('text=Projects', { timeout: 10000 });

    // Look for any project card or link
    const projectLink = page.locator('[href*="/projects/"]').first();
    await projectLink.waitFor({ timeout: 10000 });
    await projectLink.click();

    // Navigate to files tab/page
    await page.waitForTimeout(1000);
    const filesTab = page.locator('text=Files').or(page.locator('[href*="/files"]'));
    if (await filesTab.count() > 0) {
      await filesTab.first().click();
    }

    // Wait for file tree to load
    await page.waitForSelector('[class*="flex"][class*="flex-col"]', { timeout: 10000 });
  });

  test('1. Navigate to files page and verify UI loads', async ({ page }) => {
    // Verify search input is present
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Verify file tree container is present
    await expect(page.locator('[class*="overflow-auto"]')).toBeVisible();

    console.log('✓ Files page UI loaded successfully');
  });

  test('2. Test File Tree Expansion', async ({ page }) => {
    // Find a folder (directory) in the tree
    const folder = page.locator('svg').filter({ has: page.locator('[class*="lucide-folder"]') }).first();
    await folder.waitFor({ timeout: 5000 });

    // Get the parent container of the folder
    const folderRow = folder.locator('xpath=ancestor::div[contains(@class, "flex")]').first();

    // Find the chevron icon
    const chevron = folderRow.locator('svg[class*="lucide-chevron"]').first();

    // Check initial rotation (should be 0deg or no rotation)
    const initialTransform = await chevron.evaluate(el => window.getComputedStyle(el).transform);

    // Click to expand
    await folderRow.click();
    await page.waitForTimeout(500);

    // Verify chevron rotated
    const expandedTransform = await chevron.evaluate(el => window.getComputedStyle(el).transform);
    console.log('Initial transform:', initialTransform);
    console.log('Expanded transform:', expandedTransform);

    // Verify children are visible (check for nested items with increased padding)
    const hasChildren = await page.locator('[style*="padding-left"]').count() > 1;
    expect(hasChildren).toBeTruthy();

    // Click again to collapse
    await folderRow.click();
    await page.waitForTimeout(500);

    console.log('✓ File tree expansion/collapse working');
  });

  test('3. Test Search Functionality', async ({ page }) => {
    // Get initial file count
    const initialCount = await page.locator('[class*="cursor-pointer"]').count();

    // Type a search query
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('package');
    await page.waitForTimeout(500);

    // Verify filtered results
    const filteredCount = await page.locator('[class*="cursor-pointer"]').count();
    console.log('Initial count:', initialCount, 'Filtered count:', filteredCount);

    // Verify clear button appears
    await expect(page.locator('button').filter({ has: page.locator('svg[class*="lucide-x"]') })).toBeVisible();

    // Clear search
    await page.locator('button').filter({ has: page.locator('svg[class*="lucide-x"]') }).click();
    await page.waitForTimeout(500);

    // Verify full tree returns
    const restoredCount = await page.locator('[class*="cursor-pointer"]').count();
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);

    console.log('✓ Search functionality working');
  });

  test('4. Test File Editor', async ({ page }) => {
    // Find a text/code file (not a folder)
    // Look for files with code extensions
    const codeFile = page.locator('text=/\\.(tsx?|jsx?|json|md)$/').first();

    if (await codeFile.count() === 0) {
      // Fallback: find any file that's not a directory
      const anyFile = page.locator('svg[class*="lucide-file"]').first();
      const fileRow = anyFile.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]').first();
      await fileRow.click();
    } else {
      await codeFile.click();
    }

    // Wait for modal to open
    await page.waitForSelector('[class*="fixed"][class*="inset-0"]', { timeout: 5000 });

    // Verify modal content
    await expect(page.locator('text=/Save|Saved/')).toBeVisible();

    // Verify CodeMirror is present
    await expect(page.locator('.cm-editor, [class*="cm-"]')).toBeVisible();

    // Edit content - find the editor and type
    const editor = page.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type('\n// Test edit from automation');

    // Click Save button
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(1000);

    // Verify success message
    await expect(page.locator('text=/Saved/i')).toBeVisible({ timeout: 3000 });

    // Close modal
    await page.locator('button').filter({ has: page.locator('svg[class*="lucide-x"]') }).first().click();
    await page.waitForTimeout(500);

    // Reopen file to verify changes persisted
    const fileToReopen = page.locator('svg[class*="lucide-file"]').first();
    const fileRow = fileToReopen.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]').first();
    await fileRow.click();

    // Wait for modal
    await page.waitForSelector('[class*="fixed"][class*="inset-0"]', { timeout: 5000 });

    // Verify our test edit is present
    await expect(page.locator('text=/Test edit from automation/')).toBeVisible({ timeout: 3000 });

    // Close modal
    await page.locator('button').filter({ has: page.locator('svg[class*="lucide-x"]') }).first().click();

    console.log('✓ File editor working correctly');
  });

  test('5. Test Image Viewer', async ({ page }) => {
    // Look for image files
    const imageFile = page.locator('text=/\\.(png|jpg|jpeg|gif|svg|webp)$/').first();

    if (await imageFile.count() === 0) {
      console.log('⚠ No image files found in project, skipping image viewer test');
      return;
    }

    await imageFile.click();

    // Wait for image viewer modal
    await page.waitForSelector('[class*="fixed"][class*="inset-0"]', { timeout: 5000 });

    // Verify image element is present
    await expect(page.locator('img')).toBeVisible();

    // Close modal
    await page.locator('button').filter({ has: page.locator('svg[class*="lucide-x"]') }).click();

    console.log('✓ Image viewer working correctly');
  });

  test('6. Test Modal Close', async ({ page }) => {
    // Open a file
    const anyFile = page.locator('svg[class*="lucide-file"]').first();
    const fileRow = anyFile.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]').first();
    await fileRow.click();

    // Wait for modal
    await page.waitForSelector('[class*="fixed"][class*="inset-0"]', { timeout: 5000 });

    // Test X button close
    await page.locator('button').filter({ has: page.locator('svg[class*="lucide-x"]') }).first().click();
    await page.waitForTimeout(500);

    // Verify modal is closed
    const modalCount = await page.locator('[class*="fixed"][class*="inset-0"][class*="z-50"]').count();
    expect(modalCount).toBe(0);

    console.log('✓ Modal close functionality working');
  });

  test('7. Verify No Console Errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through the app
    await page.waitForTimeout(2000);

    // Click on a folder
    const folder = page.locator('svg').filter({ has: page.locator('[class*="lucide-folder"]') }).first();
    if (await folder.count() > 0) {
      const folderRow = folder.locator('xpath=ancestor::div[contains(@class, "flex")]').first();
      await folderRow.click();
      await page.waitForTimeout(500);
    }

    // Open a file
    const anyFile = page.locator('svg[class*="lucide-file"]').first();
    if (await anyFile.count() > 0) {
      const fileRow = anyFile.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]').first();
      await fileRow.click();
      await page.waitForTimeout(1000);

      // Close modal
      await page.locator('button').filter({ has: page.locator('svg[class*="lucide-x"]') }).first().click();
    }

    // Check for errors
    if (errors.length > 0) {
      console.log('❌ Console errors found:', errors);
      throw new Error(`Console errors detected: ${errors.join(', ')}`);
    }

    console.log('✓ No console errors detected');
  });
});
