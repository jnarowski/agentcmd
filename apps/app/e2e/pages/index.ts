/**
 * Page Object Models (POMs)
 *
 * Export all page objects from a single entry point.
 *
 * @example
 * import { LoginPage, DashboardPage, ProjectsPage } from '../pages';
 *
 * test('my test', async ({ page }) => {
 *   const loginPage = new LoginPage(page);
 *   await loginPage.goto();
 *   await loginPage.login('user@example.com', 'password');
 * });
 */

export { BasePage } from "./BasePage";
export { LoginPage } from "./LoginPage";
export { DashboardPage } from "./DashboardPage";
export { ProjectsPage } from "./ProjectsPage";
export { NewSessionPage } from "./NewSessionPage";
export { SessionPage } from "./SessionPage";
