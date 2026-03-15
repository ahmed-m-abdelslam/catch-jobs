"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

  const features = [
    {
      icon: "🤖",
      title: "AI-Powered Matching",
      desc: "Get personalized job recommendations based on your skills and preferences.",
    },
    {
      icon: "🔄",
      title: "Auto-Updated Every 10 Min",
      desc: "Fresh jobs scraped from LinkedIn, Wuzzuf, RemoteOK, and more — automatically.",
    },
    {
      icon: "🌍",
      title: "Global Opportunities",
      desc: "Find jobs across Egypt, Saudi Arabia, UAE, US, Europe, and remote positions.",
    },
    {
      icon: "💾",
      title: "Save & Track",
      desc: "Save interesting jobs and track your applications all in one place.",
    },
    {
      icon: "📧",
      title: "Email Verified Accounts",
      desc: "Secure registration with email verification to protect your account.",
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      desc: "Blazing fast search across thousands of jobs with smart filters.",
    },
  ];

  const sources = [
    { name: "LinkedIn", color: "bg-blue-100 text-blue-700" },
    { name: "Wuzzuf", color: "bg-orange-100 text-orange-700" },
    { name: "RemoteOK", color: "bg-green-100 text-green-700" },
    { name: "Arbeitnow", color: "bg-purple-100 text-purple-700" },
    { name: "Jobicy", color: "bg-pink-100 text-pink-700" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Catch Jobs" width={36} height={36} className="rounded-lg" />
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Catch Jobs
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              Sign In
            </Link>
            <Link href="/login"
              className="text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            {stats ? `${stats.total_jobs.toLocaleString()} jobs available now` : "Thousands of jobs available"}
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Catch Your
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent"> Dream Job</span>
            <br />Before Anyone Else
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            We scrape top job platforms every 10 minutes so you never miss an opportunity.
            AI-powered recommendations tailored just for you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/login"
              className="w-full sm:w-auto text-center text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 rounded-2xl hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5">
              Start Catching Jobs →
            </Link>
            <a href="#features"
              className="w-full sm:w-auto text-center text-base font-semibold text-gray-600 bg-white border border-gray-200 px-8 py-4 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all">
              See How It Works
            </a>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-3xl font-extrabold text-blue-600">{stats.total_jobs.toLocaleString()}</p>
                <p className="text-sm text-gray-400 font-medium mt-1">Total Jobs</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-3xl font-extrabold text-indigo-600">{Object.keys(stats.by_source || {}).length}</p>
                <p className="text-sm text-gray-400 font-medium mt-1">Job Sources</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-3xl font-extrabold text-purple-600">{Object.keys(stats.by_country || {}).length}</p>
                <p className="text-sm text-gray-400 font-medium mt-1">Countries</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-3xl font-extrabold text-emerald-600">10m</p>
                <p className="text-sm text-gray-400 font-medium mt-1">Update Interval</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sources Section */}
      <section className="py-12 px-6 bg-white/50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">We collect jobs from</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {sources.map((s) => (
              <span key={s.name} className={`${s.color} px-5 py-2.5 rounded-full text-sm font-bold`}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Land Your Next Role</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Built for job seekers who want to stay ahead of the competition.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i}
                className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300">
                <span className="text-4xl mb-4 block">{f.icon}</span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-500">Three simple steps to your next opportunity</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Create Account", desc: "Sign up with your email and verify in seconds.", icon: "📝" },
              { step: "2", title: "Set Preferences", desc: "Tell us your dream job title, preferred country, and if you want remote.", icon: "🎯" },
              { step: "3", title: "Get Matched", desc: "Receive personalized job recommendations updated every 10 minutes.", icon: "🚀" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 sm:p-16 shadow-2xl shadow-blue-500/20">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Catch Your Dream Job?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            Join now and get instant access to thousands of jobs from top platforms worldwide.
          </p>
          <Link href="/login"
            className="inline-block text-base font-bold text-blue-600 bg-white px-8 py-4 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-0.5">
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-gray-200/60">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Catch Jobs" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-bold text-gray-700">Catch Jobs</span>
          </div>
          <p className="text-sm text-gray-400">© 2026 Catch Jobs. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 font-medium">Sign In</Link>
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-700 font-medium">Features</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
