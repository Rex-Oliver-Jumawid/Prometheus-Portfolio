import { parseArgs } from "node:util";
import { planProject, applyProject, checkPorts } from "./project.mjs";

try {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      slug: { type: "string" },
      "support-email": { type: "string" },
      "port-base": { type: "string" },
      apply: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      'pnpm template:init --name "Acme Inventory" --slug acme-inventory --support-email support@acme.example [--port-base 59420] [--apply]\nPreviews by default. Run in a fresh client repository after installing dependencies.',
    );
  } else {
    const plan = await planProject(process.cwd(), {
      name: values.name,
      slug: values.slug,
      supportEmail: values["support-email"],
      portBase: values["port-base"],
    });
    console.log(
      `Files to configure:\n${[...plan.files.keys()].map((path) => `  ${path}`).join("\n")}`,
    );
    if (plan.preservesEnv)
      console.log(
        "Existing .env.local will be preserved. Run doctor to check its values.",
      );
    if (values.apply) {
      const { occupied, dockerChecked } = await checkPorts(plan.ports);
      if (!dockerChecked)
        console.log(
          "WARN Docker port allocations could not be inspected. Start Docker and run template:doctor before starting Supabase.",
        );
      if (occupied.length)
        throw new Error(
          `Ports unavailable: ${occupied.join(", ")}. Choose another --port-base (reserve a block of 100 ports).`,
        );
      await applyProject(process.cwd(), plan);
      console.log(
        "Initialized. Review git diff, fill docs/business-context.md, then run pnpm db:start, set the Publishable key in .env.local, and run pnpm template:doctor. Hosted setup: docs/operations.md.",
      );
    } else {
      console.log(
        "Preview only. Add --apply to write these files; no services or hosted projects are created.",
      );
    }
  }
} catch (error) {
  console.error(
    error.name === "ZodError"
      ? "Invalid options. Use --help; provide a name, kebab-case slug, valid support email, and valid port base."
      : error.message,
  );
  process.exitCode = 1;
}
