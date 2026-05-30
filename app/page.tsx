import Link from "next/link";
import AuthNavButtons from "./AuthNavButtons";
import {
  MessageCircle,
  Megaphone,
  BarChart3,
  CheckCircle2,
  Star,
  ArrowRight,
  Play,
  Zap,
  ShieldCheck,
  Bot,
  Check,
  Calendar,
  Layers,
  Smartphone,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-600 selection:bg-[#25D366] selection:text-white overflow-x-hidden">
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 25s linear infinite;
          width: max-content;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-[#25D366] p-2 rounded-xl">
              <MessageCircle className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-[#075E54] tracking-tight">TEMANWA</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-500">
            <a href="#features" className="hover:text-[#25D366] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#25D366] transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[#25D366] transition-colors">Pricing</a>
          </div>

          <AuthNavButtons />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#0F172A] leading-[1.15] mb-6">
              Automate Your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#25D366] to-teal-500">Customer Communication</span> <br/>
              At Scale
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mb-8 leading-relaxed">
              Connect seamlessly via our secure API. Engage your customers, launch smart broadcast campaigns, and provide real-time support with built-in protections for your business number.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-[#25D366]/30 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#25D366]/40 transition-all duration-300"
              >
                Start For Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center justify-center gap-2 bg-white text-[#0F172A] border-2 border-slate-200 px-8 py-4 rounded-full font-bold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all duration-300"
              >
                <Play className="w-5 h-5 fill-slate-800" />
                See Demo
              </a>
            </div>
            <p className="mt-10 text-sm text-slate-400 font-medium">Free forever. No credit card.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[360px] lg:max-w-none flex justify-center lg:justify-end">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#25D366]/20 rounded-full blur-3xl"></div>
            <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl"></div>

            <div className="relative w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-[10px] border-slate-900 shadow-2xl flex flex-col z-10 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              <div className="relative w-full h-full flex flex-col rounded-[2.25rem] overflow-hidden bg-[#EFEAE2] isolate">
                <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-2xl w-40 mx-auto z-20"></div>

                <div className="bg-[#075E54] px-4 pt-10 pb-3 flex items-center gap-3 text-white shadow-sm z-10 shrink-0">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">TEMANWA Bot</div>
                    <div className="text-[10px] text-white/80">Online</div>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-3 flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-black/5 overflow-y-auto">
                  <div className="self-end bg-[#DCF8C6] p-3 rounded-xl rounded-tr-sm shadow-sm max-w-[85%] text-sm text-slate-800">
                    Hello! I need to check my order status. #INV-2026
                    <div className="text-[10px] text-right text-slate-500 mt-1 flex justify-end gap-1 items-center">
                      11:05 AM <CheckCircle2 className="w-3 h-3 text-blue-500" />
                    </div>
                  </div>

                  <div className="self-start bg-white p-3 rounded-xl rounded-tl-sm shadow-sm max-w-[85%] text-sm text-slate-800 opacity-90">
                    Hi there! 🤖 Your order <b>#INV-2026</b> is currently out for delivery and will arrive by 3:00 PM today.
                    <div className="text-[10px] text-right text-slate-400 mt-1">11:05 AM</div>
                  </div>

                  <div className="self-start bg-white p-3 rounded-xl rounded-tl-sm shadow-sm max-w-[85%] text-sm text-slate-800 opacity-90">
                    Would you like to track the driver in real-time?
                    <div className="mt-2 flex flex-col gap-2">
                      <button className="bg-sky-50 text-sky-600 font-semibold py-1.5 rounded-lg border border-sky-100 text-xs hover:bg-sky-100">Track Driver</button>
                      <button className="bg-sky-50 text-sky-600 font-semibold py-1.5 rounded-lg border border-sky-100 text-xs hover:bg-sky-100">Contact Support</button>
                    </div>
                    <div className="text-[10px] text-right text-slate-400 mt-1">11:06 AM</div>
                  </div>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 whitespace-nowrap z-20">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#25D366]"></span>
                  </span>
                  <span className="text-xs font-bold text-slate-700">Connection Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Marquee */}
      <section className="py-10 bg-[#F8FAFC] border-y border-slate-100 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 text-center mb-8">
          <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">
            Trusted by growing businesses & e-commerce brands
          </p>
        </div>

        <div className="relative w-full overflow-hidden flex">
          <div className="animate-scroll flex items-center gap-10 md:gap-20 px-5 md:px-10 cursor-default">
            {[
              'BrandOne', 'ShopifyX', 'Tokoku', 'EduTech', 'KlinikKu', 'MediaPlus',
              'BrandOne', 'ShopifyX', 'Tokoku', 'EduTech', 'KlinikKu', 'MediaPlus'
            ].map((brand, i) => (
              <div key={i} className="text-xl md:text-2xl font-black text-slate-400 flex items-center gap-3 shrink-0 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-300 rounded-md"></div>
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4">Powerful Features, Built for Growth</h2>
            <p className="text-lg text-slate-500">Everything you need to automate conversations without compromising the safety of your WhatsApp account.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 group">
              <div className="w-14 h-14 bg-blue-50 text-[#0F172A] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#0F172A] group-hover:text-white transition-colors duration-300">
                <MessageCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Two-Way Messaging</h3>
              <p className="text-slate-500 leading-relaxed">
                Build responsive auto-reply bots and handle customer support directly through our unified, real-time WebSocket connection.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 group">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#25D366] group-hover:text-white transition-colors duration-300">
                <Megaphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Broadcast Campaigns</h3>
              <p className="text-slate-500 leading-relaxed">
                Reach hundreds of customers instantly. Our Smart Queue system spaces out deliveries to mimic human typing and protect your account.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Real-time Analytics</h3>
              <p className="text-slate-500 leading-relaxed">
                Track delivery rates, read receipts, and monitor your device's connection status via a comprehensive safety dashboard.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 group">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Message Templates</h3>
              <p className="text-slate-500 leading-relaxed">
                Save reusable templates with variable placeholders for fast, consistent messaging across all your campaigns.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 group">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Scheduled Messages</h3>
              <p className="text-slate-500 leading-relaxed">
                Schedule one-time or recurring messages for reminders, promotions, and regular campaigns with ease.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 group">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Multi-Device</h3>
              <p className="text-slate-500 leading-relaxed">
                Connect multiple WhatsApp numbers via QR code or pairing code and manage them all from one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4">Get Started in 3 Simple Steps</h2>
            <p className="text-lg text-slate-500">Go from zero to automated in less than 2 minutes.</p>
          </div>

          <div className="flex flex-col md:flex-row items-start justify-between relative max-w-5xl mx-auto">
            <div className="hidden md:block absolute top-8 left-12 right-12 h-0.5 bg-slate-200 z-0"></div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-xs mx-auto mb-12 md:mb-0">
              <div className="w-16 h-16 bg-[#0F172A] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-xl shadow-slate-900/20 border-4 border-[#F8FAFC]">
                1
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Create Account</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Sign up for free and gain instant access to your full dashboard in just a few seconds.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-xs mx-auto mb-12 md:mb-0">
              <div className="w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-xl shadow-[#25D366]/30 border-4 border-[#F8FAFC]">
                2
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Connect WhatsApp</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Scan a QR code or use a pairing code to link your WhatsApp number securely to the platform.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-xs mx-auto">
              <div className="w-16 h-16 bg-white text-[#0F172A] rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-xl border-4 border-[#F8FAFC]">
                3
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Start Sending</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Send individual messages, launch broadcast campaigns, or schedule deliveries — all from a single dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4">What Our Users Say</h2>
            <p className="text-lg text-slate-500">Join thousands of growing businesses powering their communication.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 justify-center">
            <div className="bg-slate-50 p-8 rounded-3xl max-w-md w-full mx-auto border border-slate-100">
              <div className="flex gap-1 mb-4 text-amber-400">
                <Star className="fill-current w-5 h-5" /><Star className="fill-current w-5 h-5" /><Star className="fill-current w-5 h-5" /><Star className="fill-current w-5 h-5" /><Star className="fill-current w-5 h-5" />
              </div>
              <p className="text-slate-600 italic mb-6 leading-relaxed">
                &ldquo;TEMANWA completely changed how we handle our online store. The smart queuing system means I can broadcast to my customers without constantly worrying about my number getting blocked. The setup took less than 5 minutes!&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-300 rounded-full bg-[url('https://i.pravatar.cc/100?img=11')] bg-cover"></div>
                <div>
                  <div className="font-bold text-[#0F172A]">Budi Santoso</div>
                  <div className="text-sm text-slate-500">E-commerce Owner</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl max-w-md w-full mx-auto border border-slate-100 hidden md:block">
              <div className="flex gap-1 mb-4 text-amber-400">
                <Star className="fill-current w-5 h-5" /><Star className="fill-current w-5 h-5" /><Star className="fill-current w-5 h-5" /><Star className="fill-current w-5 h-5" /><Star className="fill-current w-5 h-5" />
              </div>
              <p className="text-slate-600 italic mb-6 leading-relaxed">
                &ldquo;We upgraded to the Pro plan for our customer service team. The WebSocket connection is incredibly stable, and the API was a breeze to integrate into our existing CRM dashboard. Worth every penny.&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-300 rounded-full bg-[url('https://i.pravatar.cc/100?img=47')] bg-cover"></div>
                <div>
                  <div className="font-bold text-[#0F172A]">Siti Aminah</div>
                  <div className="text-sm text-slate-500">CS Manager, TechKlinik</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-[#F8FAFC] border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-slate-500">Built to help small businesses grow. Upgrade anytime.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative">
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Free</h3>
              <p className="text-sm text-slate-500 mb-6">Untuk UMKM Mandiri & Pemula</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-[#0F172A]">Rp 0</span>
                <span className="text-slate-500">/selamanya</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> 1.000 Pesan / Bulan</li>
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> Maks 50 Pesan / Hari</li>
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> 1 Koneksi Perangkat</li>
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> Auto-Balas (Basic)</li>
                <li className="flex items-center gap-3 text-sm text-slate-600 font-semibold"><ShieldCheck className="w-5 h-5 text-[#25D366] shrink-0"/> Sistem Proteksi Meta (Aktif)</li>
                <li className="flex items-center gap-3 text-sm text-slate-400 opacity-60"><Check className="w-5 h-5 shrink-0"/> Broadcast Massal</li>
              </ul>
              <Link
                href="/register"
                className="block w-full py-3.5 rounded-full font-semibold text-[#0F172A] bg-slate-100 hover:bg-slate-200 transition-colors text-center"
              >
                Daftar Gratis
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-[#0F172A] p-8 rounded-[2.5rem] border-2 border-[#25D366] shadow-2xl relative lg:scale-105 z-10 transform transition-transform">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#25D366] text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-sm text-slate-400 mb-6">Untuk Bisnis Berkembang Pesat</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">Rp 49rb</span>
                <span className="text-slate-400">/bulan</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-slate-200"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> 5.000 Pesan / Bulan</li>
                <li className="flex items-center gap-3 text-sm text-slate-200"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> Maks 200 Pesan / Hari</li>
                <li className="flex items-center gap-3 text-sm text-slate-200"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> 2 Koneksi Perangkat</li>
                <li className="flex items-center gap-3 text-sm text-slate-200 font-bold text-white"><Zap className="w-5 h-5 text-amber-400 shrink-0 fill-current"/> Broadcast Massal (Smart Queue)</li>
                <li className="flex items-center gap-3 text-sm text-slate-200"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> Pesan Terjadwal & Webhook</li>
                <li className="flex items-center gap-3 text-sm text-slate-200"><Check className="w-5 h-5 text-[#25D366] shrink-0"/> Panel Keamanan & Analytics</li>
              </ul>
              <Link
                href="/register"
                className="block w-full py-3.5 rounded-full font-bold text-white bg-[#25D366] shadow-lg shadow-[#25D366]/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#25D366]/40 transition-all duration-300 text-center"
              >
                Upgrade to Pro
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative">
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Enterprise</h3>
              <p className="text-sm text-slate-500 mb-6">Untuk Skala Besar & Tim</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-[#0F172A]">Custom</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#0F172A] shrink-0"/> Pesan Tak Terbatas</li>
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#0F172A] shrink-0"/> Multi-perangkat (Custom)</li>
                <li className="flex items-center gap-3 text-sm text-slate-600 font-semibold"><ShieldCheck className="w-5 h-5 text-[#0F172A] shrink-0"/> Dedicated Proxy (Isolasi IP)</li>
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#0F172A] shrink-0"/> Prioritas Antrean Utama</li>
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#0F172A] shrink-0"/> Bebas Batasan Harian</li>
                <li className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-[#0F172A] shrink-0"/> Account Manager Dedicated</li>
              </ul>
              <button className="w-full py-3.5 rounded-full font-semibold text-[#0F172A] border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0F172A] py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#25D366]/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>

        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Ready to Transform Your Customer Communication?
          </h2>
          <p className="text-lg text-slate-400 mb-10">
            Join the platform that empowers your business to connect safely, efficiently, and at scale.
            Set up your automated workflow today.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[#25D366] text-white px-10 py-5 rounded-full font-bold text-xl shadow-2xl shadow-[#25D366]/20 hover:-translate-y-1 hover:shadow-[#25D366]/40 transition-all duration-300"
          >
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b1121] py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8 mb-8 text-sm text-slate-400">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="text-[#25D366] w-6 h-6" />
              <span className="text-xl font-bold text-white tracking-tight">TEMANWA</span>
            </div>
            <p className="max-w-xs leading-relaxed">
              Automating conversations securely. We protect your business numbers while helping you scale your customer reach.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><Link href="/docs" className="hover:text-white transition-colors">API Documentation</Link></li>
              <li><Link href="/safety-guidelines" className="hover:text-white transition-colors">Safety Guidelines</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact-support" className="hover:text-white transition-colors">Contact Support</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; 2026 TEMANWA. All rights reserved. Made in Yogyakarta.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
