import Link from "next/link";
import AuthNavButtons from "./AuthNavButtons";

const features = [
  {
    title: "Send Message",
    desc: "Compose and send WhatsApp messages with optional media attachments — images, PDFs, and documents.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12zm0 0h7.5" />
      </svg>
    ),
  },
  {
    title: "Broadcast Messaging",
    desc: "Send bulk messages to hundreds of contacts at once with automatic rate limiting to prevent bans.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    title: "Message Templates",
    desc: "Save reusable message templates with placeholders for quick broadcasting and consistent messaging.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "WhatsApp Device",
    desc: "Connect your WhatsApp number using QR code pairing via whatsapp-web.js with session persistence.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    title: "Contact Management",
    desc: "Manage your contact list with add, delete, and bulk import capabilities for easy targeting.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: "RESTful API & Webhooks",
    desc: "Full REST API for programmatic access plus webhook integration for receiving incoming messages.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
];

const steps = [
  { num: "01", title: "Create Account", desc: "Sign up and get your API keys ready in minutes." },
  { num: "02", title: "Connect WhatsApp", desc: "Link your WhatsApp number via QR code pairing — just scan, no extra hardware." },
  { num: "03", title: "Start Messaging", desc: "Send individual messages or broadcast to multiple contacts with templates." },
];

export default function Home() {
  return (
    <div className="flex flex-col font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[#DCF8C6] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#075E54]">
            <svg className="h-7 w-7 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WAGateway
          </Link>
          <nav className="hidden items-center gap-8 sm:flex">
            <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-[#075E54]">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-zinc-600 hover:text-[#075E54]">How It Works</a>
            <Link href="/docs" className="text-sm font-medium text-zinc-600 hover:text-[#075E54]">API Docs</Link>
          </nav>
          <AuthNavButtons />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#DCF8C6]/30 pb-24 pt-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-[#DCF8C6] px-4 py-1.5 text-xs font-semibold text-[#075E54]">
              Trusted by 10,000+ businesses worldwide
            </span>
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-[#075E54] sm:text-5xl lg:text-6xl">
              WhatsApp Gateway{" "}
              <span className="bg-gradient-to-r from-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                for Your Business
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600">
              Send bulk messages, automate customer communication, and drive engagement — all through
              a powerful, secure, and easy-to-use platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#25D366] px-8 text-base font-medium text-white shadow-sm transition-all hover:bg-[#1DAF5A] hover:shadow-md"
              >
                Start Free Trial
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-8 text-base font-medium text-zinc-700 transition-colors hover:bg-[#DCF8C6]"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-24 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#075E54]">10K+</p>
              <p className="mt-1 text-sm text-zinc-500">Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#075E54]">1M+</p>
              <p className="mt-1 text-sm text-zinc-500">Messages Sent</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#075E54]">99.9%</p>
              <p className="mt-1 text-sm text-zinc-500">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#075E54]">API</p>
              <p className="mt-1 text-sm text-zinc-500">First</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#075E54] sm:text-4xl">
              Everything you need to scale
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-600">
              A complete messaging toolkit designed for businesses of all sizes.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-[#DCF8C6] bg-white p-8 transition-all hover:border-[#25D366] hover:shadow-lg"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#DCF8C6] text-[#25D366]">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-[#075E54]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#DCF8C6]/20 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#075E54] sm:text-4xl">
              Get started in 3 simple steps
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-600">
              From zero to sending your first message in under 10 minutes.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="relative text-center">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#DCF8C6] text-2xl font-bold text-[#075E54]">
                  {step.num}
                </span>
                <h3 className="mt-6 text-lg font-semibold text-[#075E54]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#075E54] to-[#25D366] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your business messaging?
          </h2>
          <p className="mt-4 text-lg leading-8 text-[#DCF8C6]">
            Join thousands of businesses already using WAGateway. No credit card required.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-[#075E54] shadow-sm transition-all hover:bg-[#DCF8C6] hover:shadow-md"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-8 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#DCF8C6] bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm font-bold text-[#075E54]">
            <svg className="h-5 w-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WAGateway
          </div>
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} WAGateway. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}