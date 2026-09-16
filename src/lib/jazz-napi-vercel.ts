import { readFileSync } from "node:fs";
import path from "node:path";

import {
  initSync,
  mintLocalFirstToken as mintWasmLocalFirstToken,
  nativeArtifactFingerprint,
  WasmDb,
} from "jazz-wasm";

const jazzWasmBinary = path.join(
  process.cwd(),
  "node_modules",
  "jazz-wasm",
  "pkg",
  "jazz_wasm_bg.wasm"
);

initSync({ module: readFileSync(jazzWasmBinary) });

export const NapiDb = WasmDb;
export { nativeArtifactFingerprint };

export function mintLocalFirstToken(
  seed: string,
  audience: string,
  ttlSeconds: number
) {
  return mintWasmLocalFirstToken(
    seed,
    audience,
    ttlSeconds,
    BigInt(Math.floor(Date.now() / 1000))
  );
}
