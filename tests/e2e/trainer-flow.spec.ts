import { test, expect } from '@playwright/test';

/**
 * Trainer flow smoke test.
 *
 * The full flow (sign in → add movement → upload fixture video → see extracted
 * reference) needs a configured Supabase project and a trainer test user with a
 * pre-minted session. Wire those via env (see README) and replace the guarded
 * block below. Without a backend we still verify the entry point renders, is
 * reachable, and is accessible.
 */
test.describe('trainer', () => {
  test('auth screen renders and is reachable', async ({ page }) => {
    await page.goto('/');
    // Signed out → redirected to the magic-link sign-in.
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole('heading', { name: /IronFit Movement Mirror/i })).toBeVisible();
    await expect(page.getByLabel(/Email address/i)).toBeVisible();
  });

  test('the medical/coaching disclaimer is always present', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText(/does not diagnose injury/i)).toBeVisible();
  });

  // Full reference-extraction flow — enable once Supabase + a trainer session are
  // configured in the test environment.
  test.fixme('signs in, adds a movement, uploads a fixture, sees the reference', async () => {
    // 1. Authenticate as a trainer (inject a Supabase session via addInitScript).
    // 2. goto('/trainer/movements/new'); fill the form; submit.
    // 3. Upload tests/fixtures/* video; wait for "Reference extracted and saved".
    // 4. Expect trajectory plot + peak ROM to be visible in ReferenceReview.
  });
});
