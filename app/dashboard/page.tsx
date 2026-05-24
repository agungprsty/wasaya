"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState({ messages: 0, contacts: 0, sent: 0, failed: 0 });
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/messages?limit=1").then((r) => r.json().catch(() => ({}))),
      fetch("/api/contacts?limit=1").then((r) => r.json().catch(() => ({}))),
      fetch("/api/settings").then((r) => r.json().catch(() => ({}))),
    ]).then(([msgData, contactData, settingsData]) => {
      setStats({
        messages: msgData.total || 0,
        contacts: contactData.total || contactData.contacts?.length || 0,
        sent: 0,
        failed: 0,
      });
      setWebhookUrl(settingsData.settings?.webhookUrl || "");
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">Your account at a glance.</p>
      </div>

      <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Messages", value: String(stats.messages), change: "", color: "text-[#25D366]" },
          { title: "Contacts", value: String(stats.contacts), change: "", color: "text-[#075E54]" },
          { title: "Sent", value: String(stats.sent), change: "", color: "text-[#25D366]" },
          { title: "Failed", value: String(stats.failed), change: "", color: "text-red-500" },
        ].map((card) => (
          <div key={card.title} className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <p className="text-sm font-medium text-zinc-500">{card.title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[#075E54]">{card.value}</p>
              {card.change && <span className={`text-sm font-medium ${card.color}`}>{card.change}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-base font-semibold text-[#075E54]">Quick Start</h2>
          <ul className="mt-5 space-y-4">
            {[
              { label: "Add contacts", done: stats.contacts > 0 },
              { label: "Send your first message", done: stats.messages > 0 },
              { label: "Configure webhook", done: !!webhookUrl },
            ].map((item, i) => (
              <li key={item.label} className="flex items-center gap-3">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${item.done ? "bg-[#DCF8C6] text-[#075E54]" : "border border-zinc-300 text-zinc-400"}`}>
                  {item.done ? "✓" : i + 1}
                </div>
                <span className={`text-sm ${item.done ? "text-zinc-400 line-through" : "text-zinc-700"}`}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-base font-semibold text-[#075E54]">Account Info</h2>
          <div className="mt-5 space-y-3 text-sm text-zinc-600">
            <p>Webhook: {webhookUrl ? "✅ Configured" : "—"}</p>
            <p>Messages sent: {stats.messages}</p>
            <p>Contacts saved: {stats.contacts}</p>
          </div>
        </div>
      </div>
    </div>
  );
}