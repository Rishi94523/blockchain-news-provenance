import { keccak256, stringToHex } from "viem";

import type { ArticleContent } from "./types.js";

export interface CanonicalRevisionPayload extends ArticleContent {
  publisherId: string;
  revisionNumber: number;
  previousHash: string;
}

function stableSortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSortValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = stableSortValue(
          (value as Record<string, unknown>)[key]
        );
        return accumulator;
      }, {});
  }

  return value;
}

export function canonicalizeRevisionPayload(
  payload: CanonicalRevisionPayload
): string {
  return JSON.stringify(stableSortValue(payload));
}

export function hashRevisionPayload(payload: CanonicalRevisionPayload): string {
  const canonical = canonicalizeRevisionPayload(payload);
  return keccak256(stringToHex(canonical));
}
