"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { extractVariables, interpolate } from "@/lib/template-utils";
import { useDashboard } from "../dashboard-context";

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

interface MsgResult {
  to: string;
  status: string;
  error?: string;
}

export default function BroadcastPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [manualNumbers, setManualNumbers] = useState("");
  const [groups, setGroups] = useState<{ id: string; name: string; contacts: { contact: Contact }[] }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{ sent: number; total: number } | null>(null);
  const [results, setResults] = useState<MsgResult[] | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState("daily");
  const [recurInterval, setRecurInterval] = useState(1);
  const [maxRepeats, setMaxRepeats] = useState<number | null>(null);

  // Fetch WhatsApp groups for group sending
  const [waGroups, setWaGroups] = useState<{ id: string; name: string; participants: number }[]>([]);
  const [selectedWaGroup, setSelectedWaGroup] = useState("");

  const progressRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const { subscription, settings, loading: ctxLoading } = useDashboard();
  const tier = subscription?.tier ?? "free";
  const isFree = tier === "free";
  const broadcastEnabled = settings?.broadcastEnabled ?? false;
  const blocked = isFree || !broadcastEnabled;
  const blockedReason = isFree
    ? "Mass broadcast is available on Pro tier and above."
    : "Broadcast is disabled. Enable it in the Advanced settings.";

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts?all=true").then((r) => r.json().catch(() => ({ contacts: [] }))),
      fetch("/api/templates").then((r) => r.json().catch(() => ({ templates: [] }))),
      fetch("/api/groups").then((r) => r.json().catch(() => ({ groups: [] }))),
      fetch("/api/whatsapp/groups").then((r) => r.json().catch(() => ({ groups: [] }))),
    ]).then(([c, t, g, wg]) => {
      setContacts(c.contacts || []);
      setTemplates(t.templates || []);
      setGroups(g.groups || []);
      setWaGroups(wg.groups || []);
    });
  }, []);

  // Auto-trigger scheduled message processing
  useEffect(() => {
    const check = () => {
      fetch("/api/cron/process-scheduled", { method: "POST" }).catch(() => {});
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
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
    setSelectedTemplate(t);
    const vars = extractVariables(t.body);
    const initial: Record<string, string> = {};
    vars.forEach((v) => { initial[v] = ""; });
    setVariableValues(initial);
    setBody(t.body);
  }

  function clearTemplate() {
    setSelectedTemplate(null);
    setVariableValues({});
  }

  function handleVariableChange(key: string, value: string) {
    const updated = { ...variableValues, [key]: value };
    setVariableValues(updated);
    if (selectedTemplate) {
      setBody(interpolate(selectedTemplate.body, updated));
    }
  }

  function parseManualNumbers(): string[] {
    return manualNumbers
      .split(/[\n,; ]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function getSelectedContactMap(): Map<string, Contact> {
    const map = new Map<string, Contact>();
    for (const c of contacts) {
      if (selectedContacts.includes(c.id)) map.set(c.phone, c);
    }
    return map;
  }

  function prepareMessages(): { to: string; body: string }[] {
    const msgs: { to: string; body: string }[] = [];
    const contactMap = getSelectedContactMap();
    const manualPhones = parseManualNumbers();

    // Contacts with personalization
    for (const c of contactMap.values()) {
      let msgBody = body;
      if (selectedTemplate) {
        const merged = { ...variableValues };
        const vars = extractVariables(selectedTemplate.body);
        if (vars.includes("name") && !variableValues.name) merged.name = c.name;
        if (vars.includes("phone") && !variableValues.phone) merged.phone = c.phone;
        msgBody = interpolate(selectedTemplate.body, merged);
      }
      msgs.push({ to: c.phone, body: msgBody });
    }

    // Manual numbers (skip duplicates with contacts)
    const contactPhones = new Set(contactMap.keys());
    for (const to of manualPhones) {
      if (!contactPhones.has(to)) msgs.push({ to, body });
    }

    // WhatsApp Group
    if (selectedWaGroup) {
      msgs.push({ to: selectedWaGroup, body });
    }

    return msgs;
  }

  function getRecipients(): string[] {
    return prepareMessages().map((m) => m.to);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const messages = prepareMessages();
    if (!messages.length || !body.trim()) return;

    if (scheduleMode) {
      setSending(true);
      try {
        const recipients = messages.map((m) => {
          const c = contacts.find((c) => c.phone === m.to);
          return { to: m.to, name: c?.name };
        });
        const payload: Record<string, unknown> = {
          recipients, body,
          scheduledAt: new Date(scheduledAt + ":00").toISOString(),
        };
        if (recurring) {
          payload.isRecurring = true;
          payload.recurrence = recurrence;
          payload.interval = recurInterval;
          if (maxRepeats != null && maxRepeats > 0) payload.maxRepeats = maxRepeats;
        }
        const res = await fetch("/api/scheduler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to schedule");
        setResults([]);
        setBody("");
        setSelectedContacts([]);
        setManualNumbers("");
        setSelectedTemplate(null);
        setVariableValues({});
        setScheduleMode(false);
        setScheduledAt("");
        setRecurring(false);
        setRecurrence("daily");
        setRecurInterval(1);
        setMaxRepeats(null);
      } catch {
        setResults([]);
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    setResults(null);
    setSendingProgress({ sent: 0, total: messages.length });

    // Animate estimated progress (1 msg per ~1.2s)
    progressRef.current = setInterval(() => {
      setSendingProgress((prev) =>
        prev && prev.sent < prev.total
          ? { ...prev, sent: Math.min(prev.sent + 1, prev.total) }
          : prev
      );
    }, 1200);

    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json().catch(() => ({}));
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      if (progressRef.current) clearInterval(progressRef.current);
      setSending(false);
      setSendingProgress(null);
    }
  }

  const currentVariables = selectedTemplate ? extractVariables(selectedTemplate.body) : [];
  const summary = results
    ? {
        total: results.length,
        sent: results.filter((r) => r.status === "sent").length,
        pending: results.filter((r) => r.status === "pending").length,
        failed: results.filter((r) => r.status === "failed").length,
      }
    : null;

  const recipientCount = getRecipients().length;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Broadcast</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Send a message to multiple recipients at once.
          {selectedTemplate && currentVariables.includes("name") && " {{name}} fills from each contact."}
        </p>
      </div>

      {!ctxLoading && blocked && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
          <svg className="mx-auto h-10 w-10 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <h2 className="mt-3 text-lg font-semibold text-zinc-800">Broadcast Unavailable</h2>
          <p className="mt-1 text-sm text-zinc-500">{blockedReason}</p>
          {isFree && (
            <a
              href="/pricing"
              className="mt-4 inline-flex items-center rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1DAF5A]"
            >
              View Pro Plan
            </a>
          )}
          {!isFree && !broadcastEnabled && (
            <a
              href="/dashboard/advanced"
              className="mt-4 inline-flex items-center rounded-xl border border-[#25D366] px-5 py-2.5 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/5"
            >
              Open Advanced Settings
            </a>
          )}
        </div>
      )}

      {(!blocked || ctxLoading) && (
      <form onSubmit={handleSend} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#075E54]">Contacts</h2>
              <div className="flex items-center gap-2">
                {groups.length > 0 && (
                  <>
                    <label className="text-xs text-zinc-500">Contact group:</label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => {
                        const gid = e.target.value;
                        setSelectedGroup(gid);
                        if (gid) {
                          const g = groups.find((gr) => gr.id === gid);
                          if (g) setSelectedContacts(g.contacts.map((cg) => cg.contact.id));
                        }
                      }}
                      className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-600 focus:border-[#25D366] focus:outline-none"
                    >
                      <option value="">All contacts</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </>
                )}
                {contacts.length > 0 && (
                  <button type="button" onClick={selectAll} className="text-xs text-[#075E54] hover:text-[#25D366]">
                    {selectedContacts.length === contacts.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
            </div>
            {contacts.length === 0 ? (
              <p className="text-sm text-zinc-400">No contacts saved.</p>
            ) : (
              <div className="max-h-60 space-y-1 overflow-y-auto">
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
            <p className="mt-2 text-xs text-zinc-400">{selectedContacts.length} selected</p>
          </div>

          {waGroups.length > 0 && (
            <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
              <h2 className="text-sm font-semibold text-[#075E54]">Send to WhatsApp Group</h2>
              <select
                value={selectedWaGroup}
                onChange={(e) => setSelectedWaGroup(e.target.value)}
                className="mt-3 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              >
                <option value="">Select a group...</option>
                {waGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.participants} members)</option>
                ))}
              </select>
              {selectedWaGroup && (
                <p className="mt-1.5 text-xs text-zinc-400">
                  Message will be sent to the WhatsApp group chat
                </p>
              )}
            </div>
          )}

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

        {templates.length > 0 && (
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#075E54]">Use a template</h2>
              {selectedTemplate && (
                <button type="button" onClick={clearTemplate} className="text-xs text-zinc-400 hover:text-red-500">
                  Clear
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {templates.map((t) => {
                const isActive = selectedTemplate?.id === t.id;
                const varCount = extractVariables(t.body).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-[#25D366] bg-[#DCF8C6] text-[#075E54]"
                        : "border-[#DCF8C6] text-zinc-600 hover:border-[#25D366] hover:text-[#075E54]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {t.name}
                      {varCount > 0 && (
                        <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          isActive ? "bg-white/60 text-[#075E54]" : "bg-[#DCF8C6] text-zinc-500"
                        }`}>
                          {varCount} var
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentVariables.length > 0 && (
          <div className="rounded-xl border border-[#DCF8C6] bg-[#f0fdf4] p-6">
            <div className="flex items-center gap-1.5 mb-3">
              <svg className="h-4 w-4 text-[#075E54]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              <h2 className="text-sm font-semibold text-[#075E54]">Template Variables</h2>
            </div>
            <div className="space-y-3">
              {currentVariables.map((v) => {
                const isContactVar = v === "name" || v === "phone";
                return (
                  <div key={v}>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                      <span className="inline-flex items-center rounded bg-[#DCF8C6] px-1.5 py-0.5 font-mono text-[10px] text-[#075E54]">
                        {'{{'}{v}{'}}'}
                      </span>
                      <span className="capitalize">{v}</span>
                      {isContactVar && (
                        <span className="text-[10px] text-zinc-400">auto-filled per contact</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={variableValues[v] || ""}
                      onChange={(e) => handleVariableChange(v, e.target.value)}
                      disabled={isContactVar}
                      className={`mt-1 block w-full rounded-lg border bg-white px-3.5 py-2 text-sm transition-colors focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 ${
                        isContactVar
                          ? "border-zinc-100 bg-zinc-50 text-zinc-400 cursor-not-allowed"
                          : "border-zinc-200 focus:border-[#25D366]"
                      }`}
                      placeholder={isContactVar ? "Auto-filled from contact" : `Enter ${v}...`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-sm font-semibold text-[#075E54]">Message</h2>
          <textarea
            required
            rows={5}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (selectedTemplate) {
                const unsetVars = extractVariables(e.target.value);
                if (unsetVars.length === 0) setSelectedTemplate(null);
              }
            }}
            className="mt-3 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-y"
            placeholder="Type your message here..."
          />
          <p className="mt-1 text-xs text-zinc-400">
            Sending to {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
            {recipientCount > 0 && ` (approx. ${Math.ceil(recipientCount * 1.2)}s)`}
          </p>
        </div>

        {/* Schedule toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              onClick={() => { setScheduleMode(false); setScheduledAt(""); }}
              className={`relative h-7 rounded-full px-3 text-xs font-medium transition-colors ${
                !scheduleMode ? "bg-[#25D366] text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              Send now
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode(true)}
              className={`relative h-7 rounded-full px-3 text-xs font-medium transition-colors ${
                scheduleMode ? "bg-[#075E54] text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              <svg className="-ml-0.5 mr-1 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Schedule
            </button>
          </label>
        </div>

        {scheduleMode && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Send at</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRecurring(!recurring)}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  recurring ? "bg-purple-500" : "bg-zinc-200"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  recurring ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
              <span className="text-sm text-zinc-700">Repeat</span>
              {recurring && (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                  Recurring
                </span>
              )}
            </div>

            {recurring && (
              <div className="space-y-3 rounded-lg border border-purple-100 bg-purple-50/30 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Every</label>
                    <select
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value)}
                      className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                    >
                      <option value="hourly">Hour(s)</option>
                      <option value="daily">Day(s)</option>
                      <option value="weekly">Week(s)</option>
                      <option value="monthly">Month(s)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Interval</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={recurInterval}
                      onChange={(e) => setRecurInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Max repeats (optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={maxRepeats ?? ""}
                    onChange={(e) => setMaxRepeats(e.target.value ? parseInt(e.target.value) : null)}
                    className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <p className="text-xs text-zinc-400">
                  Message will repeat every {recurInterval} {recurrence.replace("ly", "").replace("lly", "")}{recurInterval > 1 ? "s" : ""}
                  {maxRepeats != null && `, up to ${maxRepeats} times`}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Progress indicator */}
        {sendingProgress && (
          <div className="rounded-xl border border-[#DCF8C6] bg-[#f0fdf4] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-medium text-[#075E54]">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending {Math.min(sendingProgress.sent, sendingProgress.total)} of {sendingProgress.total}
              </span>
              <span className="text-xs text-zinc-400">
                {Math.round((sendingProgress.sent / sendingProgress.total) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#DCF8C6]">
              <div
                className="h-full rounded-full bg-[#25D366] transition-all duration-500"
                style={{ width: `${Math.min((sendingProgress.sent / sendingProgress.total) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Estimated {(sendingProgress.total - sendingProgress.sent) * 1.2}s remaining
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={sending || recipientCount === 0 || !body.trim()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {sending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {scheduleMode ? "Scheduling..." : "Sending..."}
            </>
          ) : (
            <>
              {scheduleMode ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
              {scheduleMode ? "Schedule Broadcast" : `Send to ${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`}
            </>
          )}
        </button>
      </form>
      )}

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
