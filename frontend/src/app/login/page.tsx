"use client";

import { useState, useCallback, memo } from "react";
import { api } from "@/lib/api";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

const InputField = memo(({ icon, label, type, value, onChange, placeholder, required, minLength, maxLength, style: extraStyle }: any) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>{label}</label>
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", opacity: 0.5 }}>{icon}</span>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        required={required} minLength={minLength} maxLength={maxLength}
        style={{
          width: "100%",
          padding: "12px 14px 12px 42px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text)",
          fontSize: "14px",
          outline: "none",
          transition: "all 0.2s ease",
          boxSizing: "border-box" as const,
          ...extraStyle,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
      />
    </div>
  </div>
));
InputField.displayName = "InputField";

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
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      const result = await api.login(email, password);
      localStorage.setItem("token", result.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) { setError(err.message || "Invalid credentials"); }
    finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      await api.register(email, password, fullName);
      setSuccess("Verification code sent to your email!");
      setView("verify");
    } catch (err: any) { setError(err.message || "Registration failed"); }
    finally { setLoading(false); }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      const result = await api.verifyCode(email, code);
      localStorage.setItem("token", result.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) { setError(err.message || "Invalid code"); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    clearMessages(); setResending(true);
    try { await api.resendCode(email); setSuccess("New code sent!"); }
    catch (err: any) { setError(err.message || "Failed to resend"); }
    finally { setResending(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      await api.forgotPassword(email);
      setSuccess("Reset code sent to your email!");
      setView("reset");
    } catch (err: any) { setError(err.message || "Failed to send reset code"); }
    finally { setLoading(false); }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault(); clearMessages();
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await api.resetPassword(email, code, newPassword);
      setSuccess("Password reset! You can now sign in.");
      setCode(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => setView("login"), 2000);
    } catch (err: any) { setError(err.message || "Failed to reset password"); }
    finally { setLoading(false); }
  }

  const Alert = ({ type, msg }: { type: "error" | "success"; msg: string }) => (
    <div style={{
      padding: "12px 16px",
      borderRadius: "12px",
      marginBottom: "20px",
      background: type === "error" ? "#fef2f2" : "#ecfdf5",
      border: `1px solid ${type === "error" ? "#fecaca" : "#a7f3d0"}`,
    }}>
      <p style={{ fontSize: "13px", textAlign: "center", color: type === "error" ? "#dc2626" : "#059669", fontWeight: 500 }}>{msg}</p>
    </div>
  );



  const SubmitBtn = ({ loading: l, text }: { loading: boolean; text: string }) => (
    <button type="submit" disabled={l}
      style={{
        width: "100%",
        padding: "14px",
        borderRadius: "12px",
        border: "none",
        background: l ? "#93c5fd" : "var(--primary)",
        color: "white",
        fontSize: "15px",
        fontWeight: 700,
        cursor: l ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        marginTop: "8px",
      }}
      onMouseEnter={(e) => { if (!l) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(59,130,246,0.35)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {l ? "Please wait..." : text}
    </button>
  );

  const features = [
    { icon: "🤖", title: "AI Matching", desc: "Smart job recommendations" },
    { icon: "🔄", title: "Auto-Updated", desc: "New jobs every 10 minutes" },
    { icon: "🌍", title: "Global Jobs", desc: "20+ countries covered" },
    { icon: "⚡", title: "Lightning Fast", desc: "Search thousands instantly" },
  ];

  // ===== CENTERED VIEWS (verify, forgot, reset) =====
  if (view === "verify" || view === "forgot" || view === "reset") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "24px" }}>
        <div style={{ position: "absolute", top: "20px", right: "20px" }}><ThemeToggle /></div>
        <div style={{ width: "100%", maxWidth: "440px", animation: "scaleIn 0.5s ease both" }}>
          <div style={{ background: "var(--card)", borderRadius: "24px", border: "1px solid var(--border)", padding: "40px", boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <Image src="/logo.png" alt="Catch Jobs" width={48} height={48} className="rounded-xl" style={{ margin: "0 auto 16px" }} />
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
                {view === "verify" ? "Check your email" : view === "forgot" ? "Forgot password?" : "Reset password"}
              </h1>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                {view === "verify" && <>We sent a 6-digit code to <strong style={{ color: "var(--text)" }}>{email}</strong></>}
                {view === "forgot" && "Enter your email and we'll send you a reset code"}
                {view === "reset" && <>Enter the code sent to <strong style={{ color: "var(--text)" }}>{email}</strong></>}
              </p>
            </div>

            {error && <Alert type="error" msg={error} />}
            {success && <Alert type="success" msg={success} />}

            <form onSubmit={view === "verify" ? handleVerify : view === "forgot" ? handleForgot : handleReset}>
              {view === "verify" && (
                <InputField icon="🔑" label="Verification Code" type="text" value={code}
                  onChange={(e: any) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" required maxLength={6}
                  style={{ textAlign: "center", fontSize: "24px", fontWeight: 800, letterSpacing: "0.3em" }} />
              )}
              {view === "forgot" && (
                <InputField icon="📧" label="Email Address" type="email" value={email}
                  onChange={(e: any) => setEmail(e.target.value)} placeholder="you@example.com" required />
              )}
              {view === "reset" && (
                <>
                  <InputField icon="🔑" label="Reset Code" type="text" value={code}
                    onChange={(e: any) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" required maxLength={6}
                    style={{ textAlign: "center", fontSize: "24px", fontWeight: 800, letterSpacing: "0.3em" }} />
                  <InputField icon="🔒" label="New Password" type="password" value={newPassword}
                    onChange={(e: any) => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                  <InputField icon="🔒" label="Confirm Password" type="password" value={confirmPassword}
                    onChange={(e: any) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </>
              )}
              <SubmitBtn loading={loading} text={
                view === "verify" ? "Verify & Create Account" : view === "forgot" ? "Send Reset Code" : "Reset Password"
              } />
            </form>

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              {view === "verify" && (
                <>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Didn't receive the code?{" "}
                    <button onClick={handleResend} disabled={resending}
                      style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>
                      {resending ? "Sending..." : "Resend"}
                    </button>
                  </p>
                  <button onClick={() => { setView("register"); setCode(""); clearMessages(); }}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", marginTop: "12px", cursor: "pointer" }}>
                    ← Back to register
                  </button>
                </>
              )}
              {view === "forgot" && (
                <button onClick={() => { setView("login"); clearMessages(); }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
                  ← Back to sign in
                </button>
              )}
              {view === "reset" && (
                <button onClick={() => { setView("forgot"); setCode(""); clearMessages(); }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
                  ← Back
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== LOGIN / REGISTER VIEW =====
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      {/* Left Panel */}
      <div style={{
        display: "none",
        width: "50%",
        background: "linear-gradient(135deg, #1e40af, #4f46e5, #7c3aed)",
        padding: "60px",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }} className="lg:!flex">
        {/* Background decoration */}
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "400px", animation: "slideUp 0.8s ease both" }}>
          <Image src="/logo.png" alt="Catch Jobs" width={72} height={72} className="rounded-2xl" style={{ margin: "0 auto 24px" }} />
          <h2 style={{ fontSize: "36px", fontWeight: 800, color: "white", marginBottom: "12px" }}>Catch Jobs</h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: "48px" }}>
            AI-powered job matching platform. Find your dream job from 5+ sources across 20+ countries.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "48px" }}>
            {features.map((f, i) => { const delay = `${i * 0.15}s`; return (
              <div key={i} style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "20px",
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.1)",
                animation: `slideUp 0.6s ease ${delay} both`,
                transition: "all 0.3s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              >
                <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>{f.icon}</span>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "white", marginBottom: "4px" }}>{f.title}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{f.desc}</p>
              </div>
            ); })}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "40px", animation: "slideUp 0.8s ease 0.6s both" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "32px", fontWeight: 800, color: "white" }}>10K+</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>Jobs</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "32px", fontWeight: 800, color: "white" }}>5+</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>Sources</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "32px", fontWeight: 800, color: "white" }}>24/7</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>Scanning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative" }}>
        <div style={{ position: "absolute", top: "20px", right: "20px" }}><ThemeToggle /></div>

        <div style={{ width: "100%", maxWidth: "420px", animation: "slideIn 0.8s ease both" }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ alignItems: "center", gap: "12px", marginBottom: "32px" }}>
            <Image src="/logo.png" alt="Catch Jobs" width={40} height={40} className="rounded-xl" />
            <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>Catch Jobs</span>
          </div>

          <h2 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text)", marginBottom: "6px" }}>
            {view === "register" ? "Create your account" : "Welcome back"}
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "32px" }}>
            {view === "register" ? "Start catching your dream job today" : "Sign in to continue to your dashboard"}
          </p>

          {error && <Alert type="error" msg={error} />}
          {success && <Alert type="success" msg={success} />}

          <form onSubmit={view === "register" ? handleRegister : handleLogin}>
            {view === "register" && (
              <InputField icon="👤" label="Full Name" type="text" value={fullName}
                onChange={(e: any) => setFullName(e.target.value)} placeholder="Ahmed Hassan" required />
            )}
            <InputField icon="📧" label="Email Address" type="email" value={email}
              onChange={(e: any) => setEmail(e.target.value)} placeholder="you@example.com" required />
            <InputField icon="🔒" label="Password" type="password" value={password}
              onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••••" required />

            {view === "login" && (
              <div style={{ textAlign: "right", marginBottom: "8px" }}>
                <button type="button" onClick={() => { setView("forgot"); clearMessages(); }}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Forgot password?
                </button>
              </div>
            )}

            <SubmitBtn loading={loading} text={view === "register" ? "Send Verification Code" : "Sign In"} />
          </form>

          <p style={{ textAlign: "center", fontSize: "14px", color: "var(--text-muted)", marginTop: "28px" }}>
            {view === "register" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setView(view === "register" ? "login" : "register"); clearMessages(); }}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
              {view === "register" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
