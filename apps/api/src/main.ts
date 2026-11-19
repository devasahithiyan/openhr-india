import { createApp } from "./app";
async function main() {
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0");
}
void main().catch(() => {
  console.error(
    "API startup failed. Check database and environment configuration.",
  );
  process.exit(1);
});
