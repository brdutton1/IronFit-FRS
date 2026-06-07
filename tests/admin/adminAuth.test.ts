import { describe, expect, it } from 'vitest';
import { canResetPassword } from '@/lib/adminAuth';

describe('canResetPassword', () => {
  const owner = 'owner-1';
  const trainer = 'trainer-1';
  const otherTrainer = 'trainer-2';

  it('owner can reset anyone', () => {
    expect(canResetPassword({ callerIsOwner: true, callerId: owner, targetTrainerId: null })).toBe(true);
    expect(canResetPassword({ callerIsOwner: true, callerId: owner, targetTrainerId: otherTrainer })).toBe(true);
  });

  it('trainer can reset their own client', () => {
    expect(canResetPassword({ callerIsOwner: false, callerId: trainer, targetTrainerId: trainer })).toBe(true);
  });

  it('trainer cannot reset another trainer’s client', () => {
    expect(canResetPassword({ callerIsOwner: false, callerId: trainer, targetTrainerId: otherTrainer })).toBe(false);
  });

  it('trainer cannot reset a trainer/owner (no trainer_id)', () => {
    expect(canResetPassword({ callerIsOwner: false, callerId: trainer, targetTrainerId: null })).toBe(false);
  });
});
