"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingPage() {
  const [stats, setStats] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    fetch("/api/jobs/stats")
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-header" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Catch Jobs" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-extrabold gradient-text">Catch Jobs</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg transition" style={{ color: "var(--text-light)" }}>
              Sign In
            </Link>
            <Link href="/login" className="btn btn-primary text-sm py-2.5 px-5">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full mb-6"
            style={{ background: "var(--hover-bg)", border: "1px solid var(--border)", color: "var(--primary)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--primary)" }}></span>
            {stats ? `${stats.total_jobs.toLocaleString()} jobs available now` : "Thousands of jobs available"}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-5" style={{ color: "var(--text)" }}>
            Catch Your <span className="gradient-text">Dream Job</span> Before Anyone Else
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            We scrape top job platforms every 10 minutes so you never miss an opportunity. AI-powered recommendations tailored just for you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/login" className="btn btn-primary text-base py-3.5 px-8 rounded-xl hover-lift w-full sm:w-auto">
              Start Catching Jobs →
            </Link>
            <a href="#features" className="btn btn-outline text-base py-3.5 px-8 rounded-xl w-full sm:w-auto">
              See How It Works
            </a>
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                { value: stats.total_jobs.toLocaleString(), label: "Total Jobs", color: "var(--primary)" },
                { value: Object.keys(stats.by_source || {}).length, label: "Sources", color: "var(--success)" },
                { value: Object.keys(stats.by_country || {}).length, label: "Countries", color: "#8b5cf6" },
                { value: "10m", label: "Refresh Rate", color: "#f59e0b" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[11px] sm:text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sources Bar */}
      <section className="py-8 px-6" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>We collect from</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { name: "LinkedIn", color: "#0077B5" },
              { name: "Wuzzuf", color: "#FF6B00" },
              { name: "RemoteOK", color: "#00C853" },
              { name: "Arbeitnow", color: "#7C3AED" },
              { name: "Jobicy", color: "#EC4899" },
            ].map((s) => (
              <span key={s.name} className="px-4 py-1.5 rounded-full text-xs font-bold"
                style={{ background: `${s.color}12`, color: s.color }}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--text)" }}>
              Everything You Need to <span className="gradient-text">Land Your Next Role</span>
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: "var(--text-muted)" }}>
              Built for job seekers who want to stay ahead of the competition.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "🤖", title: "AI-Powered Matching", desc: "Get personalized job recommendations based on your skills and preferences." },
              { icon: "🔄", title: "Auto-Updated Every 10 Min", desc: "Fresh jobs scraped from top platforms automatically." },
              { icon: "🌍", title: "Global Opportunities", desc: "Jobs across Egypt, Saudi Arabia, UAE, US, Europe, and remote." },
              { icon: "💾", title: "Save & Track", desc: "Save interesting jobs and find them anytime in your dashboard." },
              { icon: "📧", title: "Verified Accounts", desc: "Secure registration with email verification." },
              { icon: "⚡", title: "Lightning Fast", desc: "Blazing fast search across thousands of jobs." },
            ].map((f, i) => (
              <div key={i} className="rounded-xl p-6 hover-lift transition-all"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--hover-bg)" }}>
                  <span className="text-2xl">{f.icon}</span>
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "var(--text)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--text)" }}>How It Works</h2>
            <p className="text-base" style={{ color: "var(--text-muted)" }}>Three simple steps to your next opportunity</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Create Account", desc: "Sign up with your email and verify in seconds.", icon: "📝" },
              { step: "2", title: "Set Preferences", desc: "Tell us your dream job title and preferred country.", icon: "🎯" },
              { step: "3", title: "Get Matched", desc: "Get personalized recommendations updated every 10 minutes.", icon: "🚀" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "var(--primary)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mb-3"
                  style={{ background: "var(--hover-bg)", color: "var(--primary)" }}>
                  {item.step}
                </span>
                <h3 className="text-base font-bold mb-1.5" style={{ color: "var(--text)" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center rounded-2xl p-10 sm:p-14"
          style={{ background: "var(--primary)" }}>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Ready to Catch Your Dream Job?
          </h2>
          <p className="text-base mb-8 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.8)" }}>
            Join now and get instant access to thousands of jobs from top platforms worldwide.
          </p>
          <Link href="/login"
            className="inline-block text-base font-bold px-8 py-3.5 rounded-xl hover-lift transition-all"
            style={{ background: "white", color: "var(--primary)" }}>
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Catch Jobs" width={20} height={20} className="rounded-md" />
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Catch Jobs</span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>© 2026 Catch Jobs. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs font-medium" style={{ color: "var(--text-light)" }}>Sign In</Link>
            <a href="#features" className="text-xs font-medium" style={{ color: "var(--text-light)" }}>Features</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
