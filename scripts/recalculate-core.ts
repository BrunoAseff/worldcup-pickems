import "./lib/load-env";
import { recalculateApplicationCore } from "@/lib/recalculation/core";

const parseArgument = (name: string) => {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));

  return entry ? entry.slice(prefix.length) : undefined;
};

const triggeredByUserId = parseArgument("triggered-by");

const main = async () => {
  if (!triggeredByUserId) {
    throw new Error("Usage: pnpm recalculate:core --triggered-by=<admin-user-id>");
  }

  const value = await recalculateApplicationCore(triggeredByUserId);
  console.log(value);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
