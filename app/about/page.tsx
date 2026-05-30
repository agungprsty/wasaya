import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="border-b border-[#DCF8C6] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#075E54]">
            <svg className="h-5 w-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            TEMANWA
          </Link>
          <Link href="/login" className="text-sm font-medium text-[#075E54] hover:text-[#25D366] transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-[#075E54]">About TEMANWA</h1>
        <p className="mt-2 text-sm text-zinc-500">Empowering businesses with secure WhatsApp automation.</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-zinc-600">
          <section>
            <h2 className="text-lg font-semibold text-[#075E54]">Our Mission</h2>
            <p className="mt-2">
              TEMANWA was built to solve a fundamental challenge faced by thousands of businesses across Indonesia: how to leverage WhatsApp for customer communication at scale without risking account bans or compromising security. We provide a robust gateway that combines powerful automation with intelligent safety mechanisms, allowing businesses to focus on growth while we handle the technical complexity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#075E54]">Why We Built This</h2>
            <p className="mt-2">
              Traditional WhatsApp gateways either require expensive infrastructure, lack proper safety features, or force businesses into rigid pricing models. We saw an opportunity to create something different — a platform that is accessible to small businesses just starting out, yet powerful enough to serve enterprise-grade operations. Our free tier ensures that even the smallest UMKM can access professional WhatsApp automation without upfront investment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#075E54]">Our Approach</h2>
            <p className="mt-2">
              Every feature we build is guided by three principles: security, simplicity, and scalability. Our human-mimicry engine, smart queuing system, and real-time safety dashboard are all designed to protect your WhatsApp numbers while maximizing deliverability. We believe that automation should not come at the cost of account safety, and our technology reflects that commitment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#075E54]">The Team</h2>
            <p className="mt-2">
              We are a remote-first team based in Yogyakarta, Indonesia, passionate about building tools that democratize access to business communication technology. With backgrounds in software engineering, product design, and customer success, we bring decades of combined experience to solving real-world communication challenges for businesses of all sizes.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#DCF8C6] bg-white py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <p className="text-sm text-zinc-500">&copy; {new Date().getFullYear()} TEMANWA. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-zinc-500">
            <Link href="/terms" className="hover:text-[#075E54] transition-colors">Terms of Service</Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="hover:text-[#075E54] transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
