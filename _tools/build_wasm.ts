import { parse } from "@std/toml";
import { resolve } from "@std/path";
import { parseArgs } from "@std/cli";

import denoConfig from "../deno.json" with { type: "json" };

const cliArgs = parseArgs(Deno.args, {
  "boolean": ["check", "fail-fast"],
  string: ["project"],
  collect: ["project"],
});

const rawCargo = Deno.readTextFileSync("./_wasm/Cargo.toml");

const parsedCargo = parse(rawCargo) as { workspace: { members: string[] } };

const members = cliArgs.project
  ? parsedCargo.workspace.members.filter((m) => cliArgs.project.includes(m))
  : parsedCargo.workspace.members;

let didFail = false;

for (const member of members) {
  const [folder] = member.split("_");
  const outPath = resolve(
    folder,
    "_wasm",
  );

  const args: string[] = [
    "run",
    "-A",
    denoConfig.imports["@deno/wasmbuild"],
    "--js-ext",
    "mjs",
    "--inline",
    "--project",
    member,
    "--out",
    outPath,
  ];

  if (cliArgs.check) {
    args.push("--check");
  }

  const command = new Deno.Command(Deno.execPath(), {
    args: args,
    cwd: "./_wasm",
  });
  const child = command.spawn();
  const status = await child.status;
  if (!status.success) {
    didFail = true;
  }
  if (cliArgs["fail-fast"] && didFail) {
    Deno.exit(1);
  }
}

Deno.exit(didFail ? 1 : 0);
