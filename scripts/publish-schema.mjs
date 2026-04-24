import { loadCompiledSchema } from "../node_modules/jazz-tools/dist/schema-loader.js";
import { publishStoredSchema } from "../node_modules/jazz-tools/dist/runtime/schema-fetch.js";

const DEFAULT_SERVER_URL = "https://v2.sync.jazz.tools/";
const serverUrl =
  process.env.JAZZ_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_JAZZ_SERVER_URL?.trim() ||
  DEFAULT_SERVER_URL;
const adminSecret =
  process.env.JAZZ_ADMIN_SECRET?.trim() ||
  (isLocalJazzServerUrl(serverUrl) ? "TEST_SECRET" : null);

if (!adminSecret) {
  throw new Error(
    "Missing JAZZ_ADMIN_SECRET. Set it to your Jazz Cloud admin secret before publishing the schema."
  );
}

const compiled = await loadCompiledSchema(process.cwd());

const result = await publishStoredSchema(serverUrl, {
  adminSecret,
  schema: compiled.wasmSchema,
});

console.log(result);

function isLocalJazzServerUrl(url) {
  return url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:");
}
