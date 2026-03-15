"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import JobCard from "@/components/JobCard";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Tab = "recommended" | "saved" | "preferences" | "all";

export default function DashboardPage() {
  const router = useRouter();
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
  const [notifCount, setNotifCount] = useState(0);
  const [quickSearch, setQuickSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const pageSize = 20;

  useEffect(() => {
    api.getMe().then(setUser).catch(() => { window.location.href = "/login"; });
    api.getJobStats().then(setStats).catch(() => {});
    api.getSavedJobs().then((jobs: any[]) => { setSavedJobs(jobs); setSavedIds(new Set(jobs.map((j: any) => j.id))); }).catch(() => {});
    api.getPreferences().then(setPreferences).catch(() => {});
    api.getNotificationCount().then((r: any) => setNotifCount(r.count || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "recommended") loadRecommended();
    if (activeTab === "all") { setCurrentPage(1); loadAllJobs(1); }
    if (activeTab === "saved") loadSaved();
    if (activeTab === "preferences") api.getPreferences().then(setPreferences);
  }, [activeTab]);

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

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

  function loadAllJobs(page: number = 1, search?: string) {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), page_size: String(pageSize) };
    if (search) params.search = search;
    api.getJobs(params).then((res: any) => {
      setAllJobs(res.jobs || []);
      setTotalPages(res.total_pages || 1);
      setTotalJobs(res.total || 0);
      setCurrentPage(res.page || 1);
    }).finally(() => setLoading(false));
  }

  function handleQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    setActiveTab("all");
    setCurrentPage(1);
    loadAllJobs(1, quickSearch.trim());
    setShowSearch(false);
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    loadAllJobs(page, quickSearch || undefined);
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
    fetch(`/api/jobs/save/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } })
      .then(() => {
        setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        setSavedJobs(prev => prev.filter(j => j.id !== id));
        setSaveMsg("Job removed!");
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
      <div className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}></div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading jobs...</p>
    </div>
  );

  const EmptyState = ({ icon, title, subtitle, action }: { icon: string; title: string; subtitle: string; action?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center py-24 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-lg font-semibold mb-1" style={{ color: "var(--text)" }}>{title}</p>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
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
          className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-light)" }}>
          ← Prev
        </button>
        {pages.map((p, i) =>
          typeof p === "string" ? (
            <span key={`dots-${i}`} className="px-2" style={{ color: "var(--text-muted)" }}>...</span>
          ) : (
            <button key={p} onClick={() => goToPage(p)}
              className="w-10 h-10 text-sm font-semibold rounded-lg transition"
              style={p === currentPage
                ? { background: "var(--primary)", color: "white" }
                : { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-light)" }
              }>{p}</button>
          )
        )}
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-light)" }}>
          Next →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--bg)" }}>
      {saveMsg && (
        <div className="fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{ background: "var(--success)", color: "white" }}>
          ✓ {saveMsg}
        </div>
      )}

      <header className="glass-header sticky top-0 z-50 w-full" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-full px-5 sm:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Catch Jobs" width={36} height={36} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-extrabold gradient-text leading-tight">Catch Jobs</h1>
              {stats && (
                <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  {stats.total_jobs.toLocaleString()} jobs · {Object.keys(stats.by_source || {}).length} sources
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search */}
            {showSearch ? (
              <form onSubmit={handleQuickSearch} className="flex items-center gap-2">
                <input ref={searchRef} type="text" value={quickSearch} onChange={e => setQuickSearch(e.target.value)}
                  placeholder="Search jobs..." className="input text-sm py-1.5 px-3 w-48"
                  onBlur={() => { if (!quickSearch) setShowSearch(false); }} />
                <button type="submit" className="btn btn-primary text-xs py-1.5 px-3">Go</button>
              </form>
            ) : (
              <button onClick={() => setShowSearch(true)}
                className="w-9 h-9 flex items-center justify-center rounded-lg transition"
                style={{ background: "var(--hover-bg)", color: "var(--text-light)" }}
                title="Search">
                🔍
              </button>
            )}

            {/* Notification Bell */}
            <button
              style={{
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text-light)",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s ease",
                fontSize: "18px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover-bg)"; e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.transform = "scale(1)"; }}
              title="Notifications">
              🔔
              {notifCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 800,
                  borderRadius: "50%",
                  background: "#ef4444",
                  color: "white",
                  border: "2px solid var(--bg)",
                  animation: "pulse-soft 2s ease infinite",
                }}>
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {/* User Avatar & Dropdown */}
            {user && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    const menu = document.getElementById("user-dropdown");
                    if (menu) menu.style.display = menu.style.display === "none" ? "block" : "none";
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 14px 6px 6px",
                    borderRadius: "100px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{ color: "white", fontSize: "13px", fontWeight: 800 }}>{user.full_name?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="hidden sm:inline" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{user.full_name}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="hidden sm:inline" style={{ color: "var(--text-muted)" }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <div id="user-dropdown" style={{
                  display: "none",
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: "200px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                  padding: "8px",
                  zIndex: 100,
                }}>
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{user.full_name}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{user.email}</p>
                  </div>
                  <button onClick={() => { setActiveTab("preferences"); const m = document.getElementById("user-dropdown"); if(m) m.style.display="none"; }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: "var(--text-light)", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >⚙️ Preferences</button>
                  <button onClick={() => { setActiveTab("saved"); const m = document.getElementById("user-dropdown"); if(m) m.style.display="none"; }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: "var(--text-light)", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >💾 Saved Jobs</button>
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: "4px", paddingTop: "4px" }}>
                    <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
                      style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: "#ef4444", transition: "background 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >🚪 Logout</button>
                  </div>
                </div>
              </div>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && activeTab === "recommended" && (
        <div className="w-full px-5 sm:px-8 pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "💼", value: stats.total_jobs.toLocaleString(), label: "Total Jobs", color: "var(--primary)", bg: "#3b82f615" },
              { icon: "🔗", value: Object.keys(stats.by_source || {}).length, label: "Sources", color: "var(--success)", bg: "#10b98115" },
              { icon: "🌍", value: Object.keys(stats.by_country || {}).length, label: "Countries", color: "#8b5cf6", bg: "#8b5cf615" },
              { icon: "♥", value: savedIds.size, label: "Saved Jobs", color: savedIds.size > 0 ? "#ef4444" : "#9ca3af", bg: savedIds.size > 0 ? "#ef444415" : "#9ca3af15" },
            ].map((s, i) => (
              <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px", transition: "all 0.3s ease", cursor: "default" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: s.bg, fontSize: "20px", flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: "22px", fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</p>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full px-5 sm:px-8 pt-5 pb-2">
        <div style={{ display: "inline-flex", gap: "4px", padding: "4px", borderRadius: "14px", background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 700,
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                background: activeTab === tab.key ? "var(--primary)" : "transparent",
                color: activeTab === tab.key ? "white" : "var(--text-light)",
                boxShadow: activeTab === tab.key ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
                transform: activeTab === tab.key ? "scale(1.02)" : "scale(1)",
              }}>
              <span style={{ fontSize: "18px" }}>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "100px",
                  marginLeft: "2px",
                  background: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "var(--hover-bg)",
                  color: activeTab === tab.key ? "white" : "var(--text-muted)",
                }}>{tab.count > 999 ? `${(tab.count / 1000).toFixed(1)}k` : tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full px-5 sm:px-8 py-5" key={activeTab}>

        {activeTab === "recommended" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>For You</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Personalized recommendations based on your preferences</p>
              </div>
              <button onClick={loadRecommended} className="btn btn-primary text-xs py-2 px-4">↻ Refresh</button>
            </div>
            {loading ? <Spinner /> : recommendedJobs.length === 0 ? (
              <EmptyState icon="✨" title="No recommendations yet" subtitle="Add preferences to get personalized job recommendations"
                action={<button onClick={() => setActiveTab("preferences")} className="btn btn-primary text-xs py-2">Set Preferences</button>} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 card-grid">
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
                <h2 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>
                  {quickSearch ? `Results for "${quickSearch}"` : "All Jobs"}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {quickSearch ? `${totalJobs} jobs found` : "All available jobs · Newest first"}
                </p>
              </div>
              <div className="flex gap-2">
                {quickSearch && (
                  <button onClick={() => { setQuickSearch(""); loadAllJobs(1); }} className="btn btn-outline text-xs py-2 px-4">Clear Search</button>
                )}
                <button onClick={() => loadAllJobs(1, quickSearch || undefined)} className="btn btn-primary text-xs py-2 px-4">↻ Refresh</button>
              </div>
            </div>
            {loading ? <Spinner /> : allJobs.length === 0 ? (
              <EmptyState icon="📋" title="No jobs found" subtitle={quickSearch ? "Try a different search term" : "Jobs are being collected. Check back soon!"} />
            ) : (
              <div>
                <p className="text-sm mb-4 font-medium" style={{ color: "var(--text-muted)" }}>
                  Showing <strong style={{ color: "var(--text)" }}>{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalJobs)}</strong> of <strong style={{ color: "var(--text)" }}>{totalJobs.toLocaleString()}</strong> jobs
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 card-grid">
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
              <h2 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>Saved Jobs</h2>
              {savedJobs.length > 0 && <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{savedJobs.length} saved</span>}
            </div>
            {loading ? <Spinner /> : savedJobs.length === 0 ? (
              <EmptyState icon="💾" title="No saved jobs" subtitle="Save jobs you're interested in to find them here"
                action={<button onClick={() => setActiveTab("all")} className="btn btn-primary text-xs py-2">Browse All Jobs</button>} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 card-grid">
                {savedJobs.map((job: any) => (
                  <div key={job.id} className="relative">
                    <JobCard job={job} saved={true} />
                    <button onClick={() => handleUnsave(job.id)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm"
                      style={{ background: "var(--danger)", color: "white" }}
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
            <h2 className="text-xl font-extrabold mb-2" style={{ color: "var(--text)" }}>Preferences</h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Set your job preferences to get better recommendations in "For You"</p>
            <div className="rounded-xl shadow-sm p-6 mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Add Preference</h3>
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
                  <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer" style={{ color: "var(--text-light)" }}>
                    <input type="checkbox" checked={newRemote} onChange={e => setNewRemote(e.target.checked)}
                      className="w-4 h-4 rounded" />
                    Include Remote
                  </label>
                </div>
                <div className="flex items-end">
                  <button onClick={addPref} disabled={!newTitle || !newCountry}
                    className="btn w-full py-2.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "var(--success)", color: "white" }}>
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
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--hover-bg)" }}>
                        <span className="text-lg">🎯</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{pref.job_title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{pref.country}</span>
                          {pref.remote_allowed && <span className="badge" style={{ background: "var(--hover-bg)", color: "var(--success)" }}>Remote OK</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => delPref(pref.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                      style={{ color: "var(--danger)" }}>
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
