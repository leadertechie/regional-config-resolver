/**
 * Hierarchy helpers for RegionalConfigResolver.
 *
 * Provides a convenience function to compose a HierarchyProvider
 * from the @leadertechie/geo-hierarchy-un-m49 package with
 * additional custom mappings.
 */

import type { HierarchyProvider } from './index';

/**
 * Compose multiple hierarchy providers into one.
 * Providers are checked in order; the first non-undefined result wins.
 * Useful for merging UN-M49 with custom overrides.
 *
 * @example
 * ```ts
 * import { getParent } from "@leadertechie/geo-hierarchy-un-m49";
 * import { composeProviders } from "@leadertechie/regional-config-resolver";
 *
 * const custom: HierarchyProvider = (key) => {
 *   if (key === "AU-PER") return "AU";
 *   return undefined;
 * };
 *
 * const provider = composeProviders(getParent, custom);
 * const resolver = new RegionalConfigResolver(data, provider);
 * ```
 */
export function composeProviders(...providers: HierarchyProvider[]): HierarchyProvider {
  return (key: string): string | undefined => {
    for (const provider of providers) {
      const result = provider(key);
      if (result !== undefined) return result;
    }
    return undefined;
  };
}

/**
 * Create a HierarchyProvider from a static map.
 * Useful for tests or simple custom hierarchies.
 *
 * @example
 * ```ts
 * import { fromMap } from "@leadertechie/regional-config-resolver";
 *
 * const provider = fromMap({
 *   "AU-PER": "AU",
 *   "AU": "Oceania",
 *   "Oceania": "World",
 * });
 * ```
 */
export function fromMap(map: Record<string, string>): HierarchyProvider {
  return (key: string): string | undefined => map[key];
}
