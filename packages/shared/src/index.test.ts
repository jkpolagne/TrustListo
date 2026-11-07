import { describe, expect, it } from 'vitest';
import { ROLES, ROLE_HOME, formatPeso } from './index';

describe('shared', () => {
  it('formats pesos', () => {
    expect(formatPeso(1500000)).toBe('₱1,500,000.00');
    expect(formatPeso('2500.5')).toBe('₱2,500.50');
  });

  it('has a home route for every role', () => {
    for (const r of ROLES) expect(ROLE_HOME[r]).toMatch(/^\//);
  });
});
