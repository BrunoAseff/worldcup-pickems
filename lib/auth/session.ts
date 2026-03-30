import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "./constants";

export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  role: "player" | "admin";
};

export type AuthSession = {
  sessionId: string;
  user: AuthenticatedUser;
  expiresAt: Date;
};

const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const getSessionCookieOptions = (expiresAt: Date) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires: expiresAt,
});

export const getCurrentSession = async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const now = new Date();
  const [record] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(sessionToken)),
        gt(sessions.expiresAt, now),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  if (!record) {
    return null;
  }

  return {
    sessionId: record.sessionId,
    expiresAt: record.expiresAt,
    user: {
      id: record.userId,
      username: record.username,
      displayName: record.displayName,
      role: record.role,
    },
  };
};

export const createUserSession = async (userId: string) => {
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash: hashSessionToken(sessionToken),
    expiresAt,
    updatedAt: new Date(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions(expiresAt));
};

export const deleteCurrentSession = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await db
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(sessionToken)));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
};

export const requireAuthenticatedUser = async () => {
  const session = await getCurrentSession();

  if (!session) {
    redirect(routes.login);
  }

  return session.user;
};

export const requireAdminUser = async () => {
  const user = await requireAuthenticatedUser();

  if (user.role !== "admin") {
    forbidden();
  }

  return user;
};
