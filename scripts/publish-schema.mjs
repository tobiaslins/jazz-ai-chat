import { loadCompiledSchema } from "../node_modules/jazz-tools/dist/schema-loader.js";
import { publishStoredSchema } from "../node_modules/jazz-tools/dist/runtime/schema-fetch.js";

const DEFAULT_SERVER_URL = "http://127.0.0.1:1625";
const serverUrl =
  process.env.JAZZ_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_JAZZ_SERVER_URL?.trim() ||
  DEFAULT_SERVER_URL;
const adminSecret = process.env.JAZZ_ADMIN_SECRET?.trim() || "TEST_SECRET";

const compiled = await loadCompiledSchema(process.cwd());

const result = await publishStoredSchema(serverUrl, {
  adminSecret,
  schema: compiled.wasmSchema,
});

console.log(result);
