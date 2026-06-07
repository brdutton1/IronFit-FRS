import { describe, expect, it } from 'vitest';
import { canUseAIMirror } from './entitlements';
import type { Profile } from '@/types/profile';

const base: Profile = {
  user_id: 'u1',
  role: 'client',
  display_name: 'Client',
  trainer_id: 't1',
  invite_code: null,
  phone: null,
  bio: null,
  welcome_message: null,
  avatar_url: null,
  onboarded_at: null,
  is_owner: false,
  ai_mirror_enabled: true,
  created_at: '',
};

describe('canUseAIMirror', () => {
  it('grants access when the flag is on', () => {
    expect(canUseAIMirror(base)).toBe(true);
  });
  it('denies access when the flag is off', () => {
    expect(canUseAIMirror({ ...base, ai_mirror_enabled: false })).toBe(false);
  });
  it('denies access for a missing profile', () => {
    expect(canUseAIMirror(null)).toBe(false);
    expect(canUseAIMirror(undefined)).toBe(false);
  });
});
