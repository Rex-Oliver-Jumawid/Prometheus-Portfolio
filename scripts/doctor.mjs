import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { z } from "zod";
import { exists, configuredPorts, checkPorts } from "./project.mjs";

let failures = 0;
function report(ok, label, fix) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${!ok ? ` — ${fix}` : ""}`);
  if (!ok) failures++;
}
function command(bin, args) {
  return spawnSync(bin, args, { encoding: "utf8", timeout: 15000 });
}
try {
  const { values } = parseArgs({ options: { static: { type: "boolean" } } });
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  report(
    Number(process.versions.node.split(".")[0]) === 24,
    "Node.js 24",
    "Use the version in .nvmrc.",
  );
  const pnpm = command("pnpm", ["--version"]);
  report(
    pnpm.status === 0 && `pnpm@${pnpm.stdout.trim()}` === pkg.packageManager,
    "Pinned pnpm version",
    "Enable Corepack and install the packageManager version from package.json.",
  );
  report(
    await exists("node_modules"),
    "Dependencies installed",
    "Run pnpm install --frozen-lockfile.",
  );
  const config = await readFile("supabase/config.toml", "utf8");
  const authSection = config.match(/\[auth\]([\s\S]*?)(?=\n\[|$)/)?.[1] ?? "";
  const emailSection =
    config.match(/\[auth.email\]([\s\S]*?)(?=\n\[|$)/)?.[1] ?? "";
  report(
    /^enable_signup = false$/m.test(authSection),
    "Local public signup disabled",
    "Set global auth.enable_signup=false; also verify hosted Auth settings.",
  );
  report(
    /^enable_signup = true$/m.test(emailSection),
    "Local email login enabled",
    "Set auth.email.enable_signup=true while keeping global auth.enable_signup=false.",
  );
  const envPath =
    !values.static && (await exists(".env.local"))
      ? ".env.local"
      : ".env.example";
  if (!values.static && envPath === ".env.example")
    console.log(
      "WARN .env.local missing; initialize the client project or copy .env.example.",
    );
  const envText = await readFile(envPath, "utf8");
  const env = Object.fromEntries(
    [...envText.matchAll(/^([A-Z_]+)=(.*)$/gm)].map((match) => [
      match[1],
      match[2].trim().replace(/^(['"])(.*)\1$/, "$2"),
    ]),
  );
  const parsed = z
    .object({
      NEXT_PUBLIC_SITE_URL: z.url(),
      NEXT_PUBLIC_SUPABASE_URL: z.url(),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.static
        ? z.string()
        : z.string().min(1),
    })
    .safeParse(env);
  report(
    parsed.success,
    `Public environment shape (${envPath}; values hidden)`,
    "Set the three documented public variables; copy the project Publishable key from Supabase status into .env.local. Shell interpolation is not supported by doctor.",
  );
  if (values.static && !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    console.log(
      "WARN Example key is intentionally empty; configure .env.local before running the app.",
    );
  if (parsed.success) {
    const url = new URL(parsed.data.NEXT_PUBLIC_SUPABASE_URL);
    if (["127.0.0.1", "localhost"].includes(url.hostname)) {
      const apiPort = config.match(/\[api\][\s\S]*?^port = (\d+)$/m)?.[1];
      report(
        url.port === apiPort,
        "Local API port matches environment",
        "Update NEXT_PUBLIC_SUPABASE_URL to the api.port in supabase/config.toml.",
      );
    } else
      console.log(
        "WARN Hosted environment detected; doctor does not access hosted services or certify deployment settings.",
      );
  }
  const trackedEnv = command("git", ["ls-files", "--", ".env", ".env.*"]);
  report(
    trackedEnv.status === 0 &&
      trackedEnv.stdout
        .split("\n")
        .filter((path) => path && path !== ".env.example").length === 0,
    "Runtime environment files untracked",
    "Run inside the Git repository and remove runtime env files from Git tracking; rotate any committed secrets.",
  );
  if (!(await exists("template-project.json")))
    console.log(
      "WARN Template baseline has not been initialized as a client project.",
    );
  if (!values.static) {
    report(
      command("pnpm", ["exec", "supabase", "--version"]).status === 0,
      "Supabase CLI available",
      "Install dependencies; check local CLI permissions.",
    );
    const { occupied, dockerChecked } = await checkPorts(
      configuredPorts(config),
    );
    report(
      dockerChecked,
      "Docker runtime available",
      "Start your Docker-compatible runtime.",
    );
    console.log(
      occupied.length
        ? `WARN Ports in use or unavailable: ${occupied.join(", ")}. Expected if this project's Supabase is running; otherwise choose another port family.`
        : dockerChecked
          ? "PASS Local Supabase ports available"
          : "WARN Host ports available; Docker port allocations not verified",
    );
  }
  console.log(
    "Hosted signup, SMTP, backups, access revocation, and release checks remain in docs/operations.md.",
  );
  process.exitCode = failures ? 1 : 0;
} catch {
  console.error(
    "FAIL Doctor could not read project configuration. Run from the repository root with dependencies installed. No environment values were printed.",
  );
  process.exitCode = 1;
}
