import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  test("new user completes full onboarding", async ({ page }) => {
    // Mock authentication
    await page.goto("/login");
    
    // Simulate OAuth callback
    await page.goto("/auth/callback?code=test");
    
    // Should redirect to profile setup
    await expect(page).toHaveURL("/onboarding/profile");
    
    // Complete profile
    await page.fill('input[name="name"]', "Test User");
    await page.click('button:has-text("Continue")');
    
    // Should be on workspace creation
    await expect(page).toHaveURL("/onboarding/workspace");
    
    // Create workspace
    await page.fill('input[name="name"]', "Test Workspace");
    await expect(page.locator('input[name="slug"]')).toHaveValue("test-workspace");
    await page.click('button:has-text("Create workspace")');
    
    // Should see welcome slides
    await expect(page).toHaveURL("/onboarding/welcome");
    
    // Navigate through slides
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Connect with GitHub")');
    
    // Should be on GitHub connection page
    await expect(page).toHaveURL("/connect/github");
  });

  test("existing user with workspace goes to dashboard", async ({ page }) => {
    // Mock authenticated user with workspace
    await page.goto("/");
    
    // Should redirect to workspace dashboard
    await expect(page).toHaveURL(/^\/[^\/]+\/issues$/);
  });
});