import { parse } from "@std/toml";
import { resolve } from "@std/path";

const isCheck = Deno.args.some((a) => a === "--check");
const failFast = Deno.args.some((a) => a === "--fail-fast");

const rawCargo = Deno.readTextFileSync("./_wasm/Cargo.toml");

const parsedCargo = parse(rawCargo) as { workspace: { members: string[] } };

let didFail = false;

for (const member of parsedCargo.workspace.members) {
  const [folder] = member.split("_");
  const outPath = resolve(
    folder,
    "_wasm",
  );

  const args: string[] = [
    "run",
    "-A",
    "jsr:@deno/wasmbuild@0.17.1",
    "--js-ext",
    "mjs",
    "--sync",
    "--project",
    member,
    "--out",
    outPath,
  ];

  if (isCheck) {
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
  if (failFast && didFail) {
    Deno.exit(1);
  }
}

Deno.exit(didFail ? 1 : 0);
