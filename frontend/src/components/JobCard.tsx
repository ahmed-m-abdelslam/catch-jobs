"use client";

import Link from "next/link";
import { useState } from "react";

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

const sourceConfig: Record<string, { label: string; color: string; bg: string }> = {
  remoteok: { label: "RemoteOK", color: "#16a34a", bg: "#dcfce7" },
  wuzzuf: { label: "Wuzzuf", color: "#2563eb", bg: "#dbeafe" },
  linkedin: { label: "LinkedIn", color: "#0077b5", bg: "#e0f2fe" },
  arbeitnow: { label: "Arbeitnow", color: "#7c3aed", bg: "#ede9fe" },
  jobicy: { label: "Jobicy", color: "#db2777", bg: "#fce7f3" },
};

const avatarColors = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

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

export default function JobCard({ job, onSave, saved }: { job: Job; onSave?: (id: string) => void; saved?: boolean }) {
  const src = sourceConfig[job.source] || { label: job.source, color: "#6b7280", bg: "#f3f4f6" };
  const avatarBg = getAvatarColor(job.company_name || "?");
  const [expanded, setExpanded] = useState(false);
  const hasLongDesc = job.description && job.description.length > 120;

  return (
    <div
      className="animate-fade-up"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "0",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        height: expanded ? "auto" : "320px",
        minHeight: "320px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.12)";
        e.currentTarget.style.borderColor = src.color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Source color top bar */}
      <div style={{ height: "3px", background: src.color, width: "100%", flexShrink: 0 }} />

      {/* Content area - fixed height */}
      <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Link href={`/jobs/${job.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Header: source badge + time */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexShrink: 0 }}>
            <span style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              color: src.color,
              background: src.bg,
              letterSpacing: "0.02em",
            }}>
              {src.label}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>
              {timeAgo(job.created_at)}
            </span>
          </div>

          {/* Title - max 2 lines */}
          <h3 style={{
            fontSize: "15px",
            fontWeight: 700,
            lineHeight: 1.4,
            marginBottom: "12px",
            color: "var(--text)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            {job.title}
          </h3>

          {/* Company info */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexShrink: 0 }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: avatarBg,
              color: "white",
              fontSize: "14px",
              fontWeight: 800,
            }}>
              {(job.company_name || "?")[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-light)",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {job.company_name || "Unknown Company"}
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📍 {job.location || job.country || "Remote"}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px", flexShrink: 0 }}>
            {job.country && (
              <span style={{
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 500,
                background: "var(--hover-bg)",
                color: "var(--text-light)",
              }}>
                🌍 {job.country}
              </span>
            )}
            {job.posted_date && (
              <span style={{
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 500,
                background: "var(--hover-bg)",
                color: "var(--text-light)",
              }}>
                📅 {new Date(job.posted_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {/* Description - clipped or expanded */}
          {job.description && (
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              <p style={{
                fontSize: "12px",
                lineHeight: 1.6,
                color: "var(--text-muted)",
                display: expanded ? "block" : "-webkit-box",
                WebkitLineClamp: expanded ? undefined : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {job.description}
              </p>
            </div>
          )}
        </Link>

        {/* Show more/less button */}
        {hasLongDesc && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
            style={{
              background: "none",
              border: "none",
              padding: "4px 0",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--primary)",
              cursor: "pointer",
              textAlign: "left",
              flexShrink: 0,
              marginTop: "4px",
            }}
          >
            {expanded ? "Show less ↑" : "Show more ↓"}
          </button>
        )}
      </div>

      {/* Actions - always at bottom */}
      <div style={{
        display: "flex",
        gap: "8px",
        padding: "14px 20px",
        borderTop: "1px solid var(--border)",
        background: "var(--hover-bg)",
        flexShrink: 0,
      }}>
        <a
          href={job.job_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            background: "var(--primary)",
            color: "white",
            textDecoration: "none",
            transition: "all 0.2s ease",
          }}
        >
          Apply Now →
        </a>
        {onSave && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(job.id); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              border: saved ? "none" : "1px solid var(--border)",
              background: saved ? "#ef4444" : "var(--card)",
              color: saved ? "white" : "var(--text-muted)",
              fontSize: "18px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            title={saved ? "Unsave" : "Save"}
          >
            {saved ? "♥" : "♡"}
          </button>
        )}
      </div>
    </div>
  );
}
