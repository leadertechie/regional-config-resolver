# @leadertechie/regional-config-resolver

**Logic-only engine for hierarchical configuration resolution.** Storage-agnostic (no KV/R2 dependency) and hierarchy-agnostic (uses Dependency Injection for standards like UN-M49).

Resolves region-specific config values by walking a hierarchy: exact key → manual fallback → hierarchy provider (e.g. UN-M49) → prefix step-down → wildcard `*`.

Zero runtime dependencies (except optional `@leadertechie/geo-hierarchy-un-m49`). Works in browser, Node, edge workers.

---

## Installation

```bash
npm install @leadertechie/regional-config-resolver
```

---

## Quick Start

```typescript
import { RegionalConfigResolver } from '@leadertechie/regional-config-resolver';

const data = {
  'AU': 'dark-mode',
  'US': 'light-mode',
  '*':  'system-mode',
};

const resolver = new RegionalConfigResolver(data);
resolver.resolve('AU-PER'); // → "dark-mode"  (prefix step-down: AU-PER → AU)
resolver.resolve('US-CA');  // → "light-mode" (prefix step-down: US-CA → US)
resolver.resolve('JP');     // → "system-mode" (wildcard fallback)
```

### With UN-M49 Hierarchy

```typescript
import { getParent } from '@leadertechie/geo-hierarchy-un-m49';
import { RegionalConfigResolver } from '@leadertechie/regional-config-resolver';

const data = {
  'Oceania': 'oceania-theme',
  '*':       'default-theme',
};

const resolver = new RegionalConfigResolver(data, getParent);
resolver.resolve('AU'); // → "oceania-theme" (AU → Oceania)
resolver.resolve('US'); // → "default-theme" (US → Americas → World → *)
```

---

## Resolution Strategy

When you call `resolver.resolve(key)`, it walks this chain:

```
1. Exact key match in data       → return value
2. Config object with `value`    → return value
3. Config object with `fallback` → jump to fallback key, repeat
4. HierarchyProvider (e.g. UN-M49) → ask for parent key, repeat
5. Prefix step-down (hyphen split) → e.g. "AU-WA-PER" → "AU-WA"
6. Wildcard `*`                  → return global fallback
7. Nothing found                 → return undefined
```

Circular references are detected and return `undefined`.

---

## API

### `RegionalConfigResolver<T>`

```typescript
constructor(data: Record<string, ConfigEntry<T>>, provider?: HierarchyProvider)
```

| Param | Type | Description |
|-------|------|-------------|
| `data` | `Record<string, ConfigEntry<T>>` | Flat map of keys to values |
| `provider` | `HierarchyProvider` (optional) | Function that returns parent key for a given key |

#### `resolve(key: string): T | undefined`

Resolve a value by walking the hierarchy.

---

### Types

```typescript
type HierarchyProvider = (key: string) => string | undefined;

type ConfigEntry<T> = T | { value?: T; fallback?: string };
```

- **Raw value**: `'dark-mode'` — returned directly on match
- **Config object**: `{ value: 'dark-mode' }` — explicit value
- **Config object with fallback**: `{ fallback: 'AU' }` — jump to another key
- **Both**: `{ value: 'dark-mode', fallback: 'World' }` — `value` wins

---

### Hierarchy Helpers

```typescript
import { composeProviders, fromMap } from '@leadertechie/regional-config-resolver';
```

#### `composeProviders(...providers: HierarchyProvider[]): HierarchyProvider`

Merge multiple providers. First non-undefined result wins.

```typescript
const provider = composeProviders(getParent, customProvider);
```

#### `fromMap(map: Record<string, string>): HierarchyProvider`

Create a provider from a static map. Useful for tests.

```typescript
const provider = fromMap({ 'AU-PER': 'AU', 'AU': 'Oceania' });
```

---

## Usage with @leadertechie/geo-hierarchy-un-m49

```typescript
import { getParent } from '@leadertechie/geo-hierarchy-un-m49';
import { RegionalConfigResolver } from '@leadertechie/regional-config-resolver';

const resolver = new RegionalConfigResolver(kvData, getParent);
const mode = resolver.resolve('AU-PER');
// Walks: AU-PER → AU → Australia and New Zealand → Oceania → World → *
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Exact match** | Returns value immediately |
| **Missing key** | Walks hierarchy up to `*` or returns `undefined` |
| **Circular fallback** | Detected via visited set, returns `undefined` |
| **Circular provider** | Detected via visited set, returns `undefined` |
| **No provider** | Uses prefix step-down + wildcard only |
| **No wildcard** | Returns `undefined` if nothing matches |
| **Arrays** | Not treated as config objects (returned as-is) |
| **`null` value** | Returned as-is (not undefined) |

---

## Exports

```typescript
// Core
export { RegionalConfigResolver } from './index';
export type { HierarchyProvider, ConfigEntry } from './index';

// Helpers
export { composeProviders, fromMap } from './hierarchy';
```

---

## License

MIT
