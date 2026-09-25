"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteOwnAccount } from "@/app/(protected)/actions";

export function DeleteAccountButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleClick() {
    if (
      !confirm(
        "Är du säker på att du vill ta bort ditt konto? Detta går inte att ångra."
      )
    ) {
      return;
    }
    setPending(true);
    const result = await deleteOwnAccount();
    if (result.error) {
      alert(`Kunde inte ta bort kontot: ${result.error}`);
      setPending(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded-md px-3 py-2 text-sm font-medium text-red-100 hover:bg-black/10 disabled:opacity-50"
    >
      {pending ? "Tar bort..." : "Ta bort konto"}
    </button>
  );
}
