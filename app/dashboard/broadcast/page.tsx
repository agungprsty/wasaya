"use client";

import { useEffect, useState, FormEvent } from "react";

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
}

export default function BroadcastPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [manualNumbers, setManualNumbers] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ to: string; status: string }[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then((r) => r.json().catch(() => ({ contacts: [] }))),
      fetch("/api/templates").then((r) => r.json().catch(() => ({ templates: [] }))),
    ]).then(([c, t]) => {
      setContacts(c.contacts || []);
      setTemplates(t.templates || []);
    });
  }, []);

  function toggleContact(id: string) {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map((c) => c.id));
    }
  }

  function applyTemplate(t: Template) {
    setBody(t.body);
  }

  function parseManualNumbers(): string[] {
    return manualNumbers
      .split(/[\n,; ]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function getRecipients(): string[] {
    const fromContacts = contacts
      .filter((c) => selectedContacts.includes(c.id))
      .map((c) => c.phone);
    const fromManual = parseManualNumbers();
    return [...new Set([...fromContacts, ...fromManual])];
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const recipients = getRecipients();
    if (!recipients.length || !body.trim()) return;

    setSending(true);
    setResults(null);

    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, body: body.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSending(false);
    }
  }

  const summary = results
    ? {
        total: results.length,
        sent: results.filter((r) => r.status === "sent").length,
        pending: results.filter((r) => r.status === "pending").length,
        failed: results.filter((r) => r.status === "failed").length,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Broadcast</h1>
        <p className="mt-1 text-sm text-zinc-500">Send a message to multiple recipients at once.</p>
      </div>

      <form onSubmit={handleSend} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contacts selector */}
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#075E54]">Contacts</h2>
              {contacts.length > 0 && (
                <button type="button" onClick={selectAll} className="text-xs text-[#075E54] hover:text-[#25D366]">
                  {selectedContacts.length === contacts.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
            {contacts.length === 0 ? (
              <p className="text-sm text-zinc-400">No contacts saved.</p>
            ) : (
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {contacts.map((c) => (
                  <label key={c.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${selectedContacts.includes(c.id) ? "bg-[#DCF8C6]" : "hover:bg-zinc-50"}`}>
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-[#25D366] focus:ring-[#25D366]/30"
                    />
                    <span className="text-sm text-zinc-700">{c.name}</span>
                    <span className="ml-auto text-xs text-zinc-400">{c.phone}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-zinc-400">{selectedContacts.length} selected</p>
          </div>

          {/* Manual numbers */}
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <h2 className="text-sm font-semibold text-[#075E54]">Or enter numbers manually</h2>
            <textarea
              value={manualNumbers}
              onChange={(e) => setManualNumbers(e.target.value)}
              className="mt-3 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-none"
              rows={4}
              placeholder="+628123456789, +628987654321&#10;+62811222333; +62899888777&#10;Separate with commas, semicolons, spaces, or new lines"
            />
            {manualNumbers.trim() && (
              <p className="mt-1.5 text-xs text-zinc-400">{parseManualNumbers().length} number{parseManualNumbers().length !== 1 ? "s" : ""} parsed</p>
            )}
          </div>
        </div>

        {/* Templates */}
        {templates.length > 0 && (
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <h2 className="text-sm font-semibold text-[#075E54]">Use a template</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="rounded-lg border border-[#DCF8C6] px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-[#25D366] hover:text-[#075E54]"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message body */}
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-sm font-semibold text-[#075E54]">Message</h2>
          <textarea
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-3 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-y"
            placeholder="Type your message here..."
          />
          <p className="mt-1 text-xs text-zinc-400">
            Sending to {getRecipients().length} recipient{getRecipients().length !== 1 ? "s" : ""}
            {getRecipients().length > 0 && ` (approx. ${Math.ceil(getRecipients().length * 1.2)}s)`}
          </p>
        </div>

        <button
          type="submit"
          disabled={sending || getRecipients().length === 0 || !body.trim()}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {sending ? "Sending..." : `Send to ${getRecipients().length} recipient${getRecipients().length !== 1 ? "s" : ""}`}
        </button>
      </form>

      {/* Results */}
      {summary && (
        <div className="mt-8 rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-sm font-semibold text-[#075E54]">Results</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[#25D366]">{summary.sent}</p>
              <p className="text-xs text-zinc-500">Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{summary.pending}</p>
              <p className="text-xs text-zinc-500">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{summary.failed}</p>
              <p className="text-xs text-zinc-500">Failed</p>
            </div>
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600">Details</summary>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {results?.map((r, i) => (
                <p key={i} className="text-xs text-zinc-500">
                  {r.to}: <span className={r.status === "sent" ? "text-green-600" : r.status === "failed" ? "text-red-500" : "text-yellow-500"}>{r.status}</span>
                </p>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}