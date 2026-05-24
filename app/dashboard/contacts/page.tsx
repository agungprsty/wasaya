"use client";

import { FormEvent, useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

interface WaContact {
  name: string;
  number: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [waContacts, setWaContacts] = useState<WaContact[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [waSearch, setWaSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  function fetchContacts(p?: number) {
    setLoading(true);
    const pg = p ?? page;
    fetch(`/api/contacts?page=${pg}&limit=${limit}`)
      .then((res) => res.json().catch(() => ({ contacts: [], total: 0, totalPages: 1 })))
      .then((data) => {
        setContacts(data.contacts || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(pg);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchContacts(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (res.ok) {
      setName("");
      setPhone("");
      setShowForm(false);
      fetchContacts();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
    fetchContacts();
  }

  function closeImport() {
    setShowImport(false);
    setWaSearch("");
  }

  async function openImport() {
    setImportMsg("");
    const statusRes = await fetch("/api/whatsapp/status");
    const statusData = await statusRes.json();
    if (statusData.session?.status !== "connected") {
      setImportMsg("WhatsApp is not connected. Please connect first.");
      return;
    }
    setWaLoading(true);
    setShowImport(true);
    const res = await fetch("/api/whatsapp/contacts");
    const data = await res.json();
    setWaContacts(res.ok ? data.contacts || [] : []);
    setWaLoading(false);
    setSelected(new Set());
    setWaSearch("");
    if (!res.ok) {
      setImportMsg("Failed to fetch WhatsApp contacts.");
    }
  }

  const filteredWa = waSearch
    ? waContacts.filter(
        (c) =>
          c.name.toLowerCase().includes(waSearch.toLowerCase()) ||
          c.number.includes(waSearch),
      )
    : waContacts;

  function toggleSelect(number: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  function toggleSelectAll() {
    if (filteredWa.every((c) => selected.has(c.number))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredWa.map((c) => c.number)));
    }
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true);
    setImportMsg("");
    const selectedContacts = waContacts
      .filter((c) => selected.has(c.number))
      .map((c) => ({ name: c.name, phone: c.number }));
    const res = await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts: selectedContacts }),
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      closeImport();
      fetchContacts();
    } else {
      setImportMsg(data.error || "Import failed.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#075E54]">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your contact list.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openImport}
            className="flex h-10 items-center gap-2 rounded-xl border border-[#25D366] px-5 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Import
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1DAF5A]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Contact
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-[#DCF8C6] bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="+628123456789"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex h-10 items-center rounded-lg bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1DAF5A]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-10 items-center rounded-lg border border-zinc-200 px-5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-[#DCF8C6] bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Loading...</div>
        ) : total === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">No contacts yet. Add your first contact.</div>
        ) : (
          <>
            <div className="divide-y divide-[#DCF8C6]">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCF8C6] text-sm font-semibold text-[#075E54]">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                      <p className="text-sm text-zinc-500">{c.phone}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-sm text-zinc-400 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#DCF8C6] px-6 py-3">
                <p className="text-xs text-zinc-400">
                  Page {page} of {totalPages} ({total} contacts)
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => fetchContacts(page - 1)}
                    disabled={page <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-zinc-600 hover:bg-[#DCF8C6]/40 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="contents">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="flex h-8 w-8 items-center justify-center text-xs text-zinc-300">...</span>
                        )}
                        <button
                          onClick={() => fetchContacts(p)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                            p === page
                              ? "bg-[#25D366] text-white"
                              : "text-zinc-600 hover:bg-[#DCF8C6]/40"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => fetchContacts(page + 1)}
                    disabled={page >= totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-zinc-600 hover:bg-[#DCF8C6]/40 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-[#075E54]">Import from WhatsApp</h2>
              <button onClick={closeImport} className="text-zinc-400 hover:text-zinc-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {waContacts.length > 0 && (
              <div className="space-y-3 border-b px-6 py-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    type="text"
                    value={waSearch}
                    onChange={(e) => setWaSearch(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 py-2 pl-9 pr-3 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-zinc-600">
                    <input
                      type="checkbox"
                      checked={filteredWa.length > 0 && selected.size === filteredWa.length}
                      onChange={toggleSelectAll}
                      className="rounded border-zinc-300 text-[#25D366] focus:ring-[#25D366]"
                    />
                    Select all ({filteredWa.length})
                  </label>
                  <span className="text-sm text-zinc-400">{selected.size} selected</span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-2">
              {waLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                  </svg>
                  Loading contacts...
                </div>
              ) : waContacts.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">
                  No new contacts found. All your WhatsApp contacts are already imported.
                </p>
              ) : filteredWa.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">
                  No contacts match your search.
                </p>
              ) : (
                filteredWa.map((c) => (
                  <label
                    key={c.number}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-3 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.number)}
                      onChange={() => toggleSelect(c.number)}
                      className="rounded border-zinc-300 text-[#25D366] focus:ring-[#25D366]"
                    />
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCF8C6] text-sm font-semibold text-[#075E54]">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{c.name}</p>
                      <p className="text-sm text-zinc-500">{c.number}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {importMsg && (
              <div className="px-6 pb-2 text-sm text-red-500">{importMsg}</div>
            )}

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button
                onClick={closeImport}
                className="flex h-10 items-center rounded-lg border border-zinc-200 px-5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1DAF5A] disabled:opacity-50"
              >
                {importing && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                  </svg>
                )}
                {importing ? "Importing..." : `Import Selected (${selected.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
