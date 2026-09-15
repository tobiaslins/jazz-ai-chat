import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

if (
  process.platform === "linux" &&
  process.arch === "x64" &&
  !process.env.NAPI_RS_NATIVE_LIBRARY_PATH
) {
  try {
    process.env.NAPI_RS_NATIVE_LIBRARY_PATH = require.resolve(
      "@garden-co/jazz-napi-linux-x64-gnu"
    );
  } catch (error) {
    console.error(
      "Failed to resolve @garden-co/jazz-napi-linux-x64-gnu for Jazz NAPI.",
      error
    );
    process.exit(1);
  }
}

const next = spawn("next", ["build"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

next.on("exit", (code, signal) => {
  if (signal) {
    console.error(`next build exited with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

next.on("error", (error) => {
  console.error("Failed to start next build.", error);
  process.exit(1);
});
