"use client";

import { useState, FormEvent } from "react";

export default function SendPage() {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, body }),
      });

      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setStatus("success");
      setMessage(`Message sent to ${to}`);
      setTo("");
      setBody("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Send Message</h1>
        <p className="mt-1 text-sm text-zinc-500">Compose and send a WhatsApp message.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="to" className="block text-sm font-medium text-zinc-700">
            Recipient number
          </label>
          <input
            id="to"
            type="text"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
            placeholder="+628123456789"
          />
          <p className="mt-1 text-xs text-zinc-400">Include country code (e.g. +62 for Indonesia)</p>
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-zinc-700">
            Message
          </label>
          <textarea
            id="body"
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-y"
            placeholder="Type your message here..."
          />
          <p className="mt-1 text-xs text-zinc-400">{body.length} characters</p>
        </div>

        {status === "success" && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}
        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {status === "sending" ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}