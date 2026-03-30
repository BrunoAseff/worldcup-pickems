"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { loginAction, type LoginActionState } from "@/app/login/actions";
import { loginSchema } from "@/lib/auth/login-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialLoginState: LoginActionState = {
  error: null,
  fieldErrors: {},
};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialLoginState);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState({
    username: "",
    password: "",
  });
  const [clientFieldErrors, setClientFieldErrors] = useState<{
    username?: string[];
    password?: string[];
  }>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      setClientFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setClientFieldErrors({});

    const formData = new FormData();
    formData.set("username", parsed.data.username);
    formData.set("password", parsed.data.password);

    startTransition(() => {
      formAction(formData);
    });
  };

  const usernameError = clientFieldErrors.username?.[0] ?? state.fieldErrors.username?.[0];
  const passwordError = clientFieldErrors.password?.[0] ?? state.fieldErrors.password?.[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Usuário</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={values.username}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
        />
        {usernameError ? <p className="text-sm text-destructive">{usernameError}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={values.password}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            className="pr-11"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
      </div>

      {state.error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
