"use client";

import Link from "next/link";

interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  country: string;
  description: string | null;
  job_url: string;
  source: string;
  posted_date: string | null;
  created_at: string;
}

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

export default function JobCard({ job, onSave, saved }: { job: Job; onSave?: (id: string) => void; saved?: boolean }) {
  const src = sourceConfig[job.source] || { label: job.source, emoji: "⚪" };

  return (
    <div className="card p-5 flex flex-col justify-between animate-fade-up">
      <Link href={`/jobs/${job.id}`} className="block">
        <div className="flex items-center justify-between mb-3">
          <span className="badge" style={{ background: "var(--hover-bg)", color: "var(--text-light)" }}>
            {src.emoji} {src.label}
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{timeAgo(job.created_at)}</span>
        </div>

        <h3 className="text-[15px] font-bold leading-snug mb-2 line-clamp-2" style={{ color: "var(--text)" }}>
          {job.title}
        </h3>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--hover-bg)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              {(job.company_name || "?")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-light)" }}>
              {job.company_name || "Unknown Company"}
            </p>
            <p className="text-xs leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
              {job.location || job.country || "Remote"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.country && (
            <span className="chip" style={{ background: "var(--hover-bg)", color: "var(--text-light)" }}>
              🌍 {job.country}
            </span>
          )}
          {job.posted_date && (
            <span className="chip" style={{ background: "var(--hover-bg)", color: "var(--text-light)" }}>
              📅 {new Date(job.posted_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {job.description && (
          <p className="text-[13px] leading-relaxed line-clamp-2 mb-3" style={{ color: "var(--text-muted)" }}>
            {job.description}
          </p>
        )}
      </Link>

      <div className="flex gap-2 pt-3 mt-auto" style={{ borderTop: "1px solid var(--border)" }}>
        <a href={job.job_url} target="_blank" rel="noopener noreferrer"
          className="btn btn-primary flex-1 text-[13px] py-2.5">
          Apply Now →
        </a>
        {onSave && (
          <button onClick={() => onSave(job.id)}
            className="btn text-[13px] py-2.5 px-4"
            style={saved ? { background: "var(--primary)", color: "white" } : { background: "var(--hover-bg)", color: "var(--text-light)", border: "1px solid var(--border)" }}>
            {saved ? "✓ Saved" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
