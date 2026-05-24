"use client";

import { useState, FormEvent, useRef } from "react";

export default function SendPage() {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const payload: Record<string, any> = { to, body };
    if (file) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });
      payload.media = { base64, mimetype: file.type, filename: file.name };
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setStatus("success");
      setMessage(`Message sent to ${to}`);
      setTo("");
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send");
    }
  }

  function removeFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Send Message</h1>
        <p className="mt-1 text-sm text-zinc-500">Compose and send a WhatsApp message with optional media.</p>
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
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-y"
            placeholder="Type your message here..."
          />
          <p className="mt-1 text-xs text-zinc-400">{body.length} characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Media (optional)</label>
          <div className="mt-1.5 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Choose file
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.*,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && (
              <div className="flex items-center gap-2 rounded-lg bg-[#DCF8C6]/50 px-3 py-2 text-xs text-[#075E54]">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button type="button" onClick={removeFile} className="ml-1 text-zinc-400 hover:text-red-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-400">Supports images, PDFs, and documents.</p>
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