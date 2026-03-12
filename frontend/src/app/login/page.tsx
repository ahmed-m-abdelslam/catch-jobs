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
        await api.register(email, password, fullName);
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

  if (showVerify) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="w-full h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 p-10">
            <div className="text-center mb-10">
              <Image src="/logo.png" alt="Catch Jobs" width={56} height={56} className="mx-auto rounded-xl mb-4" />
              <h1 className="text-3xl font-extrabold text-gray-900">Check your email</h1>
              <p className="text-base text-gray-500 mt-3">
                We sent a 6-digit code to<br />
                <strong className="text-gray-700">{email}</strong>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-emerald-600 text-center">{success}</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-5 py-4 text-center text-3xl font-bold tracking-[0.5em] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Didn't receive the code?{" "}
                <button onClick={handleResend} disabled={resending}
                  className="text-blue-600 font-semibold hover:underline disabled:opacity-50">
                  {resending ? "Sending..." : "Resend"}
                </button>
              </p>
              <button onClick={() => { setShowVerify(false); setCode(""); setError(""); setSuccess(""); }}
                className="text-sm text-gray-400 hover:text-gray-600 mt-4 font-medium">
                ← Back to register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Branding - Left Side */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center bg-gradient-to-br from-blue-600 to-indigo-700 p-16 text-white">
        <Image src="/logo.png" alt="Catch Jobs" width={80} height={80} className="rounded-2xl mb-6" />
        <h2 className="text-4xl font-extrabold mb-3">Catch Jobs</h2>
        <p className="text-blue-100 text-lg text-center leading-relaxed max-w-md">
          AI-powered job matching platform.<br />Find your dream job from 5+ sources.
        </p>
        <div className="mt-12 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold">1K+</p>
            <p className="text-sm text-blue-200 mt-1">Jobs</p>
          </div>
          <div>
            <p className="text-4xl font-bold">5+</p>
            <p className="text-sm text-blue-200 mt-1">Sources</p>
          </div>
          <div>
            <p className="text-4xl font-bold">24/7</p>
            <p className="text-sm text-blue-200 mt-1">Scanning</p>
          </div>
        </div>
      </div>

      {/* Form - Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image src="/logo.png" alt="Catch Jobs" width={44} height={44} className="rounded-lg" />
            <h1 className="text-2xl font-extrabold text-gray-900">Catch Jobs</h1>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-base text-gray-500 mb-8">
            {isRegister ? "Start catching your dream job today" : "Sign in to continue"}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Ahmed Hassan" required
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••" required
                className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-3">
              {loading ? "Please wait..." : isRegister ? "Send Verification Code" : "Sign In"}
            </button>
          </form>

          <p className="text-base text-center text-gray-500 mt-8">
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
