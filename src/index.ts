/**
 * @leadertechie/regional-config-resolver
 *
 * Logic-only engine for hierarchical configuration resolution.
 * Storage-agnostic (no KV/R2 dependency) and hierarchy-agnostic
 * (uses Dependency Injection for standards like UN-M49).
 *
 * @example
 * ```ts
 * import { getParent } from "@leadertechie/geo-hierarchy-un-m49";
 * import { RegionalConfigResolver } from "@leadertechie/regional-config-resolver";
 *
 * const resolver = new RegionalConfigResolver(kvData, getParent);
 * const mode = resolver.resolve("AU-PER"); // Walks: AU-PER -> AU -> Oceania -> World -> *
 * ```
 */

import { LoggerInterface } from "@leadertechie/telemetry";
import getDefaultLogger from "./telemetry-init";

/**
 * Function type that provides a parent key for a given child key.
 * Allows integration with standard datasets like UN-M49 or ISO-3166.
 */
export type HierarchyProvider = (key: string) => string | undefined;

/**
 * Entry in the data map. Can be a raw value or an object with manual fallback.
 */
export type ConfigEntry<T> = T | { value?: T; fallback?: string };

export class RegionalConfigResolver<T> {
  private data: Record<string, ConfigEntry<T>>;
  private provider?: HierarchyProvider;

  /**
   * @param data - Flat record of keys (regions, countries, codes) to values.
   * @param provider - Optional function to resolve parent keys using standard hierarchies.
   *
   * @example
   * ```ts
   * import { getParent } from "@leadertechie/geo-hierarchy-un-m49";
   * const resolver = new RegionalConfigResolver(kvData, getParent);
   * const mode = resolver.resolve("AU-PER"); // Walks: AU-PER -> AU -> Oceania -> World -> *
   * ```
   */
  constructor(data: Record<string, ConfigEntry<T>>, provider?: HierarchyProvider) {
    this.data = data;
    this.provider = provider;
  }

  /**
   * Resolve a value for the given key by walking the hierarchy.
   *
   * Resolution Strategy:
   * 1. Check local data for the current key.
   * 2. If data has 'value', return it.
   * 3. If data has 'fallback', jump to that key and repeat.
   * 4. If not found in data, ask the HierarchyProvider for a parent key.
   * 5. If provider has no parent, use Prefix Step-down (hyphen splitting).
   * 6. Fallback to global wildcard (*).
   */
  resolve(key: string, logger?: LoggerInterface): T | undefined {
    let currentKey: string | undefined = key;
    const visited = new Set<string>();

    while (currentKey && !visited.has(currentKey)) {
      visited.add(currentKey);
      const entry: ConfigEntry<T> | undefined = this.data[currentKey];

      // A. Match found in local data
      if (entry !== undefined) {
        if (this.isConfigObject(entry)) {
          if (entry.value !== undefined) return entry.value;
          if (entry.fallback) {
            currentKey = entry.fallback;
            continue;
          }
        } else {
          return entry as T;
        }
      }

      // B. Consult external Hierarchy Provider (e.g. UN-M49)
      const nextFromProvider: string | undefined = this.provider?.(currentKey);
      if (nextFromProvider) {
        currentKey = nextFromProvider;
        continue;
      }

      // C. Convention-based Prefix step-down (e.g. "AU-WA-PER" -> "AU-WA")
      if (currentKey.includes("-")) {
        currentKey = currentKey.substring(0, currentKey.lastIndexOf("-"));
      } else if (currentKey !== "*") {
        currentKey = "*";
      } else {
        currentKey = undefined;
      }
    }
    const log = logger ?? getDefaultLogger("regional-config-resolver");
    log.warn(`Config resolution failed for key: ${key}`);
    return undefined;
  }

  private isConfigObject(entry: any): entry is { value?: T; fallback?: string } {
    return typeof entry === 'object' && entry !== null && !Array.isArray(entry);
  }
}
