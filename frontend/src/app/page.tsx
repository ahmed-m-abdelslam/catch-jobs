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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Navbar */}
      <nav className="glass-header" style={{ position: "fixed", top: 0, width: "100%", zIndex: 50, borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px", height: "64px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Image src="/logo.png" alt="Catch Jobs" width={32} height={32} className="rounded-lg" />
            <span className="gradient-text" style={{ fontSize: "18px", fontWeight: 800 }}>Catch Jobs</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ThemeToggle />
            <Link href="/login" style={{ fontSize: "14px", fontWeight: 600, padding: "8px 16px", borderRadius: "8px", color: "var(--text-light)" }}>
              Sign In
            </Link>
            <Link href="/login" className="btn btn-primary" style={{ fontSize: "14px", padding: "10px 20px" }}>
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: "120px", paddingBottom: "60px", paddingLeft: "24px", paddingRight: "24px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)", transition: "all 1s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, padding: "6px 16px", borderRadius: "100px", marginBottom: "24px", background: "var(--hover-bg)", border: "1px solid var(--border)", color: "var(--primary)" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", animation: "pulse-soft 2s ease infinite" }}></span>
            {stats ? `${stats.total_jobs.toLocaleString()} jobs available now` : "Thousands of jobs available"}
          </div>

          <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 800, lineHeight: 1.1, marginBottom: "20px", color: "var(--text)" }}>
            Catch Your <span className="gradient-text">Dream Job</span> Before Anyone Else
          </h1>

          <p style={{ fontSize: "18px", maxWidth: "520px", margin: "0 auto 32px", lineHeight: 1.7, color: "var(--text-muted)" }}>
            We scrape top job platforms every 10 minutes so you never miss an opportunity. AI-powered recommendations tailored just for you.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px", marginBottom: "48px" }}>
            <Link href="/login" className="btn btn-primary hover-lift" style={{ fontSize: "16px", padding: "14px 32px", borderRadius: "12px" }}>
              Start Catching Jobs →
            </Link>
            <a href="#features" className="btn btn-outline" style={{ fontSize: "16px", padding: "14px 32px", borderRadius: "12px" }}>
              See How It Works
            </a>
          </div>

          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", maxWidth: "600px", margin: "0 auto" }}>
              {[
                { value: stats.total_jobs.toLocaleString(), label: "Total Jobs", color: "var(--primary)" },
                { value: Object.keys(stats.by_source || {}).length, label: "Sources", color: "var(--success)" },
                { value: Object.keys(stats.by_country || {}).length, label: "Countries", color: "#8b5cf6" },
                { value: "10m", label: "Refresh Rate", color: "#f59e0b" },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: "11px", fontWeight: 500, marginTop: "4px", color: "var(--text-muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sources */}
      <section style={{ padding: "32px 24px", background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>We collect from</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px" }}>
            {[
              { name: "LinkedIn", color: "#0077B5" },
              { name: "Wuzzuf", color: "#FF6B00" },
              { name: "RemoteOK", color: "#00C853" },
              { name: "Arbeitnow", color: "#7C3AED" },
              { name: "Jobicy", color: "#EC4899" },
            ].map((s) => (
              <span key={s.name} style={{ padding: "6px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, background: `${s.color}12`, color: s.color }}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, marginBottom: "12px", color: "var(--text)" }}>
              Everything You Need to <span className="gradient-text">Land Your Next Role</span>
            </h2>
            <p style={{ fontSize: "16px", maxWidth: "480px", margin: "0 auto", color: "var(--text-muted)" }}>
              Built for job seekers who want to stay ahead of the competition.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {[
              { icon: "🤖", title: "AI-Powered Matching", desc: "Get personalized job recommendations based on your skills and preferences." },
              { icon: "🔄", title: "Auto-Updated Every 10 Min", desc: "Fresh jobs scraped from top platforms automatically." },
              { icon: "🌍", title: "Global Opportunities", desc: "Jobs across Egypt, Saudi Arabia, UAE, US, Europe, and remote." },
              { icon: "💾", title: "Save & Track", desc: "Save interesting jobs and find them anytime in your dashboard." },
              { icon: "📧", title: "Verified Accounts", desc: "Secure registration with email verification." },
              { icon: "⚡", title: "Lightning Fast", desc: "Blazing fast search across thousands of jobs." },
            ].map((f, i) => (
              <div key={i} className="hover-lift" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", textAlign: "center", transition: "all 0.3s ease" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "var(--hover-bg)" }}>
                  <span style={{ fontSize: "24px" }}>{f.icon}</span>
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px", color: "var(--text)" }}>{f.title}</h3>
                <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: "80px 24px", background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, marginBottom: "12px", color: "var(--text)" }}>How It Works</h2>
            <p style={{ fontSize: "16px", color: "var(--text-muted)" }}>Three simple steps to your next opportunity</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px" }}>
            {[
              { step: "1", title: "Create Account", desc: "Sign up with your email and verify in seconds.", icon: "📝" },
              { step: "2", title: "Set Preferences", desc: "Tell us your dream job title and preferred country.", icon: "🎯" },
              { step: "3", title: "Get Matched", desc: "Get personalized recommendations updated every 10 minutes.", icon: "🚀" },
            ].map((item) => (
              <div key={item.step} style={{ textAlign: "center" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "var(--primary)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
                  <span style={{ fontSize: "24px" }}>{item.icon}</span>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "50%", fontSize: "12px", fontWeight: 700, marginBottom: "12px", background: "var(--hover-bg)", color: "var(--primary)" }}>
                  {item.step}
                </span>
                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px", color: "var(--text)" }}>{item.title}</h3>
                <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center", borderRadius: "16px", padding: "48px 32px", background: "var(--primary)" }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "white", marginBottom: "12px" }}>
            Ready to Catch Your Dream Job?
          </h2>
          <p style={{ fontSize: "16px", marginBottom: "32px", maxWidth: "440px", margin: "0 auto 32px", color: "rgba(255,255,255,0.8)" }}>
            Join now and get instant access to thousands of jobs from top platforms worldwide.
          </p>
          <Link href="/login" className="hover-lift"
            style={{ display: "inline-block", fontSize: "16px", fontWeight: 700, padding: "14px 32px", borderRadius: "12px", background: "white", color: "var(--primary)", transition: "all 0.2s ease" }}>
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 24px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Image src="/logo.png" alt="Catch Jobs" width={20} height={20} className="rounded-md" />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Catch Jobs</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>© 2026 Catch Jobs. All rights reserved.</p>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/login" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-light)" }}>Sign In</Link>
            <a href="#features" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-light)" }}>Features</a>
            <a href="https://www.linkedin.com/company/freelancer11/?viewAsMember=true" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-light)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
