"use client";

import { useEffect, useState } from "react";
import { api, Job, Notification, Preference, User } from "@/lib/api";
import JobCard from "@/components/JobCard";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "recommended" | "notifications" | "saved" | "preferences"
  >("recommended");
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Preference form state
  const [newPrefTitle, setNewPrefTitle] = useState("");
  const [newPrefCountry, setNewPrefCountry] = useState("");
  const [newPrefExperience, setNewPrefExperience] = useState("");
  const [newPrefRemote, setNewPrefRemote] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [userData, recs, notifs, prefs, count] = await Promise.all([
        api.getMe(),
        api.getRecommendedJobs(),
        api.getNotifications(),
        api.getPreferences(),
        api.getUnreadCount(),
      ]);
      setUser(userData);
      setRecommendedJobs(recs);
      setNotifications(notifs);
      setPreferences(prefs);
      setUnreadCount(count.unread_count);
    } catch {
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  async function loadSavedJobs() {
    const jobs = await api.getSavedJobs();
    setSavedJobs(jobs);
  }

  async function addPreference() {
    if (!newPrefTitle) return;
    await api.createPreference({
      job_title: newPrefTitle,
      country: newPrefCountry || null,
      experience_level: newPrefExperience || null,
      remote_allowed: newPrefRemote,
    });
    setNewPrefTitle("");
    setNewPrefCountry("");
    setNewPrefExperience("");
    const prefs = await api.getPreferences();
    setPreferences(prefs);
  }

  async function removePreference(id: string) {
    await api.deletePreference(id);
    setPreferences(preferences.filter((p) => p.id !== id));
  }

  async function handleMarkAllRead() {
    await api.markAllRead();
    setUnreadCount(0);
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">JobMatcher</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Hi, {user?.full_name}
            </span>
            <button
              onClick={() => {
                api.clearToken();
                window.location.href = "/login";
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { key: "recommended" as const, label: "Recommended" },
            {
              key: "notifications" as const,
              label: `Alerts ${unreadCount > 0 ? `(${unreadCount})` : ""}`,
            },
            { key: "saved" as const, label: "Saved" },
            { key: "preferences" as const, label: "Preferences" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === "saved") loadSavedJobs();
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Recommended Jobs */}
        {activeTab === "recommended" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Recommended for You
            </h2>
            {recommendedJobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No recommendations yet.</p>
                <p className="text-sm mt-1">
                  Add your job preferences to get personalized recommendations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendedJobs.map((job) => (
                  <JobCard key={job.id} job={job} showSimilarity />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Job Alerts</h2>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-center py-12 text-gray-500">
                No notifications yet.
              </p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`border rounded-lg p-4 ${
                      notif.is_read ? "bg-white" : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <JobCard job={notif.job} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Jobs */}
        {activeTab === "saved" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Saved Jobs</h2>
            {savedJobs.length === 0 ? (
              <p className="text-center py-12 text-gray-500">
                No saved jobs yet.
              </p>
            ) : (
              <div className="space-y-4">
                {savedJobs.map((job) => (
                  <JobCard key={job.id} job={job} onSave={loadSavedJobs} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preferences */}
        {activeTab === "preferences" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Job Preferences</h2>

            {/* Add new preference form */}
            <div className="bg-white rounded-lg border p-6 mb-6">
              <h3 className="font-medium mb-4">Add New Preference</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Job title (e.g., AI Engineer)"
                  value={newPrefTitle}
                  onChange={(e) => setNewPrefTitle(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Country (e.g., Germany)"
                  value={newPrefCountry}
                  onChange={(e) => setNewPrefCountry(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={newPrefExperience}
                  onChange={(e) => setNewPrefExperience(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Any experience level</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid-level</option>
                  <option value="senior">Senior</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newPrefRemote}
                    onChange={(e) => setNewPrefRemote(e.target.checked)}
                  />
                  Include remote positions
                </label>
              </div>
              <button
                onClick={addPreference}
                disabled={!newPrefTitle}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Add Preference
              </button>
            </div>

            {/* Current preferences */}
            <div className="space-y-3">
              {preferences.map((pref) => (
                <div
                  key={pref.id}
                  className="bg-white rounded-lg border p-4 flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{pref.job_title}</span>
                    {pref.country && (
                      <span className="text-gray-500 ml-2">
                        in {pref.country}
                      </span>
                    )}
                    {pref.experience_level && (
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                        {pref.experience_level}
                      </span>
                    )}
                    {pref.remote_allowed && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Remote OK
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removePreference(pref.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
