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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardTitle, setOnboardTitle] = useState("");
  const [onboardCountry, setOnboardCountry] = useState("");
  const [onboardSaving, setOnboardSaving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const pageSize = 20;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => { window.location.href = "/login"; });
    api.getJobStats().then(setStats).catch(() => {});
    api.getSavedJobs().then((jobs: any[]) => { setSavedJobs(jobs); setSavedIds(new Set(jobs.map((j: any) => j.id))); }).catch(() => {});
    api.getPreferences().then((prefs: any[]) => {
      console.log("[ONBOARD] prefs loaded:", prefs.length);
      setPreferences(prefs);
      if (prefs.length === 0) {
        console.log("[ONBOARD] No preferences - showing onboarding");
        setShowOnboarding(true);
      }
    }).catch((err: any) => { console.log("[ONBOARD] Error loading prefs:", err); });
    api.getNotificationCount().then((r: any) => setNotifCount(r.unread_count || 0)).catch(() => {});
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

  function loadNotifications() {
    api.getNotifications().then((notifs: any[]) => {
      setNotifications(notifs);
    }).catch(() => {});
  }

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

  async function handleQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    setActiveTab("all");
    setCurrentPage(1);
    setSearching(true);
    setAllJobs([]);
    try {
      const results = await api.aiSearch(quickSearch.trim(), 50);
      const sorted = results.sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
      setAllJobs(sorted);
      setTotalJobs(sorted.length);
      setTotalPages(1);
    } catch {
      loadAllJobs(1, quickSearch.trim());
    } finally {
      setSearching(false);
    }
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", borderRadius: "20px", background: "var(--card)", border: "1px solid var(--border)" }}>
      <div style={{ width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #3b82f615, #8b5cf615)", marginBottom: "20px", fontSize: "36px" }}>
        {icon}
      </div>
      <p style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>{title}</p>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px", textAlign: "center", maxWidth: "320px", lineHeight: "1.6" }}>{subtitle}</p>
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
        <div className="w-full px-5 sm:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Catch Jobs" width={40} height={40} style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(99,102,241,0.2)" }} />
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 900, background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2, letterSpacing: "-0.3px" }}>Catch Jobs</h1>
              {stats && (
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginTop: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse-soft 2s ease infinite" }} />{stats.total_jobs.toLocaleString()} jobs</span>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span>{Object.keys(stats.by_source || {}).length} sources</span>
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
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setShowNotifPanel(!showNotifPanel); setShowDropdown(false); if (!showNotifPanel) loadNotifications(); }}
                style={{
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: showNotifPanel ? "var(--primary)" : "var(--card)",
                  color: showNotifPanel ? "white" : "var(--text-light)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s ease",
                  fontSize: "18px",
                }}
                onMouseEnter={(e) => { if (!showNotifPanel) { e.currentTarget.style.background = "var(--hover-bg)"; e.currentTarget.style.transform = "scale(1.05)"; } }}
                onMouseLeave={(e) => { if (!showNotifPanel) { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.transform = "scale(1)"; } }}
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

              {showNotifPanel && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "380px",
                  maxHeight: "480px",
                  overflowY: "auto",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
                  zIndex: 200,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text)" }}>Notifications</h3>
                    {notifCount > 0 && (
                      <button onClick={() => {
                        fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://catch-jobs-production.up.railway.app/api"}/notifications/read-all`, {
                          method: "PUT",
                          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
                        }).then(() => { setNotifCount(0); loadNotifications(); });
                      }} style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center" }}>
                      <span style={{ fontSize: "32px", display: "block", marginBottom: "12px" }}>🔔</span>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>No notifications yet</p>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>New job matches will appear here</p>
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <a key={n.id} href={`/jobs/${n.job?.id}`}
                        onClick={() => {
                          if (!n.is_read) {
                            fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://catch-jobs-production.up.railway.app/api"}/notifications/${n.id}/read`, {
                              method: "PUT",
                              headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
                            });
                          }
                          setShowNotifPanel(false);
                        }}
                        style={{
                          display: "flex",
                          gap: "12px",
                          padding: "14px 20px",
                          borderBottom: "1px solid var(--border)",
                          textDecoration: "none",
                          background: n.is_read ? "transparent" : "var(--primary-bg, #3b82f608)",
                          transition: "background 0.2s",
                          cursor: "pointer",
                        }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: n.is_read ? "var(--hover-bg)" : "#3b82f615",
                          fontSize: "18px",
                          flexShrink: 0,
                        }}>
                          💼
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: n.is_read ? 500 : 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {n.job?.title || "New job match"}
                          </p>
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {n.job?.company_name || ""} {n.job?.country ? `· ${n.job.country}` : ""}
                          </p>
                          <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                            {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", flexShrink: 0, marginTop: "6px" }} />
                        )}
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User Avatar & Dropdown */}
            {user && (
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => { setShowDropdown(!showDropdown); setShowNotifPanel(false); }}
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

                {showDropdown && <div id="user-dropdown" style={{
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
                  <button onClick={() => { setActiveTab("preferences"); setShowDropdown(false); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: "var(--text-light)", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >⚙️ Preferences</button>
                  <button onClick={() => { setActiveTab("saved"); setShowDropdown(false); }}
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
                </div>}
              </div>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && activeTab === "recommended" && (
        <div className="w-full px-5 sm:px-8" style={{ paddingTop: "24px", paddingBottom: "16px" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6">
            {[
              { icon: "💼", value: stats.total_jobs.toLocaleString(), label: "Total Jobs", sublabel: "Across all sources", color: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", bg: "linear-gradient(135deg, #3b82f608, #6366f115)" },
              { icon: "🔗", value: Object.keys(stats.by_source || {}).length, label: "Sources", sublabel: "Active platforms", color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #059669)", bg: "linear-gradient(135deg, #10b98108, #05966915)" },
              { icon: "🌍", value: Object.keys(stats.by_country || {}).length, label: "Countries", sublabel: "Global coverage", color: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)", bg: "linear-gradient(135deg, #8b5cf608, #7c3aed15)" },
              { icon: "♥", value: savedIds.size, label: "Saved Jobs", sublabel: savedIds.size > 0 ? "Your collection" : "None saved yet", color: savedIds.size > 0 ? "#ef4444" : "#9ca3af", gradient: savedIds.size > 0 ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #9ca3af, #6b7280)", bg: savedIds.size > 0 ? "linear-gradient(135deg, #ef444408, #dc262615)" : "linear-gradient(135deg, #9ca3af08, #6b728015)" },
            ].map((s, i) => (
              <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "20px", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", cursor: "default", position: "relative", overflow: "hidden" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)"; e.currentTarget.style.borderColor = s.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: s.bg, borderRadius: "0 20px 0 80px", opacity: 0.5 }} />
                <div style={{ display: "flex", alignItems: "center", gap: "14px", position: "relative" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", background: s.gradient, fontSize: "22px", flexShrink: 0, boxShadow: `0 4px 12px ${s.color}30` }}>
                    {s.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: "26px", fontWeight: 800, color: s.color, lineHeight: 1.1, letterSpacing: "-0.5px" }}>{s.value}</p>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", marginTop: "2px" }}>{s.label}</p>
                    <p style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", marginTop: "1px" }}>{s.sublabel}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full px-5 sm:px-8" style={{ paddingTop: "8px", paddingBottom: "24px" }}>
        <div style={{ display: "flex", width: "100%", gap: "4px", padding: "5px", borderRadius: "16px", background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 20px",
                fontSize: "13px",
                fontWeight: 700,
                borderRadius: "12px",
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

      <div style={{ width: "100%", padding: "24px 20px 40px", maxWidth: "1400px", margin: "0 auto" }} key={activeTab}>

        {activeTab === "recommended" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" }}>✨ For You</h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Personalized recommendations based on your preferences</p>
              </div>
              <button onClick={loadRecommended} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
              >↻ Refresh</button>
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

        {activeTab === "all" && searching && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "20px" }}>
                <div style={{ position: "relative", width: "64px", height: "64px" }}>
                  <div style={{ position: "absolute", inset: 0, border: "4px solid var(--border)", borderRadius: "50%" }} />
                  <div style={{ position: "absolute", inset: 0, border: "4px solid transparent", borderTop: "4px solid #6366f1", borderRight: "4px solid #8b5cf6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  <div style={{ position: "absolute", inset: "8px", border: "3px solid transparent", borderBottom: "3px solid #a78bfa", borderLeft: "3px solid #6366f1", borderRadius: "50%", animation: "spin 1.2s linear infinite reverse" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🔍</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "var(--text)", fontSize: "17px", fontWeight: 700, marginBottom: "6px" }}>Searching with AI...</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", fontWeight: 500 }}>Analyzing your query and finding the most relevant jobs</p>
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1", animation: "bounce 1.4s ease-in-out infinite" }} />
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8b5cf6", animation: "bounce 1.4s ease-in-out 0.2s infinite" }} />
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a78bfa", animation: "bounce 1.4s ease-in-out 0.4s infinite" }} />
                </div>
              </div>
            )}
            {activeTab === "all" && !searching && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" }}>
                  {searching ? "🔍 Searching with AI..." : quickSearch ? `🔍 Results for "${quickSearch}"` : "📋 All Jobs"}
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  {searching ? "Analyzing your query with AI..." : quickSearch ? `${totalJobs} jobs found` : "All available jobs · Newest first"}
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
                <p style={{ fontSize: "13px", fontWeight: 500, marginBottom: "16px", padding: "10px 16px", borderRadius: "10px", background: "var(--hover-bg)", color: "var(--text-muted)", display: "inline-block" }}>
                  Showing <strong style={{ color: "var(--text)", fontWeight: 700 }}>{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalJobs)}</strong> of <strong style={{ color: "var(--text)", fontWeight: 700 }}>{totalJobs.toLocaleString()}</strong> jobs
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: "#ef444415", fontSize: "20px" }}>
                  ❤️
                </div>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>Saved Jobs</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Jobs you want to come back to</p>
                </div>
              </div>
              {savedJobs.length > 0 && <span style={{ fontSize: "13px", fontWeight: 700, padding: "6px 16px", borderRadius: "100px", background: "#ef444415", color: "#ef4444" }}>{savedJobs.length} saved</span>}
            </div>
            {loading ? <Spinner /> : savedJobs.length === 0 ? (
              <EmptyState icon="❤️" title="No saved jobs yet" subtitle="Tap the heart icon on any job to save it here for later. Your saved jobs will appear in this section."
                action={<button onClick={() => setActiveTab("all")} style={{ padding: "10px 24px", borderRadius: "10px", background: "var(--primary)", color: "white", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Browse All Jobs</button>} />
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
            <div style={{ marginBottom: "28px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" }}>⚙️ Preferences</h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Set your job preferences to get better recommendations in "For You"</p>
            </div>

            {/* Add Preference Card */}
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px",
              padding: "28px", marginBottom: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: "#3b82f615", fontSize: "18px" }}>
                  ➕
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Add New Preference</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    💼 Job Title
                  </label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)",
                      background: "var(--bg)", color: "var(--text)", fontSize: "14px", outline: "none",
                      transition: "all 0.2s ease", boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🌍 Country
                  </label>
                  <input type="text" value={newCountry} onChange={e => setNewCountry(e.target.value)}
                    placeholder="e.g. Egypt"
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)",
                      background: "var(--bg)", color: "var(--text)", fontSize: "14px", outline: "none",
                      transition: "all 0.2s ease", boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                  padding: "8px 16px", borderRadius: "10px", border: "1px solid var(--border)",
                  background: newRemote ? "#10b98115" : "transparent",
                  transition: "all 0.2s ease",
                }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                    background: newRemote ? "#10b981" : "var(--bg)", border: newRemote ? "none" : "2px solid var(--border)",
                    transition: "all 0.2s ease",
                  }}>
                    {newRemote && <span style={{ color: "white", fontSize: "12px", fontWeight: 800 }}>✓</span>}
                  </div>
                  <input type="checkbox" checked={newRemote} onChange={e => setNewRemote(e.target.checked)} style={{ display: "none" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: newRemote ? "#10b981" : "var(--text-light)" }}>
                    🏠 Include Remote Jobs
                  </span>
                </label>

                <button onClick={addPref} disabled={!newTitle || !newCountry}
                  style={{
                    padding: "12px 32px", borderRadius: "10px", border: "none",
                    background: (!newTitle || !newCountry) ? "var(--hover-bg)" : "var(--primary)",
                    color: (!newTitle || !newCountry) ? "var(--text-muted)" : "white",
                    fontSize: "14px", fontWeight: 700, cursor: (!newTitle || !newCountry) ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}
                  onMouseEnter={(e) => { if (newTitle && newCountry) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.3)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  ➕ Add Preference
                </button>
              </div>
            </div>

            {/* Preferences List */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Your Preferences</h3>
              {preferences.length > 0 && (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "100px", background: "var(--primary)", color: "white" }}>
                  {preferences.length}
                </span>
              )}
            </div>

            {preferences.length === 0 ? (
              <EmptyState icon="⚙️" title="No preferences set" subtitle="Add your ideal job title and country to get personalized recommendations" />
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {preferences.map((pref: any, i: number) => (
                  <div key={pref.id} style={{
                    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px",
                    padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    transition: "all 0.3s ease", animation: `slideUp 0.4s ease ${i * 0.1}s both`,
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
                        background: "linear-gradient(135deg, #3b82f6, #6366f1)", fontSize: "20px",
                      }}>
                        🎯
                      </div>
                      <div>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{pref.job_title}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            🌍 {pref.country}
                          </span>
                          {pref.remote_allowed && (
                            <span style={{
                              padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                              background: "#10b98115", color: "#10b981",
                            }}>
                              🏠 Remote OK
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => delPref(pref.id)}
                      style={{
                        width: "36px", height: "36px", borderRadius: "10px", border: "1px solid var(--border)",
                        background: "var(--bg)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", fontSize: "16px", transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                      title="Remove preference"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Onboarding Modal - First time users */}
      {(() => { if (showOnboarding) console.log("[ONBOARD] Rendering modal"); return null; })()}
      {showOnboarding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div style={{ background: "var(--card)", borderRadius: "24px", padding: "40px", maxWidth: "480px", width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", border: "1px solid var(--border)", animation: "fadeIn 0.3s ease" }}>
            
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(99,102,241,0.3)" }}>
                🎯
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 900, color: "var(--text)", marginBottom: "8px" }}>Welcome to Catch Jobs!</h2>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Tell us what job you are looking for so we can find the best matches for you.
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                💼 What job title are you looking for?
              </label>
              <input type="text" value={onboardTitle} onChange={e => setOnboardTitle(e.target.value)}
                placeholder="e.g. Software Engineer, Data Scientist, UI Designer"
                style={{ width: "100%", padding: "14px 18px", borderRadius: "12px", border: "2px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "15px", outline: "none", transition: "border 0.2s", boxSizing: "border-box" }}
                onFocus={e => e.currentTarget.style.borderColor = "#6366f1"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            <div style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🌍 Preferred country
              </label>
              <input type="text" value={onboardCountry} onChange={e => setOnboardCountry(e.target.value)}
                placeholder="e.g. Egypt, United States, Remote"
                style={{ width: "100%", padding: "14px 18px", borderRadius: "12px", border: "2px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "15px", outline: "none", transition: "border 0.2s", boxSizing: "border-box" }}
                onFocus={e => e.currentTarget.style.borderColor = "#6366f1"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            <button
              disabled={!onboardTitle.trim() || !onboardCountry.trim() || onboardSaving}
              onClick={async () => {
                setOnboardSaving(true);
                try {
                  await api.addPreference({ job_title: onboardTitle.trim(), country: onboardCountry.trim(), remote_allowed: false });
                  setShowOnboarding(false);
                  setActiveTab("recommended");
                  api.getPreferences().then(setPreferences);
                  api.getRecommended().then(setRecommendedJobs);
                } catch (err) {
                  console.error(err);
                } finally {
                  setOnboardSaving(false);
                }
              }}
              style={{
                width: "100%", padding: "16px", borderRadius: "14px", border: "none", cursor: onboardTitle.trim() && onboardCountry.trim() ? "pointer" : "not-allowed",
                background: onboardTitle.trim() && onboardCountry.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--border)",
                color: onboardTitle.trim() && onboardCountry.trim() ? "white" : "var(--text-muted)",
                fontSize: "16px", fontWeight: 700, transition: "all 0.3s", boxShadow: onboardTitle.trim() && onboardCountry.trim() ? "0 8px 24px rgba(99,102,241,0.3)" : "none",
              }}
            >
              {onboardSaving ? "Saving..." : "🚀 Start Catching Jobs"}
            </button>

            <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "16px" }}>
              You can always add more preferences later in Settings
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
