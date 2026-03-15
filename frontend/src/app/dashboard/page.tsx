"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import JobCard from "@/components/JobCard";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";

type Tab = "recommended" | "saved" | "preferences" | "all";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("recommended");
  const [loading, setLoading] = useState(false);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newRemote, setNewRemote] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    api.getMe().then(setUser).catch(() => { window.location.href = "/login"; });
    api.getJobStats().then(setStats).catch(() => {});
    api.getSavedJobs().then((jobs: any[]) => { setSavedJobs(jobs); setSavedIds(new Set(jobs.map((j: any) => j.id))); }).catch(() => {});
    api.getPreferences().then(setPreferences).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "recommended") loadRecommended();
    if (activeTab === "all") { setCurrentPage(1); loadAllJobs(1); }
    if (activeTab === "saved") loadSaved();
    if (activeTab === "preferences") api.getPreferences().then(setPreferences);
  }, [activeTab]);

  function loadRecommended() {
    setLoading(true);
    api.getRecommended(30).then(setRecommendedJobs).finally(() => setLoading(false));
  }

  function loadSaved() {
    setLoading(true);
    api.getSavedJobs().then((j: any) => {
      setSavedJobs(j);
      setSavedIds(new Set(j.map((x: any) => x.id)));
    }).finally(() => setLoading(false));
  }

  function loadAllJobs(page: number = 1) {
    setLoading(true);
    api.getJobs({ page: String(page), page_size: String(pageSize) }).then((res: any) => {
      setAllJobs(res.jobs || []);
      setTotalPages(res.total_pages || 1);
      setTotalJobs(res.total || 0);
      setCurrentPage(res.page || 1);
    }).finally(() => setLoading(false));
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    loadAllJobs(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSave(id: string) {
    api.saveJob(id).then(() => {
      setSavedIds(prev => new Set(prev).add(id));
      setSaveMsg("Job saved!");
      setTimeout(() => setSaveMsg(""), 2000);
    });
  }

  function handleUnsave(id: string) {
    fetch(`/api/jobs/save/${id}/`, { method: "DELETE", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } })
      .then(() => {
        setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        setSavedJobs(prev => prev.filter(j => j.id !== id));
        setSaveMsg("Job removed from saved!");
        setTimeout(() => setSaveMsg(""), 2000);
      });
  }

  function addPref() {
    if (!newTitle || !newCountry) return;
    api.addPreference({ job_title: newTitle, country: newCountry, remote_allowed: newRemote })
      .then(() => { setNewTitle(""); setNewCountry(""); api.getPreferences().then(setPreferences); });
  }

  function delPref(id: string) {
    api.deletePreference(id).then(() => api.getPreferences().then(setPreferences));
  }

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: "recommended", label: "For You", icon: "✨" },
    { key: "all", label: "All Jobs", icon: "📋", count: totalJobs || (stats?.total_jobs) },
    { key: "saved", label: "Saved", icon: "💾", count: savedIds.size },
    { key: "preferences", label: "Preferences", icon: "⚙️" },
  ];

  const Spinner = () => (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-gray-400">Loading jobs...</p>
    </div>
  );

  const EmptyState = ({ icon, title, subtitle, action }: { icon: string; title: string; subtitle: string; action?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-lg font-semibold text-gray-700 mb-1">{title}</p>
      <p className="text-sm text-gray-400 mb-4">{subtitle}</p>
      {action}
    </div>
  );

  function renderPagination() {
    if (totalPages <= 1) return null;
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return (
      <div className="flex items-center justify-center gap-2 mt-8 mb-4">
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
          ← Prev
        </button>
        {pages.map((p, i) =>
          typeof p === "string" ? (
            <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
          ) : (
            <button key={p} onClick={() => goToPage(p)}
              className={`w-10 h-10 text-sm font-semibold rounded-lg transition ${
                p === currentPage ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}>{p}</button>
          )
        )}
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
          Next →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9]">
      {saveMsg && (
        <div className="fixed top-4 right-4 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg">
          ✓ {saveMsg}
        </div>
      )}

      <header className="glass-header sticky top-0 z-50 border-b border-gray-200/60 w-full">
        <div className="w-full px-5 sm:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Catch Jobs" width={36} height={36} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-extrabold gradient-text leading-tight">Catch Jobs</h1>
              {stats && (
                <p className="text-[11px] text-gray-400 font-medium">
                  {stats.total_jobs.toLocaleString()} jobs · {Object.keys(stats.by_source || {}).length} sources
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2.5 bg-gray-50 rounded-full px-3 py-1.5">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{user.full_name?.[0]?.toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">{user.full_name}</span>
              </div>
            )}
            <ThemeToggle />
            <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
              className="text-xs text-gray-400 hover:text-red-500 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="w-full px-5 sm:px-8 pt-5 pb-2">
        <div className="inline-flex gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab.key ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}>
              <span className="text-[13px]">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${
                  activeTab === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>{tab.count > 999 ? `${(tab.count / 1000).toFixed(1)}k` : tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full px-5 sm:px-8 py-5">

        {activeTab === "recommended" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">For You</h2>
                <p className="text-sm text-gray-400 mt-0.5">Personalized recommendations based on your preferences</p>
              </div>
              <button onClick={loadRecommended} className="btn btn-primary text-xs py-2 px-4">↻ Refresh</button>
            </div>
            {loading ? <Spinner /> : recommendedJobs.length === 0 ? (
              <EmptyState icon="✨" title="No recommendations yet" subtitle="Add preferences to get personalized job recommendations"
                action={<button onClick={() => setActiveTab("preferences")} className="btn btn-primary text-xs py-2">Set Preferences</button>} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recommendedJobs.map((job: any, i: number) => (
                  <div key={job.id} style={{ animationDelay: `${i * 0.03}s` }}>
                    <JobCard job={job} onSave={handleSave} saved={savedIds.has(job.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "all" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">All Jobs</h2>
                <p className="text-sm text-gray-400 mt-0.5">All available jobs · Newest first</p>
              </div>
              <button onClick={() => loadAllJobs(1)} className="btn btn-primary text-xs py-2 px-4">↻ Refresh</button>
            </div>
            {loading ? <Spinner /> : allJobs.length === 0 ? (
              <EmptyState icon="📋" title="No jobs available" subtitle="Jobs are being collected. Check back soon!" />
            ) : (
              <div>
                <p className="text-sm text-gray-400 mb-4 font-medium">
                  Showing <strong className="text-gray-700">{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalJobs)}</strong> of <strong className="text-gray-700">{totalJobs.toLocaleString()}</strong> jobs
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {allJobs.map((job: any, i: number) => (
                    <div key={job.id} style={{ animationDelay: `${i * 0.03}s` }}>
                      <JobCard job={job} onSave={handleSave} saved={savedIds.has(job.id)} />
                    </div>
                  ))}
                </div>
                {renderPagination()}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold text-gray-900">Saved Jobs</h2>
              {savedJobs.length > 0 && <span className="text-sm text-gray-400 font-medium">{savedJobs.length} saved</span>}
            </div>
            {loading ? <Spinner /> : savedJobs.length === 0 ? (
              <EmptyState icon="💾" title="No saved jobs" subtitle="Save jobs you're interested in to find them here"
                action={<button onClick={() => setActiveTab("all")} className="btn btn-primary text-xs py-2">Browse All Jobs</button>} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {savedJobs.map((job: any) => (
                  <div key={job.id} className="relative">
                    <JobCard job={job} saved={true} />
                    <button onClick={() => handleUnsave(job.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-full flex items-center justify-center transition-all shadow-sm"
                      title="Remove from saved">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "preferences" && (
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Preferences</h2>
            <p className="text-sm text-gray-400 mb-5">Set your job preferences to get better recommendations in "For You"</p>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Add Preference</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label">Job Title</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Software Engineer" className="input" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input type="text" value={newCountry} onChange={e => setNewCountry(e.target.value)}
                    placeholder="e.g. Egypt" className="input" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2.5 text-sm text-gray-600 font-medium cursor-pointer">
                    <input type="checkbox" checked={newRemote} onChange={e => setNewRemote(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                    Include Remote
                  </label>
                </div>
                <div className="flex items-end">
                  <button onClick={addPref} disabled={!newTitle || !newCountry}
                    className="btn w-full py-2.5 text-[13px] bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    + Add
                  </button>
                </div>
              </div>
            </div>
            {preferences.length === 0 ? (
              <EmptyState icon="⚙️" title="No preferences set" subtitle="Add your ideal job title and country to get personalized recommendations" />
            ) : (
              <div className="space-y-2.5">
                {preferences.map((pref: any) => (
                  <div key={pref.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🎯</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{pref.job_title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 font-medium">{pref.country}</span>
                          {pref.remote_allowed && <span className="badge bg-emerald-50 text-emerald-600">Remote OK</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => delPref(pref.id)}
                      className="text-xs text-gray-400 hover:text-red-500 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
