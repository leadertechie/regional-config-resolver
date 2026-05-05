import { describe, it, expect } from 'vitest';
import { RegionalConfigResolver, type ConfigEntry } from '../index';
import { composeProviders, fromMap } from '../hierarchy';

// ─── Basic resolution ────────────────────────────────────────────────────────

describe('RegionalConfigResolver', () => {
  it('returns value for exact key match (raw value)', () => {
    const r = new RegionalConfigResolver({ AU: 'dark-mode' });
    expect(r.resolve('AU')).toBe('dark-mode');
  });

  it('returns undefined for missing key with no fallback chain', () => {
    const r = new RegionalConfigResolver({});
    expect(r.resolve('XX')).toBeUndefined();
  });

  it('returns value from config object with value field', () => {
    const r = new RegionalConfigResolver({ AU: { value: 'light-mode' } });
    expect(r.resolve('AU')).toBe('light-mode');
  });

  // ─── Fallback ──────────────────────────────────────────────────────────────

  it('follows fallback key when value is undefined', () => {
    const r = new RegionalConfigResolver({
      'AU-PER': { fallback: 'AU' },
      AU: 'dark-mode',
    });
    expect(r.resolve('AU-PER')).toBe('dark-mode');
  });

  it('follows chained fallbacks', () => {
    const r = new RegionalConfigResolver({
      'AU-PER': { fallback: 'AU-WA' },
      'AU-WA': { fallback: 'AU' },
      AU: 'dark-mode',
    });
    expect(r.resolve('AU-PER')).toBe('dark-mode');
  });

  it('detects circular fallback and returns undefined', () => {
    const r = new RegionalConfigResolver({
      A: { fallback: 'B' },
      B: { fallback: 'A' },
    });
    expect(r.resolve('A')).toBeUndefined();
  });

  // ─── Prefix step-down ──────────────────────────────────────────────────────

  it('steps down hyphenated keys when no provider', () => {
    const r = new RegionalConfigResolver({
      AU: 'dark-mode',
    });
    expect(r.resolve('AU-PER')).toBe('dark-mode');
  });

  it('steps down multiple levels', () => {
    const r = new RegionalConfigResolver({
      AU: 'dark-mode',
    });
    expect(r.resolve('AU-WA-PER')).toBe('dark-mode');
  });

  it('falls back to wildcard after prefix step-down', () => {
    const r = new RegionalConfigResolver({
      '*': 'global-mode',
    });
    expect(r.resolve('AU-PER')).toBe('global-mode');
  });

  it('prefers more specific match over wildcard', () => {
    const r = new RegionalConfigResolver({
      '*': 'global-mode',
      AU: 'au-mode',
    });
    expect(r.resolve('AU-PER')).toBe('au-mode');
  });

  // ─── HierarchyProvider ─────────────────────────────────────────────────────

  it('uses provider to walk hierarchy', () => {
    const provider = fromMap({
      'AU-PER': 'AU',
      AU: 'Oceania',
      Oceania: 'World',
    });
    const r = new RegionalConfigResolver(
      { World: 'global-mode' },
      provider,
    );
    expect(r.resolve('AU-PER')).toBe('global-mode');
  });

  it('prefers local data over provider parent', () => {
    const provider = fromMap({ 'AU-PER': 'AU' });
    const r = new RegionalConfigResolver(
      { 'AU-PER': 'local-mode' },
      provider,
    );
    expect(r.resolve('AU-PER')).toBe('local-mode');
  });

  it('uses provider after local miss', () => {
    const provider = fromMap({ 'AU-PER': 'AU' });
    const r = new RegionalConfigResolver(
      { AU: 'au-mode' },
      provider,
    );
    expect(r.resolve('AU-PER')).toBe('au-mode');
  });

  it('detects circular hierarchy via provider', () => {
    const provider = fromMap({ A: 'B', B: 'A' });
    const r = new RegionalConfigResolver({}, provider);
    expect(r.resolve('A')).toBeUndefined();
  });

  // ─── composeProviders ──────────────────────────────────────────────────────

  it('composeProviders checks providers in order', () => {
    const p1 = fromMap({ X: 'Y' });
    const p2 = fromMap({ X: 'Z' });
    const combined = composeProviders(p1, p2);
    expect(combined('X')).toBe('Y');
  });

  it('composeProviders falls through to next provider', () => {
    const p1 = fromMap({});
    const p2 = fromMap({ X: 'Z' });
    const combined = composeProviders(p1, p2);
    expect(combined('X')).toBe('Z');
  });

  it('composeProviders returns undefined when all miss', () => {
    const combined = composeProviders(fromMap({}), fromMap({}));
    expect(combined('X')).toBeUndefined();
  });

  // ─── fromMap ───────────────────────────────────────────────────────────────

  it('fromMap returns value for known key', () => {
    const p = fromMap({ A: 'B' });
    expect(p('A')).toBe('B');
  });

  it('fromMap returns undefined for unknown key', () => {
    const p = fromMap({ A: 'B' });
    expect(p('X')).toBeUndefined();
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  it('handles empty data', () => {
    const r = new RegionalConfigResolver({});
    expect(r.resolve('*')).toBeUndefined();
  });

  it('handles wildcard key in data', () => {
    const r = new RegionalConfigResolver({ '*': 'fallback' });
    expect(r.resolve('anything')).toBe('fallback');
  });

  it('handles config object with both value and fallback (value wins)', () => {
    const r = new RegionalConfigResolver({
      AU: { value: 'direct', fallback: 'World' },
    });
    expect(r.resolve('AU')).toBe('direct');
  });

  it('handles config object with only fallback (no value)', () => {
    const r = new RegionalConfigResolver({
      AU: { fallback: 'World' },
      World: 'global',
    });
    expect(r.resolve('AU')).toBe('global');
  });

  it('does not treat arrays as config objects', () => {
    const r = new RegionalConfigResolver({
      AU: ['a', 'b'] as unknown as ConfigEntry<string>,
    });
    expect(r.resolve('AU')).toEqual(['a', 'b']);
  });

  it('returns undefined for null value', () => {
    const r = new RegionalConfigResolver({
      AU: null as unknown as ConfigEntry<string>,
    });
    expect(r.resolve('AU')).toBeNull();
  });
});
