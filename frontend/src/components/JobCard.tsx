"use client";

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

const sourceConfig: Record<string, { bg: string; text: string; label: string }> = {
  remoteok:  { bg: "bg-emerald-50", text: "text-emerald-700", label: "RemoteOK" },
  wuzzuf:    { bg: "bg-blue-50",    text: "text-blue-700",    label: "Wuzzuf" },
  linkedin:  { bg: "bg-sky-50",     text: "text-sky-700",     label: "LinkedIn" },
  arbeitnow: { bg: "bg-violet-50",  text: "text-violet-700",  label: "Arbeitnow" },
  jobicy:    { bg: "bg-amber-50",   text: "text-amber-700",   label: "Jobicy" },
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
  const src = sourceConfig[job.source] || { bg: "bg-gray-50", text: "text-gray-600", label: job.source };

  return (
    <div className="card p-5 flex flex-col justify-between animate-fade-up">
      {/* Top Section */}
      <div>
        {/* Source + Time */}
        <div className="flex items-center justify-between mb-3">
          <span className={`badge ${src.bg} ${src.text}`}>{src.label}</span>
          <span className="text-xs text-gray-400 font-medium">{timeAgo(job.created_at)}</span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-gray-900 leading-snug mb-2 line-clamp-2">
          {job.title}
        </h3>

        {/* Company */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-gray-400">
              {(job.company_name || "?")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 leading-tight">
              {job.company_name || "Unknown Company"}
            </p>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">
              {job.location || job.country || "Remote"}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.country && (
            <span className="chip bg-gray-50 text-gray-500">
              🌍 {job.country}
            </span>
          )}
          {job.posted_date && (
            <span className="chip bg-gray-50 text-gray-500">
              📅 {new Date(job.posted_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-[13px] text-gray-400 leading-relaxed line-clamp-2 mb-3">
            {job.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100 mt-auto">
        <a
          href={job.job_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary flex-1 text-[13px] py-2.5"
        >
          Apply Now →
        </a>
        {onSave && (
          <button
            onClick={() => onSave(job.id)}
            className={`btn text-[13px] py-2.5 px-4 ${
              saved
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "btn-outline"
            }`}
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
