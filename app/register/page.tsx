"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      let data;
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen font-sans">
      {/* Left panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#075E54] p-12 lg:flex">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white/90">
            <svg className="h-6 w-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WAGateway
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Why businesses choose us
            </h2>
            <ul className="space-y-4">
              {[
                { label: "Bulk Messaging", desc: "Send thousands of messages in seconds with real-time delivery tracking." },
                { label: "Smart Automation", desc: "Auto-replies, scheduled broadcasts, and custom workflows." },
                { label: "Detailed Analytics", desc: "Track opens, clicks, and conversions with live dashboards." },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-sm text-white/60">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 select-none">
          <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full border border-white/5" />
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full border border-white/5" />
          <div className="absolute right-16 top-1/3 h-2 w-2 rounded-full bg-[#25D366]/50" />
          <div className="absolute bottom-1/4 left-1/4 h-1.5 w-1.5 rounded-full bg-[#DCF8C6]/30" />
          <div className="absolute right-1/4 top-1/2 h-2 w-2 rounded-full bg-white/20" />
          <div className="absolute left-12 top-1/3 h-3 w-16 rounded-full bg-white/5" />
          <div className="absolute right-8 bottom-1/3 h-2 w-24 rounded-full bg-white/5" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#075E54]">
              <svg className="h-6 w-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WAGateway
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-[#075E54]">
              Create your account
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Start sending messages in minutes. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="Create a strong password"
              />
            </div>

            <label className="flex items-start gap-2.5 text-sm text-zinc-500">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#25D366] focus:ring-[#25D366]/30"
              />
              <span>
                I agree to the{" "}
                <a href="#" className="font-medium text-[#075E54] transition-colors hover:text-[#25D366]">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="font-medium text-[#075E54] transition-colors hover:text-[#25D366]">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p className="text-center text-sm text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-[#075E54] transition-colors hover:text-[#25D366]">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}