import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRuntimeDir = path.join(rootDir, "public", "jazz-runtime");

const jazzToolsPackagePath = require.resolve("jazz-tools/package.json");
const jazzToolsPackageDir = path.dirname(jazzToolsPackagePath);
const jazzToolsRequire = createRequire(jazzToolsPackagePath);

const workerSourceDir = path.join(jazzToolsPackageDir, "dist", "worker");
const runtimeSourceDir = path.join(jazzToolsPackageDir, "dist", "runtime");
const driversSourceDir = path.join(jazzToolsPackageDir, "dist", "drivers");
const jazzWasmPkgDir = path.dirname(jazzToolsRequire.resolve("jazz-wasm"));

const workerTargetDir = path.join(publicRuntimeDir, "worker");
const runtimeTargetDir = path.join(publicRuntimeDir, "runtime");
const driversTargetDir = path.join(publicRuntimeDir, "drivers");
const pkgTargetDir = path.join(publicRuntimeDir, "pkg");

const workerTargetPath = path.join(workerTargetDir, "jazz-worker.js");

async function copyDir(source, target) {
  const sourceStat = await stat(source);

  if (sourceStat.isDirectory()) {
    await mkdir(target, { recursive: true });
    const entries = await readdir(source, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const nextSource = path.join(source, entry.name);
        const nextTarget = path.join(target, entry.name);
        await copyDir(nextSource, nextTarget);
      })
    );

    return;
  }

  if (
    !source.endsWith(".js") &&
    !source.endsWith(".wasm")
  ) {
    return;
  }

  if (
    source.includes(".test.") ||
    source.endsWith(".map")
  ) {
    return;
  }

  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);

  if (target.endsWith(".js")) {
    const contents = await readFile(target, "utf8");
    const withoutSourceMapComment = contents.replace(
      /\n?\/\/# sourceMappingURL=.*$/gm,
      ""
    );

    if (withoutSourceMapComment !== contents) {
      await writeFile(target, withoutSourceMapComment, "utf8");
    }
  }
}

async function rewriteWorkerImports() {
  const source = await readFile(workerTargetPath, "utf8");
  const rewritten = source.replaceAll('"jazz-wasm"', '"../pkg/jazz_wasm.js"');

  if (rewritten !== source) {
    await writeFile(workerTargetPath, rewritten, "utf8");
  }
}

await rm(publicRuntimeDir, { recursive: true, force: true });
await mkdir(publicRuntimeDir, { recursive: true });

await Promise.all([
  copyDir(workerSourceDir, workerTargetDir),
  copyDir(runtimeSourceDir, runtimeTargetDir),
  copyDir(driversSourceDir, driversTargetDir),
  copyDir(jazzWasmPkgDir, pkgTargetDir),
]);

await rewriteWorkerImports();
