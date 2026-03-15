"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";
import Link from "next/link";

const sourceConfig: Record<string, { label: string; emoji: string }> = {
  remoteok: { label: "RemoteOK", emoji: "🟢" },
  wuzzuf: { label: "Wuzzuf", emoji: "🔵" },
  linkedin: { label: "LinkedIn", emoji: "🔷" },
  arbeitnow: { label: "Arbeitnow", emoji: "🟣" },
  jobicy: { label: "Jobicy", emoji: "🟠" },
};

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
      .then((jobs: any[]) => {
        if (jobs.some((j: any) => j.id === params.id)) setSaved(true);
      })
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}></div>
    </div>
  );

  if (error || !job) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)" }}>
      <span className="text-5xl">😕</span>
      <p className="text-lg font-semibold" style={{ color: "var(--text)" }}>{error || "Job not found"}</p>
      <Link href="/dashboard" className="btn btn-primary text-sm">← Back to Dashboard</Link>
    </div>
  );

  const src = sourceConfig[job.source] || { label: job.source, emoji: "⚪" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {saveMsg && (
        <div className="fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{ background: "var(--success)", color: "white" }}>
          ✓ {saveMsg}
        </div>
      )}

      <header className="glass-header sticky top-0 z-50 w-full" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-3.5 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Catch Jobs" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-extrabold gradient-text">Catch Jobs</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard" className="btn btn-outline text-xs py-2 px-4">← Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="rounded-2xl p-6 sm:p-8 mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between mb-4">
            <span className="badge" style={{ background: "var(--hover-bg)", color: "var(--text-light)" }}>
              {src.emoji} {src.label}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              {timeAgo(job.created_at)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 leading-tight" style={{ color: "var(--text)" }}>
            {job.title}
          </h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--hover-bg)" }}>
              <span className="text-lg font-bold" style={{ color: "var(--text-muted)" }}>
                {(job.company_name || "?")[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--text)" }}>
                {job.company_name || "Unknown Company"}
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {job.location || job.country || "Remote"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {job.country && (
              <span className="chip" style={{ background: "var(--hover-bg)", color: "var(--text-light)" }}>
                🌍 {job.country}
              </span>
            )}
            {job.posted_date && (
              <span className="chip" style={{ background: "var(--hover-bg)", color: "var(--text-light)" }}>
                📅 {new Date(job.posted_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            )}
            <span className="chip" style={{ background: "var(--hover-bg)", color: "var(--text-light)" }}>
              📡 {src.label}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a href={job.job_url} target="_blank" rel="noopener noreferrer"
              className="btn btn-primary flex-1 text-center py-3 text-base">
              Apply Now →
            </a>
            <button onClick={handleSave}
              className="btn py-3 px-6 text-base"
              style={saved
                ? { background: "var(--primary)", color: "white" }
                : { background: "var(--hover-bg)", color: "var(--text-light)", border: "1px solid var(--border)" }
              }>
              {saved ? "✓ Saved" : "💾 Save Job"}
            </button>
          </div>
        </div>

        {job.description && (
          <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Job Description</h2>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-light)" }}>
              {job.description}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-sm font-semibold transition" style={{ color: "var(--primary)" }}>
            ← Back to all jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
