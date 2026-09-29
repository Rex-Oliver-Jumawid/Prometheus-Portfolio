import { spawnSync } from "node:child_process";
import { writeFile, rename } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { workdir: { type: "string" } } });

// Preserve the checked-in contract if generation fails; never redirect over it.
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "supabase",
    "gen",
    "types",
    "typescript",
    "--local",
    ...(values.workdir ? ["--workdir", values.workdir] : []),
  ],
  {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000,
  },
);
if (result.status !== 0 || !result.stdout?.includes("export type Database")) {
  console.error(
    "Database type generation failed. Start local Supabase and check its health. Existing types were preserved.",
  );
  process.exitCode = 1;
} else {
  const path = "src/types/database.generated.ts";
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, result.stdout.trimEnd() + "\n", { flag: "wx" });
  await rename(temporary, path);
  console.log("Generated local database types.");
}
