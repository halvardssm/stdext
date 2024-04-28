/**
 * This script updates the version of the workspaces in the deno.json file.
 *
 * If the VERSION environment variable is set, it will update the version
 * to that value, and also update the main config file.
 */

import meta from "../deno.json" with { type: "json" };
import { join, resolve } from "@std/path";

async function updateMetaVersion(filepath: string, version: string) {
  const content = await Deno.readTextFile(filepath);
  const metaConfig = JSON.parse(content);
  metaConfig.version = version;
  await Deno.writeTextFile(
    filepath,
    JSON.stringify(metaConfig, null, 2) + "\n",
  );
}

const { workspaces } = meta;

const version = Deno.env.get("VERSION");

if (!version) {
  throw new Error("VERSION environment variable is required");
}

for (const workspace of workspaces) {
  const workspacePath = resolve(workspace);
  const workspaceConfigPath = join(workspacePath, "deno.json");
  await updateMetaVersion(workspaceConfigPath, version);
}
