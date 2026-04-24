import { loadCompiledSchema } from "../node_modules/jazz-tools/dist/schema-loader.js";
import {
  fetchPermissionsHead,
  fetchSchemaHashes,
  fetchStoredWasmSchema,
  publishStoredPermissions,
} from "../node_modules/jazz-tools/dist/runtime/schema-fetch.js";

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
    "Missing JAZZ_ADMIN_SECRET. Set it to your Jazz Cloud admin secret before pushing permissions."
  );
}

const compiled = await loadCompiledSchema(process.cwd());

if (!compiled.permissions || !compiled.permissionsFile) {
  throw new Error("No permissions.ts found for this app.");
}

const { hashes } = await fetchSchemaHashes(serverUrl, { adminSecret });
const storedSchemas = await Promise.all(
  hashes.map(async (hash) => ({
    hash,
    schema: (await fetchStoredWasmSchema(serverUrl, { adminSecret, schemaHash: hash })).schema,
  }))
);

const localSchema = normalizeSchema(compiled.wasmSchema);
const match = storedSchemas.find(({ schema }) =>
  JSON.stringify(normalizeSchema(schema)) === JSON.stringify(localSchema)
);

if (!match) {
  throw new Error(
    "No stored structural schema matches the local schema.ts. Publish the structural schema before pushing permissions."
  );
}

const { head: currentHead } = await fetchPermissionsHead(serverUrl, { adminSecret });
const { head: publishedHead } = await publishStoredPermissions(serverUrl, {
  adminSecret,
  schemaHash: match.hash,
  permissions: compiled.permissions,
  expectedParentBundleObjectId: currentHead?.bundleObjectId ?? null,
});

console.log(`Loaded structural schema from ${compiled.schemaFile}.`);
console.log(`Loaded current permissions from ${compiled.permissionsFile}.`);
console.log(`Resolved structural schema hash ${match.hash.slice(0, 12)}.`);

if (currentHead) {
  console.log(
    `Publishing from parent v${currentHead.version} on ${currentHead.schemaHash.slice(0, 12)}.`
  );
} else {
  console.log("Publishing first permissions head for this app.");
}

const nextHead = publishedHead ?? {
  schemaHash: match.hash,
  version: currentHead ? currentHead.version + 1 : 1,
};
console.log(`Published permissions head v${nextHead.version} on ${nextHead.schemaHash.slice(0, 12)}.`);

function normalizeSchema(schema) {
  return Object.fromEntries(
    Object.entries(schema)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([tableName, table]) => [
        tableName,
        {
          ...table,
          columns: [...table.columns]
            .map((column) => ({
              ...column,
              references: column.references ?? null,
            }))
            .sort((left, right) => left.name.localeCompare(right.name)),
        },
      ])
  );
}

function isLocalJazzServerUrl(url) {
  return url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:");
}
