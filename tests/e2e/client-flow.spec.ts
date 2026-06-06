import { test, expect } from '@playwright/test';

/**
 * Client flow smoke test.
 *
 * The full flow (sign in → pick movement → live performance → summary) needs a
 * configured Supabase project, a client test user, and at least one live
 * movement with a reference. Wire those via env (see README) and enable the
 * fixme block. Without a backend we verify routing guards and accessibility.
 */
test.describe('client', () => {
  test('protected client routes redirect to sign-in when signed out', async ({ page }) => {
    await page.goto('/client');
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('unknown routes fall back to the index', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/auth$/); // index → auth when signed out
  });

  test.fixme('signs in, picks a movement, reaches the live performance screen', async () => {
    // 1. Authenticate as a client (inject a Supabase session).
    // 2. goto('/client'); click a movement tile.
    // 3. On the detail screen, click "Try it".
    // 4. Grant camera (config grants it); expect the positioning prompt, then
    //    the ROM meter to render after the countdown.
  });
});
