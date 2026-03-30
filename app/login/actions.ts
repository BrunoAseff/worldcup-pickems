"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/auth/login-schema";
import { createUserSession, deleteCurrentSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { routes } from "@/lib/routes";

export type LoginActionState = {
  error: string | null;
  fieldErrors: {
    username?: string[];
    password?: string[];
  };
};

export const loginAction = async (
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Revise os campos e tente novamente.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const username = parsed.data.username.toLowerCase();
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(and(eq(users.username, username), eq(users.isActive, true)))
    .limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return {
      error: "Usuário ou senha inválidos.",
      fieldErrors: {},
    };
  }

  await createUserSession(user.id);
  redirect("/");
};

export const logoutAction = async () => {
  await deleteCurrentSession();
  redirect(routes.login);
};
