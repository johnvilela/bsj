"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { createSessionAction } from "@/modules/sessions/sessions-actions";
import {
  type CreateSessionDTO,
  createSessionSchema,
} from "@/modules/sessions/sessions-types";

export const LoginForm = () => {
  const form = useForm<CreateSessionDTO>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: { email: "", password: "" },
  });

  const { execute, result, isExecuting } = useAction(createSessionAction);

  const serverError =
    result?.data && "error" in result.data ? result.data.error : null;

  return (
    <form
      onSubmit={form.handleSubmit((values) => execute(values))}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 320,
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          {...form.register("email")}
          style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        />
        {form.formState.errors.email && (
          <span style={{ color: "crimson" }}>
            {form.formState.errors.email.message}
          </span>
        )}
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
          style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        />
        {form.formState.errors.password && (
          <span style={{ color: "crimson" }}>
            {form.formState.errors.password.message}
          </span>
        )}
      </label>

      {serverError && <span style={{ color: "crimson" }}>{serverError}</span>}

      <Button type="submit" disabled={isExecuting}>
        {isExecuting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
};
