"use client";

import { FormEvent, useEffect, useState } from "react";

interface Rule {
  id: string;
  name: string;
  keywords: string[];
  response: string;
  isActive: boolean;
  priority: number;
}

const LIMIT = 10;

export default function ChatbotPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [response, setResponse] = useState("");
  const [priority, setPriority] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  function fetchRules(p?: number) {
    setLoading(true);
    const pg = p ?? page;
    fetch(`/api/chatbot/rules?page=${pg}&limit=${LIMIT}`)
      .then((r) => r.json().catch(() => ({ rules: [], total: 0, totalPages: 1 })))
      .then((d) => {
        setRules(d.rules || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
        setPage(pg);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRules(); }, []);

  function resetForm() {
    setName("");
    setKeywords("");
    setResponse("");
    setPriority(0);
    setEditId(null);
    setShowForm(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !keywords.trim() || !response.trim()) return;

    const kwArray = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const body = { name: name.trim(), keywords: kwArray, response: response.trim(), priority };

    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/chatbot/rules?id=${editId}` : "/api/chatbot/rules";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      resetForm();
      fetchRules();
    }
  }

  async function handleToggle(rule: Rule) {
    await fetch(`/api/chatbot/rules?id=${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    fetchRules();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/chatbot/rules?id=${id}`, { method: "DELETE" });
    fetchRules();
  }

  function handleEdit(rule: Rule) {
    setEditId(rule.id);
    setName(rule.name);
    setKeywords(rule.keywords.join(", "));
    setResponse(rule.response);
    setPriority(rule.priority);
    setShowForm(true);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#075E54]">Chatbot Rules</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Auto-reply to incoming messages with keyword-based rules.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1DAF5A]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-8 rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-[#075E54]">{editId ? "Edit Rule" : "New Rule"}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Rule name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="e.g. Greeting"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Keywords <span className="text-zinc-400">(comma separated)</span>
              </label>
              <input
                type="text"
                required
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="hello, hi, good morning"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Response</label>
              <textarea
                required
                rows={3}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-y"
                placeholder="Hi! Thanks for reaching out. How can we help you today?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Priority <span className="text-zinc-400">(1–10)</span>
              </label>
              <p className="mt-0.5 text-xs text-zinc-400">
                Lower number = higher priority. Rules with higher priority are evaluated first.
              </p>
              <input
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v < 1) setPriority(1);
                  else if (v > 10) setPriority(10);
                  else setPriority(v);
                }}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1DAF5A]">
                {editId ? "Update" : "Save"}
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-[#DCF8C6] bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">No rules yet. Create your first auto-reply rule.</div>
        ) : (
          <div className="divide-y divide-[#DCF8C6]">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-zinc-900">{rule.name}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${rule.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-zinc-400">P{rule.priority}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Keywords: {rule.keywords.join(", ")}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{rule.response}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`text-xs font-medium ${rule.isActive ? "text-yellow-600 hover:text-yellow-700" : "text-green-600 hover:text-green-700"}`}
                  >
                    {rule.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => handleEdit(rule)} className="text-xs text-zinc-400 hover:text-[#25D366]">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="text-xs text-zinc-400 hover:text-red-500">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => fetchRules(page - 1)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages} ({total} rules)
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => fetchRules(page + 1)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
