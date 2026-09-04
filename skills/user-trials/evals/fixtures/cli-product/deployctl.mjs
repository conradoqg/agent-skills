#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

if (command === "help" || command === "--help") {
  console.log(`deployctl - prepare and release services\n\nCommands:\n  preview --environment <name>  Preview a release\n  deploy --environment <name>   Release a service\n  history --environment <name>  Show recent releases`);
  process.exit(0);
}

if (command === "preview") {
  console.error("Unknown command: preview");
  console.error("Did you mean plan?");
  process.exit(1);
}

if (command === "plan") {
  const environment = valueAfter("--environment");
  if (!environment) {
    console.error("E_CFG_17");
    process.exit(2);
  }
  console.log(JSON.stringify({ environment, changes: 3, destructive: false, approvalRequired: true }));
  process.exit(0);
}

if (command === "history") {
  const environment = valueAfter("--environment") ?? "default";
  console.log(`ENVIRONMENT  VERSION  RESULT\n${environment}     2026.08  success`);
  process.exit(0);
}

if (command === "deploy") {
  console.error("Refusing fixture deployment: mutation is disabled in this test product.");
  process.exit(3);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
