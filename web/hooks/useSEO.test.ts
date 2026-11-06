import { describe, expect, it } from 'vitest';
import { formatPageTitle } from './useSEO';

describe('formatPageTitle', () => {
  it('adds the site name to plain titles', () => {
    expect(formatPageTitle('Guides')).toBe('Guides - PicklePlay Philippines');
  });

  it('does not add a second brand to titles that already name PicklePlay', () => {
    expect(formatPageTitle('Pickleball News Philippines | PicklePlay')).toBe('Pickleball News Philippines | PicklePlay');
    expect(formatPageTitle('Terms of Service – PicklePlay Philippines')).toBe('Terms of Service – PicklePlay Philippines');
    expect(formatPageTitle('Log in to PICKLEPLAY')).toBe('Log in to PICKLEPLAY');
  });
});
