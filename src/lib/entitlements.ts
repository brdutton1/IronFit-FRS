import type { Profile } from '@/types/profile';

/**
 * The single chokepoint for AI Mirror access (client-pays premium). Every AI
 * affordance — the client's live-scoring "Try it" and the PerformanceScreen
 * route — routes through here, so turning it into a real paywall later means
 * changing only this function (e.g. read a purchase/subscription entitlement),
 * not every screen.
 *
 * Today it reads a per-client flag that defaults ON, so nothing is gated until
 * the owner flips a client off (or, later, billing does).
 */
export function canUseAIMirror(profile: Profile | null | undefined): boolean {
  return profile?.ai_mirror_enabled ?? false;
}
