"use client";

import { FormEvent, useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  body: string;
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  function fetchTemplates() {
    setLoading(true);
    fetch("/api/templates")
      .then((r) => r.json().catch(() => ({ templates: [] })))
      .then((d) => setTemplates(d.templates || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchTemplates(); }, []);

  function resetForm() {
    setName("");
    setBody("");
    setEditId(null);
    setShowForm(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;

    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/templates?id=${editId}` : "/api/templates";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), body: body.trim() }),
    });
    if (res.ok) {
      resetForm();
      fetchTemplates();
    }
  }

  function handleEdit(t: Template) {
    setEditId(t.id);
    setName(t.name);
    setBody(t.body);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    fetchTemplates();
  }

  async function copyBody(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#075E54]">Message Templates</h1>
          <p className="mt-1 text-sm text-zinc-500">Save reusable message templates for broadcasts.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1DAF5A]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Template
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-8 rounded-xl border border-[#DCF8C6] bg-white p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Template name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="e.g. Order Confirmation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Message body</label>
              <textarea
                required
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-y"
                placeholder="Hi {{name}}, your order #{{order_id}} has been confirmed!"
              />
              <p className="mt-1 text-xs text-zinc-400">Use {"{{variable}}"} for dynamic placeholders.</p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1DAF5A]">
                Save
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
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">No templates yet. Create your first one.</div>
        ) : (
          <div className="divide-y divide-[#DCF8C6]">
            {templates.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">{t.name}</p>
                    <p className="mt-1 text-sm text-zinc-500 whitespace-pre-wrap line-clamp-2">{t.body}</p>
                    <p className="mt-1 text-xs text-zinc-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => copyBody(t.body)} className="text-xs text-zinc-400 hover:text-[#25D366]" title="Copy body">
                      Copy
                    </button>
                    <button onClick={() => handleEdit(t)} className="text-xs text-zinc-400 hover:text-[#25D366]" title="Edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-zinc-400 hover:text-red-500" title="Delete">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}