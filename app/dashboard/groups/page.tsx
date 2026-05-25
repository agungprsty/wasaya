"use client";

import { FormEvent, useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface Group {
  id: string;
  name: string;
  contacts: { contact: Contact }[];
}

const LIMIT = 10;

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  function fetchGroups(p?: number) {
    const pg = p ?? page;
    fetch(`/api/groups?page=${pg}&limit=${LIMIT}`)
      .then((r) => r.json().catch(() => ({ groups: [], total: 0, totalPages: 1 })))
      .then((d) => {
        setGroups(d.groups || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
        setPage(pg);
      });
  }

  function fetchContacts() {
    fetch("/api/contacts?all=true")
      .then((r) => r.json().catch(() => ({ contacts: [] })))
      .then((d) => setContacts(d.contacts || []));
  }

  function loadAll() {
    setLoading(true);
    Promise.all([fetchGroups(), fetchContacts()]).finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  function resetForm() {
    setName("");
    setSelectedContacts([]);
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(group: Group) {
    setEditId(group.id);
    setName(group.name);
    setSelectedContacts(group.contacts.map((c) => c.contact.id));
    setShowForm(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const body = { name: name.trim(), contactIds: selectedContacts };
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/groups?id=${editId}` : "/api/groups";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      resetForm();
      fetchGroups();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/groups?id=${id}`, { method: "DELETE" });
    fetchGroups();
  }

  function toggleContact(id: string) {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#075E54]">Contact Groups</h1>
          <p className="mt-1 text-sm text-zinc-500">Organize contacts into groups for easier broadcasting.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1DAF5A]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Group
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-8 rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-[#075E54]">{editId ? "Edit Group" : "New Group"}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Group name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="e.g. VIP Customers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Contacts</label>
              {contacts.length === 0 ? (
                <p className="text-sm text-zinc-400">No contacts available.</p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                  {contacts.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                        selectedContacts.includes(c.id) ? "bg-[#DCF8C6]" : "hover:bg-zinc-50"
                      }`}
                    >
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
              <p className="mt-1 text-xs text-zinc-400">{selectedContacts.length} selected</p>
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

      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">No groups yet. Create your first group.</div>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-[#DCF8C6] bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#075E54]">{g.name}</h3>
                  <p className="text-xs text-zinc-400">{g.contacts.length} contacts</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleEdit(g)} className="text-xs text-zinc-400 hover:text-[#25D366]">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="text-xs text-zinc-400 hover:text-red-500">
                    Delete
                  </button>
                </div>
              </div>
              {g.contacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {g.contacts.map((cg) => (
                    <span key={cg.contact.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#DCF8C6] px-3 py-1 text-xs text-[#075E54]">
                      {cg.contact.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => fetchGroups(page - 1)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages} ({total} groups)
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => fetchGroups(page + 1)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
