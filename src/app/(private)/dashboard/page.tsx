"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteSessionAction } from "@/modules/sessions/sessions-actions";

export default function DashboardPage() {
  const [isPending, startTransition] = useTransition();

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 16 }}>Dashboard</h1>
      <Button
        type="button"
        variant="destructive"
        disabled={isPending}
        onClick={() => startTransition(() => deleteSessionAction())}
      >
        {isPending ? "Signing out…" : "Sign out"}
      </Button>
    </main>
  );
}
