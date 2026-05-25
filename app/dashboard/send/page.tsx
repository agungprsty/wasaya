"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { extractVariables, interpolate } from "@/lib/template-utils";

interface Template {
  id: string;
  name: string;
  body: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
}

export default function SendPage() {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json().catch(() => ({ templates: [] })))
      .then((data) => setTemplates(data.templates || []));
    fetch("/api/contacts?all=true")
      .then((r) => r.json().catch(() => ({ contacts: [] })))
      .then((data) => setContacts(data.contacts || []));
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
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = search
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search),
      )
    : contacts;

  function fillContactVars(contact: Contact, template: Template | null, existing: Record<string, string>) {
    if (!template) return existing;
    const updated = { ...existing };
    const vars = extractVariables(template.body);
    if (vars.includes("name") && !updated.name) updated.name = contact.name;
    if (vars.includes("phone") && !updated.phone) updated.phone = contact.phone;
    return updated;
  }

  function selectContact(c: Contact) {
    setTo(c.phone);
    setSelectedContact(c);
    setShowDropdown(false);
    setSearch("");
    if (selectedTemplate) {
      const filled = fillContactVars(c, selectedTemplate, variableValues);
      setVariableValues(filled);
      setBody(interpolate(selectedTemplate.body, filled));
    }
  }

  function handleToChange(value: string) {
    setTo(value);
    setSearch(value);
    setShowDropdown(true);
    setActiveIndex(-1);
  }

  function handleToFocus() {
    if (contacts.length > 0) {
      setSearch(to);
      setShowDropdown(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectContact(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  function handleSelectTemplate(t: Template) {
    setSelectedTemplate(t);
    const vars = extractVariables(t.body);
    const initial: Record<string, string> = {};
    vars.forEach((v) => { initial[v] = ""; });
    const filled = selectedContact ? fillContactVars(selectedContact, t, initial) : initial;
    setVariableValues(filled);
    setBody(interpolate(t.body, filled));
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    if (scheduleMode) {
      try {
        const recipients = selectedContact
          ? [{ to: selectedContact.phone, name: selectedContact.name }]
          : [{ to }];

        const res = await fetch("/api/scheduler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients, body, scheduledAt: new Date(scheduledAt + ":00").toISOString() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to schedule");

        setStatus("success");
        setMessage(`Message scheduled for ${new Date(scheduledAt + ":00").toLocaleString("id-ID")}`);
        setTo("");
        setBody("");
        setFile(null);
        setSelectedTemplate(null);
        setSelectedContact(null);
        setVariableValues({});
        setScheduleMode(false);
        setScheduledAt("");
        if (fileRef.current) fileRef.current.value = "";
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to schedule");
      }
      return;
    }

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
      setSelectedTemplate(null);
      setSelectedContact(null);
      setVariableValues({});
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

  const currentVariables = selectedTemplate ? extractVariables(selectedTemplate.body) : [];
  const allFilled = currentVariables.length > 0 && currentVariables.every((v) => variableValues[v]?.trim());

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Send Message</h1>
        <p className="mt-1 text-sm text-zinc-500">Compose and send a WhatsApp message with optional media.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Recipient with contact search */}
        <div className="relative" ref={dropdownRef}>
          <label htmlFor="to" className="block text-sm font-medium text-zinc-700">
            Recipient number
          </label>
          <div className="relative mt-1.5">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <input
              ref={inputRef}
              id="to"
              type="text"
              required
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              onFocus={handleToFocus}
              onKeyDown={handleKeyDown}
              className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              placeholder="+628123456789 or search contact..."
            />
            {to && (
              <button
                type="button"
                onClick={() => { setTo(""); setSearch(""); setSelectedContact(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-400">Include country code (e.g. +62 for Indonesia). Must be 7-15 digits.</p>

          {showDropdown && contacts.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-xs text-zinc-400">No contacts match &quot;{search}&quot;</div>
              ) : (
                <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
                  {filtered.map((c, i) => (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={activeIndex === i}
                      onMouseDown={() => selectContact(c)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        activeIndex === i ? "bg-[#DCF8C6]/40 text-[#075E54]" : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCF8C6] text-xs font-semibold text-[#075E54]">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-2 text-zinc-400">{c.phone}</span>
                      </div>
                      {to === c.phone && (
                        <svg className="h-4 w-4 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""} saved
              </div>
            </div>
          )}
        </div>

        {/* Templates */}
        {templates.length > 0 && (
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-5 transition-all">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#075E54]">
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  Templates
                </span>
              </h2>
              {selectedTemplate && (
                <button type="button" onClick={clearTemplate} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                    onClick={() => handleSelectTemplate(t)}
                    className={`group relative rounded-lg border px-4 py-2.5 text-left text-xs font-medium transition-all ${
                      isActive
                        ? "border-[#25D366] bg-[#DCF8C6] text-[#075E54] shadow-sm"
                        : "border-[#DCF8C6] text-zinc-600 hover:border-[#25D366] hover:text-[#075E54] hover:bg-[#DCF8C6]/30"
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

        {/* Template Variables */}
        {currentVariables.length > 0 && (
          <div className="rounded-xl border border-[#DCF8C6] bg-[#f0fdf4] p-5 transition-all">
            <div className="flex items-center gap-1.5 mb-3">
              <svg className="h-4 w-4 text-[#075E54]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              <h2 className="text-sm font-semibold text-[#075E54]">
                Template Variables
              </h2>
              {allFilled && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  All set
                </span>
              )}
            </div>
            <div className="space-y-3">
              {currentVariables.map((v) => (
                <div key={v} className="group">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    <span className="inline-flex items-center rounded bg-[#DCF8C6] px-1.5 py-0.5 font-mono text-[10px] text-[#075E54]">
                      {'{{'}{v}{'}}'}
                    </span>
                    <span className="capitalize">{v}</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      value={variableValues[v] || ""}
                      onChange={(e) => handleVariableChange(v, e.target.value)}
                      className="block w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 pr-8 text-sm transition-colors focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                      placeholder={`Enter ${v}...`}
                    />
                    {variableValues[v]?.trim() && (
                      <svg className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="body" className="block text-sm font-medium text-zinc-700">
              Message
            </label>
            <span className="text-xs text-zinc-400">{body.length} characters</span>
          </div>
          <textarea
            id="body"
            rows={5}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (selectedTemplate) {
                const unsetVars = extractVariables(e.target.value);
                if (unsetVars.length === 0) setSelectedTemplate(null);
              }
            }}
            className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-y"
            placeholder="Type your message here..."
          />
        </div>

        {/* Media */}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Media (optional)</label>
          <div className="mt-1.5">
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#DCF8C6] bg-[#f0fdf4] px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DCF8C6]">
                  <svg className="h-5 w-5 text-[#075E54]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{file.name}</p>
                  <p className="text-xs text-zinc-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button type="button" onClick={removeFile} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-600 transition-colors hover:border-[#25D366] hover:bg-[#DCF8C6]/20">
                <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Attach image, PDF, or document
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.*,text/plain"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
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
        )}

        {/* Status Messages */}
        {status === "success" && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message}
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {message}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={status === "sending"}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? (
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
                {scheduleMode ? "Schedule Message" : "Send Message"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
