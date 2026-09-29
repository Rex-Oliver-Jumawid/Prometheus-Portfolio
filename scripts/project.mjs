import { readFile, writeFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
    .max(50),
  supportEmail: z.email(),
  portBase: z.coerce.number().int().min(1024).max(65472).default(59320),
});

export async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export function configuredPorts(config) {
  return [
    ...config.matchAll(/^(?:port|shadow_port|inspector_port) = (\d+)$/gm),
  ].map((match) => Number(match[1]));
}

export function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once("error", () => resolvePort(false));
    server.listen(port, "127.0.0.1", () =>
      server.close(() => resolvePort(true)),
    );
  });
}

export function dockerPublishedPorts(output) {
  return new Set(
    [...output.matchAll(/:(\d+)->/g)].map((match) => Number(match[1])),
  );
}

export async function checkPorts(ports) {
  const docker = spawnSync("docker", ["ps", "--format", "{{.Ports}}"], {
    encoding: "utf8",
    timeout: 15000,
  });
  const published = dockerPublishedPorts(docker.stdout ?? "");
  const available = await Promise.all(ports.map(portAvailable));
  return {
    dockerChecked: docker.status === 0,
    occupied: ports.filter(
      (port, index) => !available[index] || published.has(port),
    ),
  };
}

export async function planProject(root, input) {
  const project = projectSchema.parse(input);
  if (await exists(resolve(root, "template-project.json"))) {
    throw new Error(
      "Project already initialized. Edit its configuration directly; initialization is one-time.",
    );
  }
  const read = (path) => readFile(resolve(root, path), "utf8");
  const pkg = JSON.parse(await read("package.json"));
  if (pkg.name !== "business-app-starter") {
    throw new Error(
      "Initialize a fresh template copy; this package has already been renamed.",
    );
  }
  const version = z
    .string()
    .regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/)
    .parse((await read("TEMPLATE_VERSION")).trim());
  const originalConfig = await read("supabase/config.toml");
  const oldBase = Number(originalConfig.match(/^shadow_port = (\d+)$/m)?.[1]);
  if (!Number.isInteger(oldBase))
    throw new Error("Cannot identify the local Supabase port family.");
  const config = originalConfig
    .replace(/^project_id = ".*"$/m, `project_id = "${project.slug}"`)
    .replace(
      /^(port|shadow_port|inspector_port) = (\d+)$/gm,
      (_, key, port) => {
        const next = Number(port) - oldBase + project.portBase;
        if (next < 1024 || next > 65535)
          throw new Error("Port family is out of range.");
        return `${key} = ${next}`;
      },
    );
  const env = (await read(".env.example")).replace(
    /^NEXT_PUBLIC_SUPABASE_URL=.*$/m,
    `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${project.portBase + 1}`,
  );
  const brand = {
    name: project.name,
    shortName: project.name,
    description: `Business workspace for ${project.name}.`,
    logo: {
      mark: project.name
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 3)
        .toUpperCase(),
      label: project.name,
    },
    supportEmail: project.supportEmail,
  };
  const files = new Map([
    [
      "package.json",
      JSON.stringify({ ...pkg, name: project.slug }, null, 2) + "\n",
    ],
    ["supabase/config.toml", config],
    [
      "src/config/app.ts",
      `export const appConfig = ${JSON.stringify(brand, null, 2)} as const;\n`,
    ],
    [".env.example", env],
    [
      "README.md",
      (await read("README.md")).replace(/^# .*$/m, () => `# ${project.name}`),
    ],
  ]);
  const preservesEnv = await exists(resolve(root, ".env.local"));
  if (!preservesEnv) files.set(".env.local", env);
  // Write the marker last so it records completed initialization only.
  files.set(
    "template-project.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        ...project,
        templateVersion: version,
        initializedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  // Never follow a file symlink while configuring a repository.
  for (const path of files.keys()) {
    const absolute = resolve(root, path);
    if ((await exists(absolute)) && !(await lstat(absolute)).isFile()) {
      throw new Error(`Expected a regular file: ${path}`);
    }
  }
  return { files, ports: configuredPorts(config), preservesEnv };
}

export async function applyProject(root, plan) {
  for (const [path, content] of plan.files) {
    await writeFile(resolve(root, path), content, {
      flag:
        path === ".env.local" || path === "template-project.json" ? "wx" : "w",
      ...(path === ".env.local" ? { mode: 0o600 } : {}),
    });
  }
}
