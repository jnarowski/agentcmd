import { mergeTests } from "@playwright/test";
import {
  test as authenticatedPageTest,
  type AuthenticatedPageFixtures,
} from "./authenticated-page";
import { test as databaseTest, type DatabaseFixtures } from "./database";

/**
 * Merged Fixtures
 *
 * Combines all fixture modules into single test/expect exports.
 * Import from this file to get all fixtures at once.
 *
 * Available fixtures:
 * - authenticatedPage: Page with auth token set
 * - testUser: User object (id, email, token)
 * - prisma: PrismaClient connected to e2e.db
 * - db: Database seeding helpers
 *
 * @example
 * import { test, expect } from '../fixtures';
 *
 * test('my test', async ({ authenticatedPage, testUser, db, prisma }) => {
 *   const project = await db.seedProject({
 *     name: 'Test Project',
 *     path: '/tmp/test'
 *   });
 *
 *   await authenticatedPage.goto(`/projects/${project.id}`);
 *   await expect(authenticatedPage).toHaveTitle(/Test Project/);
 * });
 */

export const test = mergeTests(authenticatedPageTest, databaseTest);

export { expect } from "@playwright/test";

// Re-export types
export type { AuthenticatedPageFixtures, DatabaseFixtures };
