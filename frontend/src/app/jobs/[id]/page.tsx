"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";
import Link from "next/link";

const sourceConfig: Record<string, { label: string; color: string; bg: string }> = {
  remoteok: { label: "RemoteOK", color: "#16a34a", bg: "#dcfce7" },
  wuzzuf: { label: "Wuzzuf", color: "#2563eb", bg: "#dbeafe" },
  linkedin: { label: "LinkedIn", color: "#0077b5", bg: "#e0f2fe" },
  arbeitnow: { label: "Arbeitnow", color: "#7c3aed", bg: "#ede9fe" },
  jobicy: { label: "Jobicy", color: "#db2777", bg: "#fce7f3" },
};

const avatarColors = ["#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316","#6366f1","#14b8a6"];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const h = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return h + "h ago";
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return days + "d ago";
  if (days < 30) return Math.floor(days / 7) + "w ago";
  return Math.floor(days / 30) + "mo ago";
}

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (!params.id) return;
    api.getJob(params.id as string)
      .then(setJob)
      .catch(() => setError("Job not found"))
      .finally(() => setLoading(false));
    api.getSavedJobs()
      .then((jobs: any[]) => { if (jobs.some((j: any) => j.id === params.id)) setSaved(true); })
      .catch(() => {});
  }, [params.id]);

  function handleSave() {
    if (!job) return;
    api.saveJob(job.id).then(() => {
      setSaved(true);
      setSaveMsg("Job saved!");
      setTimeout(() => setSaveMsg(""), 2000);
    });
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (error || !job) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", background: "var(--bg)" }}>
      <span style={{ fontSize: "56px" }}>😕</span>
      <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{error || "Job not found"}</p>
      <Link href="/dashboard" style={{ padding: "10px 24px", borderRadius: "10px", background: "var(--primary)", color: "white", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>← Back to Dashboard</Link>
    </div>
  );

  const src = sourceConfig[job.source] || { label: job.source, color: "#6b7280", bg: "#f3f4f6" };
  const avatarBg = getAvatarColor(job.company_name || "?");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Toast */}
      {saveMsg && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 100,
          padding: "12px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: 600,
          background: "#10b981", color: "white", boxShadow: "0 8px 24px rgba(16,185,129,0.3)",
          animation: "slideIn 0.4s ease",
        }}>
          ✓ {saveMsg}
        </div>
      )}

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50, width: "100%",
        borderBottom: "1px solid var(--border)", background: "var(--card)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <Image src="/logo.png" alt="Catch Jobs" width={32} height={32} className="rounded-lg" />
            <span className="gradient-text" style={{ fontSize: "18px", fontWeight: 800 }}>Catch Jobs</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ThemeToggle />
            <Link href="/dashboard" style={{
              padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
              border: "1px solid var(--border)", color: "var(--text-light)", textDecoration: "none",
              transition: "all 0.2s ease",
            }}>← Dashboard</Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${src.color}15, ${src.color}05)`,
        borderBottom: "1px solid var(--border)",
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", animation: "slideUp 0.6s ease both" }}>
          {/* Source & Time */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <span style={{
              padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
              color: src.color, background: src.bg,
            }}>
              {src.label}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
              🕐 {timeAgo(job.created_at)}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, lineHeight: 1.2,
            color: "var(--text)", marginBottom: "20px",
          }}>
            {job.title}
          </h1>

          {/* Company */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: avatarBg, color: "white", fontSize: "20px", fontWeight: 800,
              boxShadow: `0 4px 12px ${avatarBg}40`,
            }}>
              {(job.company_name || "?")[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
                {job.company_name || "Unknown Company"}
              </p>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "2px" }}>
                📍 {job.location || job.country || "Remote"}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
            {job.country && (
              <span style={{
                padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-light)",
              }}>
                🌍 {job.country}
              </span>
            )}
            {job.posted_date && (
              <span style={{
                padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-light)",
              }}>
                📅 {new Date(job.posted_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            )}
            <span style={{
              padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
              background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-light)",
            }}>
              📡 {src.label}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <a href={job.job_url} target="_blank" rel="noopener noreferrer"
              style={{
                flex: "1 1 200px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "14px 28px", borderRadius: "12px", fontSize: "15px", fontWeight: 700,
                background: "var(--primary)", color: "white", textDecoration: "none",
                transition: "all 0.2s ease", boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(59,130,246,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(59,130,246,0.3)"; }}
            >
              🚀 Apply Now
            </a>
            <button onClick={handleSave}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "14px 28px", borderRadius: "12px", fontSize: "15px", fontWeight: 700,
                background: saved ? "#ef4444" : "var(--card)", color: saved ? "white" : "var(--text-light)",
                border: saved ? "none" : "1px solid var(--border)", cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {saved ? "♥ Saved" : "♡ Save Job"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Job Description */}
        {job.description ? (
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px",
            padding: "32px", marginBottom: "24px", animation: "slideUp 0.6s ease 0.2s both",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              📝 Job Description
            </h2>
            <div style={{ fontSize: "14px", lineHeight: 1.8, color: "var(--text-light)", whiteSpace: "pre-wrap" }}>
              {job.description}
            </div>
          </div>
        ) : (
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px",
            padding: "48px 32px", textAlign: "center", marginBottom: "24px", animation: "slideUp 0.6s ease 0.2s both",
          }}>
            <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>📄</span>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>No description available</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Visit the original posting to see full job details
            </p>
            <a href={job.job_url} target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "10px 24px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                background: "var(--primary)", color: "white", textDecoration: "none",
              }}>
              View Original Posting →
            </a>
          </div>
        )}

        {/* Job Details Sidebar */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px",
          padding: "24px", marginBottom: "24px", animation: "slideUp 0.6s ease 0.3s both",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>
            📋 Job Details
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[
              { label: "Company", value: job.company_name || "Unknown", icon: "🏢" },
              { label: "Location", value: job.location || job.country || "Remote", icon: "📍" },
              { label: "Country", value: job.country || "Not specified", icon: "🌍" },
              { label: "Source", value: src.label, icon: "📡" },
              { label: "Posted", value: job.posted_date ? new Date(job.posted_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Unknown", icon: "📅" },
              { label: "Added", value: timeAgo(job.created_at), icon: "🕐" },
            ].map((detail, i) => (
              <div key={i} style={{
                padding: "14px", borderRadius: "12px", background: "var(--hover-bg)",
              }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {detail.icon} {detail.label}
                </p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{detail.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: "center", paddingTop: "8px", animation: "slideUp 0.6s ease 0.4s both" }}>
          <Link href="/dashboard" style={{
            fontSize: "14px", fontWeight: 600, color: "var(--primary)", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "10px 20px", borderRadius: "10px", transition: "all 0.2s ease",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            ← Back to all jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
