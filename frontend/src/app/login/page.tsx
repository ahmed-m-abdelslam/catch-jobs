"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Image from "next/image";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register(email, password, fullName);
        setSuccess("Verification code sent to your email!");
        setShowVerify(true);
      } else {
        const result = await api.login(email, password);
        localStorage.setItem("token", result.access_token);
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await api.verifyCode(email, code);
      localStorage.setItem("token", result.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setResending(true);
    try {
      await api.resendCode(email);
      setSuccess("New code sent to your email!");
    } catch (err: any) {
      setError(err.message || "Failed to resend");
    } finally {
      setResending(false);
    }
  }

  // Verification Code Screen
  if (showVerify) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <Image src="/logo.png" alt="Catch Jobs" width={48} height={48} className="mx-auto rounded-xl mb-3" />
              <h1 className="text-2xl font-extrabold text-gray-900">Check your email</h1>
              <p className="text-sm text-gray-500 mt-2">
                We sent a 6-digit code to<br />
                <strong className="text-gray-700">{email}</strong>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-emerald-600 text-center">{success}</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Didn't receive the code?{" "}
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-blue-600 font-semibold hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend"}
                </button>
              </p>
              <button
                onClick={() => { setShowVerify(false); setCode(""); setError(""); setSuccess(""); }}
                className="text-sm text-gray-400 hover:text-gray-600 mt-3 font-medium"
              >
                ← Back to register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login / Register Screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Branding */}
        <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white">
          <Image src="/logo.png" alt="Catch Jobs" width={64} height={64} className="rounded-2xl mb-5" />
          <h2 className="text-2xl font-extrabold mb-2">Catch Jobs</h2>
          <p className="text-blue-100 text-sm text-center leading-relaxed">
            AI-powered job matching platform.<br />Find your dream job from 5+ sources.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">1K+</p>
              <p className="text-xs text-blue-200">Jobs</p>
            </div>
            <div>
              <p className="text-2xl font-bold">5+</p>
              <p className="text-xs text-blue-200">Sources</p>
            </div>
            <div>
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-xs text-blue-200">Scanning</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-8 md:p-10">
          <div className="md:hidden flex items-center gap-3 mb-6">
            <Image src="/logo.png" alt="Catch Jobs" width={36} height={36} className="rounded-lg" />
            <h1 className="text-xl font-extrabold text-gray-900">Catch Jobs</h1>
          </div>

          <h2 className="text-xl font-extrabold text-gray-900 mb-1">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isRegister ? "Start catching your dream job today" : "Sign in to continue"}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Ahmed Hassan" required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••" required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2">
              {loading ? "Please wait..." : isRegister ? "Send Verification Code" : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-6">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setIsRegister(!isRegister); setError(""); setSuccess(""); }}
              className="text-blue-600 font-semibold hover:underline">
              {isRegister ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
