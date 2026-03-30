import "./lib/load-env";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";

const parseArgument = (name: string) => {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));

  return entry ? entry.slice(prefix.length) : undefined;
};

const username = parseArgument("username")?.trim().toLowerCase();
const password = parseArgument("password");
const displayName = parseArgument("name")?.trim();
const roleSchema = z.enum(["player", "admin"]);
const parsedRole = roleSchema.safeParse(parseArgument("role"));

const main = async () => {
  if (!username || !password || !parsedRole.success) {
    throw new Error(
      "Usage: pnpm auth:create-user --username=<username> --password=<password> --role=<player|admin> [--name=<display-name>]",
    );
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const [{ db, postgresClient }, { users }] = await Promise.all([
    import("@/lib/db/client"),
    import("@/lib/db/schema"),
  ]);

  try {
    const now = new Date();
    const value = {
      username,
      displayName: displayName || username,
      passwordHash: hashPassword(password),
      role: parsedRole.data,
      isActive: true,
      updatedAt: now,
    };

    await db
      .insert(users)
      .values(value)
      .onConflictDoUpdate({
        target: users.username,
        set: value,
      });

    console.log(`User ${username} upserted with role ${parsedRole.data}`);
  } finally {
    await postgresClient.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
