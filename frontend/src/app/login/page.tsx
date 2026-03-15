"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

type View = "login" | "register" | "verify" | "forgot" | "reset";

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  function clearMessages() { setError(""); setSuccess(""); }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const result = await api.login(email, password);
      localStorage.setItem("token", result.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await api.register(email, password, fullName);
      setSuccess("Verification code sent to your email!");
      setView("verify");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally { setLoading(false); }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const result = await api.verifyCode(email, code);
      localStorage.setItem("token", result.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Invalid code");
    } finally { setLoading(false); }
  }

  async function handleResend() {
    clearMessages();
    setResending(true);
    try {
      await api.resendCode(email);
      setSuccess("New code sent!");
    } catch (err: any) {
      setError(err.message || "Failed to resend");
    } finally { setResending(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSuccess("Reset code sent to your email!");
      setView("reset");
    } catch (err: any) {
      setError(err.message || "Failed to send reset code");
    } finally { setLoading(false); }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email, code, newPassword);
      setSuccess("Password reset! You can now sign in.");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setView("login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally { setLoading(false); }
  }

  const Alert = ({ type, msg }: { type: "error" | "success"; msg: string }) => (
    <div className={`${type === "error" ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"} border rounded-xl p-4 mb-5`}>
      <p className={`text-sm text-center ${type === "error" ? "text-red-600" : "text-emerald-600"}`}>{msg}</p>
    </div>
  );

  // ===== VERIFY VIEW =====
  if (view === "verify") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="w-full max-w-lg p-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10">
            <div className="text-center mb-10">
              <Image src="/logo.png" alt="Catch Jobs" width={56} height={56} className="mx-auto rounded-xl mb-4" />
              <h1 className="text-3xl font-extrabold text-gray-900">Check your email</h1>
              <p className="text-base text-gray-500 mt-3">We sent a 6-digit code to<br /><strong className="text-gray-700">{email}</strong></p>
            </div>
            {error && <Alert type="error" msg={error} />}
            {success && <Alert type="success" msg={success} />}
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  className="w-full px-5 py-4 text-center text-3xl font-bold tracking-[0.5em] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
            </form>
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">Didn't receive the code?{" "}
                <button onClick={handleResend} disabled={resending} className="text-blue-600 font-semibold hover:underline disabled:opacity-50">
                  {resending ? "Sending..." : "Resend"}
                </button>
              </p>
              <button onClick={() => { setView("register"); setCode(""); clearMessages(); }}
                className="text-sm text-gray-400 hover:text-gray-600 mt-4 font-medium">← Back to register</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== FORGOT PASSWORD VIEW =====
  if (view === "forgot") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="w-full max-w-lg p-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10">
            <div className="text-center mb-10">
              <Image src="/logo.png" alt="Catch Jobs" width={56} height={56} className="mx-auto rounded-xl mb-4" />
              <h1 className="text-3xl font-extrabold text-gray-900">Forgot password?</h1>
              <p className="text-base text-gray-500 mt-3">Enter your email and we'll send you a reset code</p>
            </div>
            {error && <Alert type="error" msg={error} />}
            {success && <Alert type="success" msg={success} />}
            <form onSubmit={handleForgot} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>
            <div className="mt-8 text-center">
              <button onClick={() => { setView("login"); clearMessages(); }}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium">← Back to sign in</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== RESET PASSWORD VIEW =====
  if (view === "reset") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="w-full max-w-lg p-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10">
            <div className="text-center mb-10">
              <Image src="/logo.png" alt="Catch Jobs" width={56} height={56} className="mx-auto rounded-xl mb-4" />
              <h1 className="text-3xl font-extrabold text-gray-900">Reset password</h1>
              <p className="text-base text-gray-500 mt-3">Enter the code sent to<br /><strong className="text-gray-700">{email}</strong></p>
            </div>
            {error && <Alert type="error" msg={error} />}
            {success && <Alert type="success" msg={success} />}
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reset Code</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  className="w-full px-5 py-4 text-center text-3xl font-bold tracking-[0.5em] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••••" required minLength={6}
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••" required minLength={6}
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
              </div>
              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
            <div className="mt-8 text-center">
              <button onClick={() => { setView("forgot"); setCode(""); clearMessages(); }}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium">← Back</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== LOGIN / REGISTER VIEW =====
  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center bg-gradient-to-br from-blue-600 to-indigo-700 p-16 text-white">
        <Image src="/logo.png" alt="Catch Jobs" width={80} height={80} className="rounded-2xl mb-6" />
        <h2 className="text-4xl font-extrabold mb-3">Catch Jobs</h2>
        <p className="text-blue-100 text-lg text-center leading-relaxed max-w-md">
          AI-powered job matching platform.<br />Find your dream job from 5+ sources.
        </p>
        <div className="mt-12 grid grid-cols-3 gap-8 text-center">
          <div><p className="text-4xl font-bold">1K+</p><p className="text-sm text-blue-200 mt-1">Jobs</p></div>
          <div><p className="text-4xl font-bold">5+</p><p className="text-sm text-blue-200 mt-1">Sources</p></div>
          <div><p className="text-4xl font-bold">24/7</p><p className="text-sm text-blue-200 mt-1">Scanning</p></div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image src="/logo.png" alt="Catch Jobs" width={44} height={44} className="rounded-lg" />
            <h1 className="text-2xl font-extrabold text-gray-900">Catch Jobs</h1>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            {view === "register" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-base text-gray-500 mb-8">
            {view === "register" ? "Start catching your dream job today" : "Sign in to continue"}
          </p>

          {error && <Alert type="error" msg={error} />}
          {success && <Alert type="success" msg={success} />}

          <form onSubmit={view === "register" ? handleRegister : handleLogin} className="space-y-5">
            {view === "register" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Ahmed Hassan" required
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••" required
                className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
            </div>

            {view === "login" && (
              <div className="text-right">
                <button type="button" onClick={() => { setView("forgot"); clearMessages(); }}
                  className="text-sm text-blue-600 font-semibold hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition mt-3">
              {loading ? "Please wait..." : view === "register" ? "Send Verification Code" : "Sign In"}
            </button>
          </form>

          <p className="text-base text-center text-gray-500 mt-8">
            {view === "register" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setView(view === "register" ? "login" : "register"); clearMessages(); }}
              className="text-blue-600 font-semibold hover:underline">
              {view === "register" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
