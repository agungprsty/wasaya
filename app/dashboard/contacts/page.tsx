"use client";

import { FormEvent, useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showForm, setShowForm] = useState(false);

  function fetchContacts() {
    setLoading(true);
    fetch("/api/contacts")
      .then((res) => res.json().catch(() => ({ contacts: [] })))
      .then((data) => setContacts(data.contacts || []))
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

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#075E54]">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your contact list.</p>
        </div>
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
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">No contacts yet. Add your first contact.</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}