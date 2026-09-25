"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestAgain } from "@/app/(protected)/actions";

export function RequestAgainButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await requestAgain();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Skickar..." : "Skicka ny förfrågan"}
      </button>
    </div>
  );
}
