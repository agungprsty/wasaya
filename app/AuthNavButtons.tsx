"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AuthNavButtons() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json().catch(() => null))
      .then((d) => setAuthed(!!d?.user))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (authed) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center justify-center rounded-full bg-[#25D366] px-6 text-sm font-medium text-white transition-colors hover:bg-[#1DAF5A]"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-[#075E54]">
        Sign In
      </Link>
      <Link
        href="/register"
        className="inline-flex h-10 items-center justify-center rounded-full bg-[#25D366] px-6 text-sm font-medium text-white transition-colors hover:bg-[#1DAF5A]"
      >
        Get Started
      </Link>
    </div>
  );
}