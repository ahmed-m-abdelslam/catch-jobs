"use client";

import { Job, api } from "@/lib/api";
import { useState } from "react";

interface JobCardProps {
  job: Job;
  onSave?: () => void;
  showSimilarity?: boolean;
}

export default function JobCard({ job, onSave, showSimilarity }: JobCardProps) {
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      if (saved) {
        await api.unsaveJob(job.id);
        setSaved(false);
      } else {
        await api.saveJob(job.id);
        setSaved(true);
      }
      onSave?.();
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
          <p className="text-gray-600 mt-1">
            {job.company_name || "Company not listed"}
          </p>
          <div className="flex gap-3 mt-2 text-sm text-gray-500">
            {job.location && <span>{job.location}</span>}
            {job.country && <span>· {job.country}</span>}
            <span>· {job.source}</span>
          </div>
          {job.description && (
            <p className="mt-3 text-gray-700 text-sm line-clamp-3">
              {job.description.replace(/<[^>]*>/g, "").slice(0, 300)}...
            </p>
          )}
          {showSimilarity && job.similarity_score !== null && (
            <div className="mt-2">
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {Math.round(job.similarity_score * 100)}% match
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 ml-4">
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 text-center"
          >
            Apply
          </a>
          <button
            onClick={handleSave}
            className={`px-4 py-2 text-sm rounded-lg border ${
              saved
                ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      {job.posted_date && (
        <p className="mt-3 text-xs text-gray-400">
          Posted: {new Date(job.posted_date).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
