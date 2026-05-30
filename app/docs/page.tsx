"use client";

import { useState } from "react";
import Link from "next/link";
import AuthNavButtons from "../AuthNavButtons";

const sections = [
  { id: "introduction", label: "Introduction" },
  { id: "authentication", label: "Authentication" },
  { id: "errors", label: "Errors" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "messages", label: "Messages" },
  { id: "broadcast", label: "Broadcast" },
  { id: "contacts", label: "Contacts" },
  { id: "templates", label: "Templates" },
  { id: "scheduler", label: "Scheduler" },
  { id: "settings", label: "Settings" },
  { id: "device", label: "WhatsApp Device" },
  { id: "api-keys", label: "API Keys" },
  { id: "webhooks", label: "Webhooks" },
];

function Method({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700",
    POST: "bg-green-100 text-green-700",
    PUT: "bg-orange-100 text-orange-700",
    DELETE: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${colors[method] || "bg-zinc-100 text-zinc-700"}`}>
      {method}
    </span>
  );
}

function Endpoint({ method, path, description }: { method: string; path: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#DCF8C6] bg-[#DCF8C6]/10 px-4 py-3">
      <Method method={method} />
      <div>
        <code className="text-sm font-mono text-[#075E54]">{path}</code>
        <p className="mt-0.5 text-sm text-zinc-600">{description}</p>
      </div>
    </div>
  );
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-zinc-900 text-sm text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2 text-xs text-zinc-400">
        <span>{lang || "bash"}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="hover:text-white transition-colors"
        >
          Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

function ParamTable({ params }: { params: { name: string; type: string; required: boolean; description: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs font-semibold text-zinc-500 uppercase">
            <th className="px-4 py-2.5">Parameter</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Required</th>
            <th className="px-4 py-2.5">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {params.map((p) => (
            <tr key={p.name} className="text-zinc-700">
              <td className="px-4 py-2.5 font-mono text-xs">{p.name}</td>
              <td className="px-4 py-2.5 text-xs">{p.type}</td>
              <td className="px-4 py-2.5 text-xs">{p.required ? <span className="text-red-500">Yes</span> : "No"}</td>
              <td className="px-4 py-2.5 text-xs">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("introduction");

  return (
    <div className="flex flex-col font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[#DCF8C6] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#075E54]">
            <svg className="h-7 w-7 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            TEMANWA
          </Link>
          <nav className="hidden items-center gap-8 sm:flex">
            <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-[#075E54]">Home</Link>
            <Link href="/docs" className="text-sm font-medium text-[#075E54]">API Docs</Link>
          </nav>
          <AuthNavButtons />
        </div>
      </header>

      {/* Docs content */}
      <div className="mx-auto flex w-full max-w-6xl px-6 py-10 gap-8">
        {/* Table of Contents sidebar */}
        <nav className="sticky top-24 hidden h-fit w-56 shrink-0 lg:block">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">On this page</h3>
          <ul className="space-y-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  className={`block rounded px-3 py-1.5 text-sm transition-colors ${
                    activeSection === s.id
                      ? "bg-[#DCF8C6] font-medium text-[#075E54]"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-[#075E54]">API Reference</h1>
          <p className="mt-2 text-zinc-600">
            Complete documentation for the TEMANWA REST API. All endpoints are accessible programmatically using your API keys.
          </p>

          {/* Introduction */}
          <section id="introduction" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Introduction</h2>
            <p className="mt-3 text-zinc-600 leading-relaxed">
              The TEMANWA API allows you to send and manage WhatsApp messages programmatically. You can integrate
              WhatsApp messaging into your own applications, automate notifications, broadcast messages to multiple
              recipients, schedule messages, and manage contacts — all through a simple REST interface.
            </p>
            <div className="mt-4 rounded-lg border border-[#DCF8C6] bg-[#DCF8C6]/10 px-4 py-3 text-sm text-zinc-700">
              <strong>Base URL:</strong>{" "}
              <code className="ml-1 rounded bg-white px-2 py-0.5 font-mono text-[#075E54]">https://your-domain.com/api</code>
              <br />
              <strong>Content-Type:</strong>{" "}
              <code className="ml-1 rounded bg-white px-2 py-0.5 font-mono text-[#075E54]">application/json</code>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Authentication</h2>
            <p className="mt-3 text-zinc-600 leading-relaxed">
              The API supports two authentication methods. API key auth is recommended for programmatic access.
            </p>

            <h3 className="mt-6 font-semibold text-zinc-800">Method 1: API Key (Recommended)</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Generate an API key from the{" "}
              <a href="/dashboard/keys" className="text-[#075E54] underline">API Keys</a>{" "}
              dashboard page. Include it in the <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">Authorization</code> header:
            </p>
            <div className="mt-2">
              <CodeBlock code={`curl -H "Authorization: Bearer wag_4f8c3a2b1d9e..." https://your-domain.com/api/messages`} />
            </div>

            <h3 className="mt-6 font-semibold text-zinc-800">Method 2: Session Cookie (Browser)</h3>
            <p className="mt-1 text-sm text-zinc-600">
              When logged into the dashboard, your browser automatically sends a JWT cookie. This method is intended for
              web dashboard use only.
            </p>
          </section>

          {/* Errors */}
          <section id="errors" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Errors</h2>
            <p className="mt-3 text-zinc-600 leading-relaxed">
              The API uses conventional HTTP response codes. All errors return a JSON object with an <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">error</code> field.
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left text-xs font-semibold text-zinc-500 uppercase">
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  <tr><td className="px-4 py-2.5 font-mono text-xs">400</td><td className="px-4 py-2.5 text-xs">Bad Request — Missing or invalid parameters</td></tr>
                  <tr><td className="px-4 py-2.5 font-mono text-xs">401</td><td className="px-4 py-2.5 text-xs">Unauthorized — Missing or invalid API key</td></tr>
                  <tr><td className="px-4 py-2.5 font-mono text-xs">404</td><td className="px-4 py-2.5 text-xs">Not Found — Resource not found</td></tr>
                  <tr><td className="px-4 py-2.5 font-mono text-xs">500</td><td className="px-4 py-2.5 text-xs">Internal Server Error</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <CodeBlock code={`// Error response format
{
  "error": "Description of what went wrong"
}`} />
            </div>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Rate Limits</h2>
            <p className="mt-3 text-zinc-600 leading-relaxed">
              To prevent spam and avoid WhatsApp bans, the following rate limits apply:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-zinc-600">
              <li><strong>Single message:</strong> No strict limit, but sending too quickly may trigger WhatsApp restrictions.</li>
              <li><strong>Broadcast:</strong> Enforced 1.2-second delay between each message (≈50 messages/minute).</li>
              <li><strong>Scheduled messages:</strong> Same 1.2-second delay per recipient when the batch is processed.</li>
            </ul>
          </section>

          {/* Messages */}
          <section id="messages" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Messages</h2>
            <p className="mt-2 text-sm text-zinc-600">Send and retrieve WhatsApp messages.</p>

            <div className="mt-4 space-y-2">
              <Endpoint method="GET" path="/api/messages" description="List messages with pagination and optional status filter." />
              <Endpoint method="POST" path="/api/messages" description="Send a single WhatsApp message." />
            </div>

            <h3 className="mt-6 font-semibold text-zinc-800">GET /api/messages</h3>
            <p className="mt-1 text-sm text-zinc-600">Query parameters:</p>
            <div className="mt-2">
              <ParamTable params={[
                { name: "page", type: "number", required: false, description: "Page number (default: 1)" },
                { name: "limit", type: "number", required: false, description: "Items per page (default: 20)" },
                { name: "status", type: "string", required: false, description: "Filter by status: pending, sent, delivered, failed" },
              ]} />
            </div>
            <div className="mt-3">
              <CodeBlock code={`// Response
{
  "messages": [
    {
      "id": "uuid",
      "to": "+628123456789",
      "from": "gateway",
      "body": "Hello from TEMANWA!",
      "status": "sent",
      "messageId": "wa_message_id",
      "mediaUrl": null,
      "createdAt": "2026-05-25T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}`} />
            </div>

            <h3 className="mt-6 font-semibold text-zinc-800">POST /api/messages</h3>
            <p className="mt-1 text-sm text-zinc-600">Request body:</p>
            <div className="mt-2">
              <ParamTable params={[
                { name: "to", type: "string", required: true, description: "Recipient phone number (include country code)" },
                { name: "body", type: "string", required: false, description: "Message text content" },
                { name: "media", type: "string (URL)", required: false, description: "URL of media attachment (image/document)" },
              ]} />
            </div>
            <div className="mt-3 space-y-2">
              <CodeBlock code={`curl -X POST https://your-domain.com/api/messages \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+628123456789", "body": "Hello from API!"}'`} />
              <CodeBlock code={`// Success (201)
{ "ok": true }

// WhatsApp disconnected — queued (202)
{
  "message": { "id": "uuid", "to": "+628123456789", ... },
  "warning": "WhatsApp not connected. Message queued."
}`} />
            </div>
          </section>

          {/* Broadcast */}
          <section id="broadcast" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Broadcast</h2>
            <p className="mt-2 text-sm text-zinc-600">Send a message to multiple recipients in one request.</p>

            <div className="mt-4 space-y-2">
              <Endpoint method="POST" path="/api/broadcast" description="Send a message to multiple recipients (rate-limited: 1 msg / 1.2s)." />
            </div>

            <div className="mt-4">
              <ParamTable params={[
                { name: "messages", type: "array", required: false, description: "Array of { to, body } objects (preferred format)" },
                { name: "recipients", type: "array", required: false, description: "Array of phone numbers (legacy, paired with body)" },
                { name: "body", type: "string", required: false, description: "Message body (used with legacy recipients)" },
              ]} />
            </div>
            <div className="mt-3 space-y-2">
              <CodeBlock code={`curl -X POST https://your-domain.com/api/broadcast \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"to": "+628123456789", "body": "Hello Alice!"},
      {"to": "+628987654321", "body": "Hello Bob!"}
    ]
  }'`} />
              <CodeBlock code={`// Response
{
  "results": [
    { "to": "+628123456789", "status": "sent" },
    { "to": "+628987654321", "status": "pending" }
  ],
  "summary": { "total": 2, "sent": 1, "pending": 1, "failed": 0 }
}`} />
            </div>
          </section>

          {/* Contacts */}
          <section id="contacts" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Contacts</h2>
            <p className="mt-2 text-sm text-zinc-600">Manage your contact list.</p>

            <div className="mt-4 space-y-2">
              <Endpoint method="GET" path="/api/contacts" description="List contacts with pagination, or fetch all with ?all=true." />
              <Endpoint method="POST" path="/api/contacts" description="Create a new contact." />
              <Endpoint method="DELETE" path="/api/contacts?id={id}" description="Delete a contact." />
              <Endpoint method="POST" path="/api/contacts/bulk" description="Bulk import contacts." />
            </div>

            <h3 className="mt-6 font-semibold text-zinc-800">GET /api/contacts</h3>
            <div className="mt-2">
              <ParamTable params={[
                { name: "page", type: "number", required: false, description: "Page number (default: 1)" },
                { name: "limit", type: "number", required: false, description: "Items per page (default: 10, max: 100)" },
                { name: "all", type: "boolean", required: false, description: "Set to true to fetch all contacts without pagination" },
              ]} />
            </div>
            <div className="mt-3">
              <CodeBlock code={`// Response
{
  "contacts": [
    { "id": "uuid", "name": "Alice", "phone": "+628123456789", "createdAt": "..." }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}`} />
            </div>

            <h3 className="mt-6 font-semibold text-zinc-800">POST /api/contacts</h3>
            <div className="mt-2">
              <ParamTable params={[
                { name: "name", type: "string", required: true, description: "Contact name" },
                { name: "phone", type: "string", required: true, description: "Phone number with country code" },
              ]} />
            </div>
            <div className="mt-3">
              <CodeBlock code={`curl -X POST https://your-domain.com/api/contacts \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Alice", "phone": "+628123456789"}'`} />
              <CodeBlock code={`// Response (201)
{ "contact": { "id": "uuid", "name": "Alice", "phone": "+628123456789" } }`} />
            </div>

            <h3 className="mt-6 font-semibold text-zinc-800">POST /api/contacts/bulk</h3>
            <p className="mt-1 text-sm text-zinc-600">Import multiple contacts at once. Duplicates are skipped automatically.</p>
            <div className="mt-3">
              <CodeBlock code={`curl -X POST https://your-domain.com/api/contacts/bulk \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "contacts": [
      {"name": "Alice", "phone": "+628123456789"},
      {"name": "Bob", "phone": "+628987654321"}
    ]
  }'`} />
              <CodeBlock code={`// Response (201)
{ "count": 2 }`} />
            </div>
          </section>

          {/* Templates */}
          <section id="templates" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Templates</h2>
            <p className="mt-2 text-sm text-zinc-600">Manage reusable message templates with variable placeholders.</p>

            <div className="mt-4 space-y-2">
              <Endpoint method="GET" path="/api/templates" description="List all message templates." />
              <Endpoint method="POST" path="/api/templates" description="Create a new template." />
              <Endpoint method="DELETE" path="/api/templates?id={id}" description="Delete a template." />
            </div>

            <div className="mt-4 space-y-3">
              <CodeBlock code={`curl -X POST https://your-domain.com/api/templates \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Welcome", "body": "Hi {{name}}, welcome to our service!"}'`} />
              <CodeBlock code={`// Response (201)
{ "template": { "id": "uuid", "name": "Welcome", "body": "Hi {{name}}, welcome to our service!" } }`} />
            </div>
          </section>

          {/* Scheduler */}
          <section id="scheduler" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Scheduler</h2>
            <p className="mt-2 text-sm text-zinc-600">Schedule messages for future delivery.</p>

            <div className="mt-4 space-y-2">
              <Endpoint method="GET" path="/api/scheduler" description="List scheduled messages with pagination and optional status filter." />
              <Endpoint method="POST" path="/api/scheduler" description="Schedule a message for future delivery." />
              <Endpoint method="DELETE" path="/api/scheduler?id={id}" description="Cancel a scheduled message (only if not yet sent)." />
            </div>

            <h3 className="mt-6 font-semibold text-zinc-800">POST /api/scheduler</h3>
            <div className="mt-2">
              <ParamTable params={[
                { name: "recipients", type: "array", required: true, description: "Array of { to, name } objects" },
                { name: "body", type: "string", required: true, description: "Message body" },
                { name: "scheduledAt", type: "string (ISO 8601)", required: true, description: "Future date/time for delivery" },
              ]} />
            </div>
            <div className="mt-3">
              <CodeBlock code={`curl -X POST https://your-domain.com/api/scheduler \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipients": [{"to": "+628123456789", "name": "Alice"}],
    "body": "Hi Alice, this is a scheduled message!",
    "scheduledAt": "2026-06-01T08:00:00.000Z"
  }'`} />
              <CodeBlock code={`// Response (201)
{ "message": { "id": "uuid", "recipients": [...], "body": "...", "scheduledAt": "...", "status": "pending" } }`} />
            </div>
          </section>

          {/* Settings */}
          <section id="settings" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Settings</h2>
            <p className="mt-2 text-sm text-zinc-600">Manage webhook configuration.</p>

            <div className="mt-4 space-y-2">
              <Endpoint method="GET" path="/api/settings" description="Get current settings (auto-creates defaults if none exist)." />
              <Endpoint method="PUT" path="/api/settings" description="Update webhook URL and secret." />
            </div>

            <div className="mt-4">
              <CodeBlock code={`curl -X PUT https://your-domain.com/api/settings \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhookUrl": "https://myapp.com/webhook",
    "webhookSecret": "my-secret-key"
  }'`} />
              <CodeBlock code={`// Response
{ "settings": { "id": "uuid", "webhookUrl": "https://myapp.com/webhook", "webhookSecret": "my-secret-key" } }`} />
            </div>
          </section>

          {/* WhatsApp Device */}
          <section id="device" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">WhatsApp Device</h2>
            <p className="mt-2 text-sm text-zinc-600">Manage your WhatsApp Web connection.</p>

            <div className="mt-4 space-y-2">
              <Endpoint method="POST" path="/api/whatsapp/connect" description="Initiate QR code connection." />
              <Endpoint method="GET" path="/api/whatsapp/status" description="Get current connection status." />
              <Endpoint method="GET" path="/api/whatsapp/qrcode" description="Get the current QR code string." />
              <Endpoint method="POST" path="/api/whatsapp/disconnect" description="Disconnect WhatsApp session." />
            </div>

            <div className="mt-4 space-y-3">
              <CodeBlock code={`// Connect — fire-and-forget, poll /status for updates
curl -X POST https://your-domain.com/api/whatsapp/connect \\
  -H "Authorization: Bearer wag_..."`} />
              <CodeBlock code={`// Status response
{
  "status": "connected", // disconnected | connecting | connected
  "phone": "628123456789@c.us"
}`} />
            </div>
          </section>

          {/* API Keys */}
          <section id="api-keys" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">API Keys</h2>
            <p className="mt-2 text-sm text-zinc-600">Manage your API keys for programmatic access.</p>

            <div className="mt-4 space-y-2">
              <Endpoint method="GET" path="/api/keys" description="List all API keys for the authenticated user." />
              <Endpoint method="POST" path="/api/keys" description="Generate a new API key." />
              <Endpoint method="DELETE" path="/api/keys?id={id}" description="Revoke an API key." />
            </div>

            <div className="mt-3">
              <CodeBlock code={`curl -X POST https://your-domain.com/api/keys \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Production Key"}'`} />
              <CodeBlock code={`// Response (201)
{
  "key": {
    "id": "uuid",
    "name": "Production Key",
    "key": "wag_4f8c3a2b1d9e...",
    "createdAt": "2026-05-25T10:00:00.000Z"
  }
}
// Note: The key value is only shown once at creation.`} />
            </div>
          </section>

          {/* Webhooks */}
          <section id="webhooks" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-[#075E54]">Webhooks</h2>
            <p className="mt-3 text-zinc-600 leading-relaxed">
              Configure a webhook URL in your{" "}
              <a href="/dashboard/settings" className="text-[#075E54] underline">Settings</a>{" "}
              to receive real-time event notifications from TEMANWA.
            </p>

            <div className="mt-4 rounded-lg border border-[#DCF8C6] bg-[#DCF8C6]/10 px-4 py-3 text-sm text-zinc-700">
              <strong>Webhook events are logged</strong> in the <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">WebhookEvent</code> table and can be
              used to track delivery status. Full webhook delivery to your endpoint is coming soon.
            </div>

            <h3 className="mt-6 font-semibold text-zinc-800">Security</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Set a <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">webhookSecret</code> in your settings to verify that incoming
              webhook requests are genuinely from TEMANWA. Use this secret to validate HMAC signatures on each payload.
            </p>

            <h3 className="mt-6 font-semibold text-zinc-800">Configuration</h3>
            <div className="mt-2">
              <CodeBlock code={`curl -X PUT https://your-domain.com/api/settings \\
  -H "Authorization: Bearer wag_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhookUrl": "https://myapp.com/api/whatsapp-webhook",
    "webhookSecret": "your-webhook-secret"
  }'`} />
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-16 border-t border-[#DCF8C6] pt-8 pb-4">
            <p className="text-center text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} TEMANWA. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
