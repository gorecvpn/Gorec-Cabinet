import { describe, expect, it } from 'vitest';

import { freezeErrorCode } from './subscriptionFreeze';

describe('freezeErrorCode', () => {
  it('reads detail.code from an API error', () => {
    const err = { response: { data: { detail: { code: 'limit_reached', message: 'x' } } } };
    expect(freezeErrorCode(err)).toBe('limit_reached');
  });

  it('returns null for string details and foreign errors', () => {
    expect(freezeErrorCode({ response: { data: { detail: 'Not found' } } })).toBeNull();
    expect(freezeErrorCode(new Error('boom'))).toBeNull();
    expect(freezeErrorCode(undefined)).toBeNull();
  });
});
