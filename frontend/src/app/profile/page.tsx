"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Image from "next/image";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const avatarRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMe().then((u: any) => { setUser(u); setFullName(u.full_name); if (u.suggested_titles) { try { setSuggestedTitles(JSON.parse(u.suggested_titles)); } catch {} } }).catch(() => window.location.href = "/login");
  }, []);

  async function handleSave() {
    setSaving(true); setMsg("");
    try {
      const updated = await api.updateProfile(fullName);
      setUser(updated); setMsg("Profile updated!");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Failed to update"); }
    finally { setSaving(false); }
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("avatar");
    try {
      const result = await api.uploadAvatar(file);
      setUser((prev: any) => ({ ...prev, avatar_url: result.avatar_url }));
      setMsg("Photo updated!");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) { setMsg(err.message || "Upload failed"); }
    finally { setUploading(""); }
  }

  async function handleCV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("cv");
    try {
      const result = await api.uploadCV(file);
      setUser((prev: any) => ({ ...prev, cv_url: result.filename || "uploaded" }));
      setMsg("CV uploaded! Analyzing with AI...");
      // Auto-analyze CV
      try {
        setAnalyzing(true);
        const analysis = await api.analyzeCV();
        setSuggestedTitles(analysis.suggested_titles || []);
        setMsg("CV analyzed! Job titles suggested.");
        setTimeout(() => setMsg(""), 3000);
      } catch (err: any) {
        setMsg("CV uploaded but analysis failed: " + (err.message || ""));
        setTimeout(() => setMsg(""), 5000);
      } finally {
        setAnalyzing(false);
      }
    } catch (err: any) { setMsg(err.message || "Upload failed"); }
    finally { setUploading(""); }
  }

  async function handleRemoveCV() {
    try {
      await api.removeCV();
      setUser((prev: any) => ({ ...prev, cv_url: null, suggested_titles: null }));
      setSuggestedTitles([]);
      setMsg("CV removed");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Failed to remove CV"); }
  }

  if (!user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: "40px", height: "40px", border: "4px solid var(--border)", borderTop: "4px solid var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        
        {/* Back Button */}
        <button onClick={() => window.location.href = "/dashboard"}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "var(--primary)", fontSize: "14px", fontWeight: 600, cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          ← Back to Dashboard
        </button>

        {msg && (
          <div style={{ padding: "12px 16px", borderRadius: "12px", background: msg.includes("fail") ? "#fee2e2" : "#d1fae5", color: msg.includes("fail") ? "#dc2626" : "#059669", fontSize: "14px", fontWeight: 600, marginBottom: "20px", textAlign: "center" }}>
            {msg}
          </div>
        )}

        {/* Profile Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "28px" }}>👤 My Profile</h1>
          
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px" }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "32px", color: "white", fontWeight: 700,
                border: "3px solid var(--border)", boxShadow: "0 4px 12px rgba(99,102,241,0.2)"
              }}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  user.full_name?.charAt(0)?.toUpperCase()
                )}
              </div>
              <button onClick={() => avatarRef.current?.click()}
                disabled={uploading === "avatar"}
                style={{
                  position: "absolute", bottom: "-4px", right: "-4px",
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: "var(--primary)", color: "white", border: "2px solid var(--card)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", cursor: "pointer"
                }}>
                {uploading === "avatar" ? "..." : "📷"}
              </button>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
            </div>
            <div>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{user.full_name}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{user.email}</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Member since {new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase" }}>Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "15px", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
            />
          </div>

          {/* Email (read-only) */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase" }}>Email</label>
            <input type="email" value={user.email} readOnly
              style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--hover-bg)", color: "var(--text-muted)", fontSize: "15px", outline: "none", boxSizing: "border-box", cursor: "not-allowed" }}
            />
          </div>

          <button onClick={handleSave} disabled={saving || fullName === user.full_name}
            style={{
              width: "100%", padding: "14px", borderRadius: "12px", border: "none",
              background: fullName !== user.full_name ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--border)",
              color: fullName !== user.full_name ? "white" : "var(--text-muted)",
              fontSize: "15px", fontWeight: 700, cursor: fullName !== user.full_name ? "pointer" : "not-allowed",
              transition: "all 0.3s"
            }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* CV Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)", marginBottom: "16px" }}>📄 CV / Resume</h2>
          
          {user.cv_url ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderRadius: "12px", background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#10b98115", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>✅</div>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>CV Uploaded</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>PDF or Word document</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => cvRef.current?.click()}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Replace
                </button>
                <button onClick={handleRemoveCV}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #fee2e2", background: "#fee2e2", color: "#dc2626", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => cvRef.current?.click()}
              style={{
                padding: "32px", borderRadius: "12px", border: "2px dashed var(--border)",
                background: "var(--bg)", textAlign: "center", cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "#6366f108"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>{uploading === "cv" ? "⏳" : "📤"}</div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                {uploading === "cv" ? "Uploading..." : "Upload your CV"}
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>PDF or Word · Max 5MB</p>
            </div>
          )}
          <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={handleCV} />
        </div>

        {/* AI Suggested Job Titles */}
        {(suggestedTitles.length > 0 || analyzing) && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", marginTop: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🤖</div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>AI Suggested Job Titles</h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Based on your CV analysis</p>
              </div>
            </div>

            {analyzing ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", border: "4px solid var(--border)", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 600 }}>Analyzing your CV with AI...</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {suggestedTitles.map((title, i) => (
                  <div key={i} style={{
                    padding: "10px 18px", borderRadius: "12px",
                    background: "linear-gradient(135deg, #6366f110, #8b5cf610)",
                    border: "1px solid #6366f130",
                    fontSize: "14px", fontWeight: 600, color: "var(--text)",
                    display: "flex", alignItems: "center", gap: "8px",
                  }}>
                    <span style={{ fontSize: "16px" }}>💼</span>
                    {title}
                  </div>
                ))}
              </div>
            )}

            {suggestedTitles.length > 0 && !analyzing && (
              <button onClick={async () => {
                setAnalyzing(true);
                try {
                  const analysis = await api.analyzeCV();
                  setSuggestedTitles(analysis.suggested_titles || []);
                  setMsg("Titles refreshed!");
                  setTimeout(() => setMsg(""), 3000);
                } catch (err: any) { setMsg(err.message || "Refresh failed"); }
                finally { setAnalyzing(false); }
              }}
                style={{ marginTop: "16px", padding: "8px 16px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                🔄 Re-analyze CV
              </button>
            )}
          </div>
        )}

        {/* AI Suggested Job Titles */}
        {(suggestedTitles.length > 0 || analyzing) && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", marginTop: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🤖</div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>AI Suggested Job Titles</h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Based on your CV analysis</p>
              </div>
            </div>

            {analyzing ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", border: "4px solid var(--border)", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 600 }}>Analyzing your CV with AI...</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {suggestedTitles.map((title, i) => (
                  <div key={i} style={{
                    padding: "10px 18px", borderRadius: "12px",
                    background: "linear-gradient(135deg, #6366f110, #8b5cf610)",
                    border: "1px solid #6366f130",
                    fontSize: "14px", fontWeight: 600, color: "var(--text)",
                    display: "flex", alignItems: "center", gap: "8px",
                  }}>
                    <span style={{ fontSize: "16px" }}>💼</span>
                    {title}
                  </div>
                ))}
              </div>
            )}

            {suggestedTitles.length > 0 && !analyzing && (
              <button onClick={async () => {
                setAnalyzing(true);
                try {
                  const analysis = await api.analyzeCV();
                  setSuggestedTitles(analysis.suggested_titles || []);
                  setMsg("Titles refreshed!");
                  setTimeout(() => setMsg(""), 3000);
                } catch (err: any) { setMsg(err.message || "Refresh failed"); }
                finally { setAnalyzing(false); }
              }}
                style={{ marginTop: "16px", padding: "8px 16px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                🔄 Re-analyze CV
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
