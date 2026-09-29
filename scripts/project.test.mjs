import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  planProject,
  applyProject,
  projectSchema,
  dockerPublishedPorts,
} from "./project.mjs";

const options = {
  name: 'Acme "Inventory"',
  slug: "acme-inventory",
  supportEmail: "support@acme.example",
  portBase: 59420,
};

test("Docker port mappings include host allocations hidden by a virtualized runtime", () => {
  assert.deepEqual(
    [
      ...dockerPublishedPorts(
        "0.0.0.0:59322->5432/tcp, [::]:59322->5432/tcp\n127.0.0.1:59421->8000/tcp",
      ),
    ],
    [59322, 59421],
  );
});

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "template-init-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src/config"), { recursive: true });
  await mkdir(join(root, "supabase"));
  for (const path of [
    "package.json",
    "README.md",
    ".env.example",
    "TEMPLATE_VERSION",
    "src/config/app.ts",
    "supabase/config.toml",
  ]) {
    await writeFile(
      join(root, path),
      await readFile(new URL(`../${path}`, import.meta.url)),
    );
  }
  // A consumer has already renamed its package. Test a fresh template fixture.
  const packagePath = join(root, "package.json");
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  await writeFile(packagePath, JSON.stringify({ ...pkg, name: "business-app-starter" }));
  return root;
}

test("preview changes nothing; apply configures consistent client identity and ports", async (t) => {
  const root = await fixture(t);
  const original = await readFile(join(root, "package.json"), "utf8");
  const plan = await planProject(root, options);
  assert.equal(await readFile(join(root, "package.json"), "utf8"), original);
  await applyProject(root, plan);
  assert.equal(
    JSON.parse(await readFile(join(root, "package.json"), "utf8")).name,
    options.slug,
  );
  assert.match(
    await readFile(join(root, "supabase/config.toml"), "utf8"),
    /project_id = "acme-inventory"/,
  );
  assert.match(
    await readFile(join(root, ".env.local"), "utf8"),
    /127\.0\.0\.1:59421/,
  );
  assert.match(
    await readFile(join(root, "src/config/app.ts"), "utf8"),
    /Acme \\"Inventory\\"/,
  );
  assert.equal(
    JSON.parse(await readFile(join(root, "template-project.json"), "utf8"))
      .templateVersion,
    (await readFile(join(root, "TEMPLATE_VERSION"), "utf8")).trim(),
  );
  await assert.rejects(planProject(root, options), /already initialized/);
});

test("initialization preserves existing local environment byte for byte", async (t) => {
  const root = await fixture(t);
  const existing = "# operator configuration\nPRIVATE_VALUE=keep-me\n";
  await writeFile(join(root, ".env.local"), existing);
  const plan = await planProject(root, options);
  assert.equal(plan.preservesEnv, true);
  await applyProject(root, plan);
  assert.equal(await readFile(join(root, ".env.local"), "utf8"), existing);
});

test("invalid slugs and out-of-range port families are rejected", () => {
  for (const input of [
    { slug: "../other" },
    { portBase: 65500 },
    { supportEmail: "invalid" },
  ]) {
    assert.equal(
      projectSchema.safeParse({ ...options, ...input }).success,
      false,
    );
  }
});
