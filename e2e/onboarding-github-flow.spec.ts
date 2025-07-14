import { test, expect } from "@playwright/test";

test.describe("Onboarding GitHub Flow", () => {
  let testUserId: string;
  let testWorkspaceId: string;

  test.beforeEach(async ({ page }) => {
    // For e2e tests, we'll use test fixtures or mock data
    // In a real scenario, you'd set up test data using a test database
    testUserId = "test-user-" + Date.now();
    testWorkspaceId = "test-workspace-" + Date.now();

    // Mock authentication by setting session
    await page.goto("/");
    await page.evaluate((userId) => {
      localStorage.setItem("test-user-id", userId);
    }, testUserId);
  });

  test.afterEach(async () => {
    // Clean up would happen here in a real test environment
    // For now, we'll just clear the test data references
    testUserId = "";
    testWorkspaceId = "";
  });

  test("completes onboarding flow and connects GitHub", async ({ page }) => {
    // Go to workspace creation page
    await page.goto("/onboarding/workspace");
    
    // Fill in workspace form
    await page.fill('input[name="name"]', "My Test Workspace");
    await expect(page.locator('input[name="slug"]')).toHaveValue("my-test-workspace");
    
    // Submit workspace creation
    await page.click('button:has-text("Create Workspace")');
    
    // Should redirect to welcome page
    await expect(page).toHaveURL("/onboarding/welcome");
    
    // Navigate through welcome slides
    await expect(page.locator("h1")).toContainText("Welcome to Daygent");
    await page.click('button:has-text("Next")');
    
    await expect(page.locator("h1")).toContainText("AI-Powered Development");
    await page.click('button:has-text("Next")');
    
    await expect(page.locator("h1")).toContainText("GitHub Integration");
    
    // Mock the GitHub App installation API
    await page.route("/api/github/install", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          install_url: "https://github.com/apps/test-app/installations/new?state=test-state",
        }),
      });
    });
    
    // Click Connect with GitHub
    const connectButton = page.locator('button:has-text("Connect with GitHub")');
    await expect(connectButton).toBeVisible();
    
    // Intercept the redirect to GitHub
    await page.on("framenavigated", (frame) => {
      if (frame.url().includes("github.com/apps")) {
        console.log("Redirecting to GitHub App installation:", frame.url());
      }
    });
    
    // Click the button
    await connectButton.click();
    
    // Should show loading state
    await expect(page.locator('button:has-text("Connecting...")')).toBeVisible();
    
    // In a real test, we would verify the redirect to GitHub
    // For now, we'll simulate the callback
    await page.goto(`/api/github/install/callback?installation_id=12345&code=test-code&state=${testWorkspaceId}:csrf-token`);
    
    // Should redirect to the workspace issues page
    await expect(page).toHaveURL(/\/[\w-]+\/issues$/);
  });

  test("shows import issues button on empty state", async ({ page }) => {
    // Navigate directly to issues page
    await page.goto(`/test-workspace-${Date.now()}/issues`);
    
    // Should show empty state
    await expect(page.locator("h3")).toContainText("Connect a repository first");
    
    // Should have button to connect repositories
    const connectRepoButton = page.locator('a:has-text("Connect Repositories")');
    await expect(connectRepoButton).toBeVisible();
    await expect(connectRepoButton).toHaveAttribute("href", /\/settings\/repositories$/);
  });

  test("handles GitHub connection errors gracefully", async ({ page }) => {
    await page.goto("/onboarding/welcome");
    
    // Navigate to last slide
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    // Mock the GitHub App installation API to fail
    await page.route("/api/github/install", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to initiate GitHub connection",
        }),
      });
    });
    
    // Click Connect with GitHub
    await page.click('button:has-text("Connect with GitHub")');
    
    // Should redirect to dashboard on error
    await expect(page).toHaveURL(/\/([\w-]+\/)?issues$/);
  });
});