import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env"))
  throw new Error(".env already exists; refusing to replace encryption keys.");
const template = readFileSync(".env.example", "utf8").replace(
  "GENERATE_WITH_SETUP_ENV",
  randomBytes(32).toString("hex"),
);
writeFileSync(".env", template, { mode: 0o600 });
console.log(
  "Created local .env. Back up the encryption key securely before storing non-demo data.",
);
