"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/logga-in");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md px-3 py-2 text-sm font-medium text-current hover:bg-black/10"
    >
      Logga ut
    </button>
  );
}
