"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Image from "next/image";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (isRegister) {
        result = await api.register(email, password, fullName);
      } else {
        result = await api.login(email, password);
      }
      localStorage.setItem("token", result.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 relative overflow-hidden">
        {/* Background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16">
          <Image src="/logo.png" alt="Catch Jobs" width={140} height={140} className="mb-10 drop-shadow-2xl" />
          <h2 className="text-4xl font-extrabold text-white mb-3 text-center tracking-tight">
            Catch Jobs
          </h2>
          <p className="text-blue-200 text-base text-center max-w-sm leading-relaxed mb-12">
            AI-powered job hunting. We scan multiple sources every 10 minutes so you never miss an opportunity.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 w-full max-w-sm">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">1K+</p>
              <p className="text-blue-300 text-xs font-medium mt-1">Jobs</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">5+</p>
              <p className="text-blue-300 text-xs font-medium mt-1">Sources</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">24/7</p>
              <p className="text-blue-300 text-xs font-medium mt-1">Scanning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <Image src="/logo.png" alt="Catch Jobs" width={64} height={64} className="mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold gradient-text">Catch Jobs</h1>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              {isRegister ? "Start catching your dream job today" : "Sign in to continue job hunting"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="label">Full Name</label>
                <input type="text" placeholder="Ahmed Hassan" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input" required />
              </div>
            )}
            <div>
              <label className="label">Email Address</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" placeholder="Enter your password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input" required />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 font-medium">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn btn-primary w-full py-3 text-[15px] mt-2">
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-8">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="font-semibold text-blue-600 hover:text-blue-800">
              {isRegister ? "Sign in" : "Register"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
