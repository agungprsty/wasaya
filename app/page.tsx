import Link from "next/link";
import AuthNavButtons from "./AuthNavButtons";

const features = [
  {
    title: "Kirim Pesan",
    desc: "Kirim pesan WhatsApp dengan mudah, lengkap dengan dukungan media seperti gambar, PDF, dan dokumen lainnya.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12zm0 0h7.5" />
      </svg>
    ),
  },
  {
    title: "Broadcast Massal",
    desc: "Kirim pesan ke ratusan kontak sekaligus dengan rate limiting otomatis untuk mencegah pemblokiran.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    title: "Template Pesan",
    desc: "Simpan template pesan dengan placeholder yang bisa dipakai ulang untuk kirim pesan cepat dan konsisten.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "Pesan Terjadwal",
    desc: "Jadwalkan pesan otomatis di waktu tertentu — cocok untuk pengingat, promo, dan campaign berkala.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Bot Auto-Balas",
    desc: "Buat aturan chatbot berbasis kata kunci yang otomatis membalas pesan pelanggan 24/7 tanpa perlu staff.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    title: "Grup Kontak",
    desc: "Kelompokkan kontak ke dalam grup untuk broadcast tertarget dan kampanye tersegmentasi.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  // {
  //   title: "Webhook Integration",
  //   desc: "Terima event pesan real-time via webhook yang ditandatangani HMAC, lengkap dengan retry otomatis.",
  //   icon: (
  //     <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
  //       <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
  //     </svg>
  //   ),
  // },
  // {
  //   title: "RESTful API",
  //   desc: "Akses penuh ke REST API untuk semua fitur — kirim, kelola, dan pantau dari aplikasi Anda.",
  //   icon: (
  //     <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
  //       <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  //     </svg>
  //   ),
  // },
];

const steps = [
  { num: "01", title: "Buat Akun", desc: "Daftar gratis dan dapatkan akses ke dashboard dalam hitungan menit." },
  { num: "02", title: "Hubungkan WhatsApp", desc: "Scan QR code untuk menghubungkan nomor WhatsApp Anda — tanpa perlu HP tambahan." },
  { num: "03", title: "Mulai Kirim Pesan", desc: "Kirim pesan satuan atau broadcast ke banyak kontak dengan template siap pakai." },
];

const plans = [
  {
    name: "Free",
    subtitle: "Untuk UMKM dan perorangan",
    price: "Rp 0",
    period: "selamanya",
    cta: "Daftar Gratis",
    href: "/register",
    popular: false,
    features: [
      "500 pesan/bulan",
      "200 kontak",
      "10 template pesan",
      "1 koneksi perangkat",
      "Broadcast massal",
      "Pesan terjadwal",
      "Akses REST API",
    ],
  },
  {
    name: "Pro",
    subtitle: "Untuk bisnis berkembang pesat",
    price: "Rp 49.000",
    period: "/bulan",
    cta: "Mulai Pro",
    href: "/register",
    popular: true,
    features: [
      "5.000 pesan/bulan",
      "Kontak tak terbatas",
      "Template pesan tak terbatas",
      "2 koneksi perangkat",
      "Bot auto-balas",
      "Webhook integration",
      "Custom Watermark",
      "Support prioritas",
      "Semua fitur Free +",
    ],
  },
  {
    name: "Enterprise",
    subtitle: "Untuk skala besar & tim",
    price: null,
    period: null,
    cta: "Hubungi Kami",
    href: "/register",
    popular: false,
    features: [
      "Pesan tak terbatas",
      "Kontak tak terbatas",
      "Template pesan tak terbatas",
      "Multi-perangkat WhatsApp",
      "Dedicated chatbot engine",
      "SLA 99,99% uptime",
      "Account manager dedicated",
      "Integrasi & onboarding kustom",
      "Prioritas 24/7",
      "Semua fitur Pro +",
    ],
  },
];

export default function Home() {
  return (
    <div className="flex flex-col font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[#DCF8C6] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#075E54]">
            <svg className="h-7 w-7 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WAGateway
          </Link>
          <nav className="hidden items-center gap-8 sm:flex">
            <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-[#075E54]">Fitur</a>
            <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-[#075E54]">Harga</a>
            <a href="#how-it-works" className="text-sm font-medium text-zinc-600 hover:text-[#075E54]">Cara Kerja</a>
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
              Dipercaya 10.000+ bisnis di Indonesia
            </span>
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-[#075E54] sm:text-5xl lg:text-6xl">
              WhatsApp Gateway{" "}
              <span className="bg-gradient-to-r from-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                untuk Bisnis Anda
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600">
              Kirim pesan massal, otomatiskan komunikasi pelanggan, dan tingkatkan penjualan —
              semua melalui platform yang mudah, aman, dan terjangkau.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#25D366] px-8 text-base font-medium text-white shadow-sm transition-all hover:bg-[#1DAF5A] hover:shadow-md"
              >
                Gratis Coba
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-8 text-base font-medium text-zinc-700 transition-colors hover:bg-[#DCF8C6]"
              >
                Pelajari
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-24 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#075E54]">10K+</p>
              <p className="mt-1 text-sm text-zinc-500">Bisnis Aktif</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#075E54]">1J+</p>
              <p className="mt-1 text-sm text-zinc-500">Pesan Terkirim</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#075E54]">99,9%</p>
              <p className="mt-1 text-sm text-zinc-500">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#075E54]">#1</p>
              <p className="mt-1 text-sm text-zinc-500">WhatsApp Gateway</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#075E54] sm:text-4xl">
              Semua Fitur yang Anda Butuhkan
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-600">
              Platform all-in-one untuk mengelola komunikasi bisnis Anda lewat WhatsApp.
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

      {/* Pricing Section */}
      <section id="pricing" className="bg-[#DCF8C6]/20 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#075E54] sm:text-4xl">
              Harga yang ramah di kantong
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-600">
              Gratis selamanya untuk UMKM. Upgrade kapanpun saat bisnis Anda berkembang.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border-2 bg-white p-8 transition-all hover:shadow-lg ${
                  plan.popular
                    ? "border-[#25D366] shadow-md"
                    : "border-[#DCF8C6] hover:border-[#25D366]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-[#25D366] px-4 py-1 text-xs font-semibold text-white">
                    Terpopuler
                  </span>
                )}
                <h3 className="text-xl font-bold text-[#075E54]">{plan.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{plan.subtitle}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  {plan.price ? (
                    <>
                      <span className="text-4xl font-bold text-[#075E54]">{plan.price}</span>
                      <span className="text-sm text-zinc-500">{plan.period}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-[#25D366]">Hubungi Kami</span>
                  )}
                </div>
                <ul className="mt-8 flex-1 space-y-4">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm text-zinc-600">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 inline-flex h-12 w-full items-center justify-center rounded-full text-base font-medium transition-all ${
                    plan.popular
                      ? "bg-[#25D366] text-white shadow-sm hover:bg-[#1DAF5A] hover:shadow-md"
                      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-[#DCF8C6]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#075E54] sm:text-4xl">
              Mulai dalam 3 langkah mudah
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-600">
              Dari nol hingga kirim pesan pertama dalam waktu kurang dari 10 menit.
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
            Siap tingkatkan bisnis Anda?
          </h2>
          <p className="mt-4 text-lg leading-8 text-[#DCF8C6]">
            Bergabung dengan ribuan UMKM yang sudah menggunakan WAGateway. Gratis selamanya, tanpa perlu kartu kredit.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-[#075E54] shadow-sm transition-all hover:bg-[#DCF8C6] hover:shadow-md"
            >
              Gratis Coba
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-8 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              Masuk
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
