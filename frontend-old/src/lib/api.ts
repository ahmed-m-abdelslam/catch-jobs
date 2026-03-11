const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  register(data: { email: string; password: string; full_name: string }) {
    return this.request<{
      access_token: string;
      user: User;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  login(data: { email: string; password: string }) {
    return this.request<{
      access_token: string;
      user: User;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getMe() {
    return this.request<User>("/auth/me");
  }

  // Preferences
  getPreferences() {
    return this.request<Preference[]>("/preferences/");
  }

  createPreference(data: Omit<Preference, "id" | "created_at">) {
    return this.request<Preference>("/preferences/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deletePreference(id: string) {
    return this.request(`/preferences/${id}`, { method: "DELETE" });
  }

  // Jobs
  getRecommendedJobs(limit = 20) {
    return this.request<Job[]>(`/jobs/recommended?limit=${limit}`);
  }

  searchJobs(query: string, country?: string, page = 1) {
    const params = new URLSearchParams({ q: query, page: String(page) });
    if (country) params.set("country", country);
    return this.request<Job[]>(`/jobs/search?${params}`);
  }

  getJob(id: string) {
    return this.request<Job>(`/jobs/${id}`);
  }

  saveJob(jobId: string) {
    return this.request(`/jobs/${jobId}/save`, { method: "POST" });
  }

  unsaveJob(jobId: string) {
    return this.request(`/jobs/${jobId}/save`, { method: "DELETE" });
  }

  getSavedJobs() {
    return this.request<Job[]>("/jobs/saved/list");
  }

  // Notifications
  getNotifications(unreadOnly = false, page = 1) {
    return this.request<Notification[]>(
      `/notifications/?unread_only=${unreadOnly}&page=${page}`
    );
  }

  getUnreadCount() {
    return this.request<{ unread_count: number }>("/notifications/count");
  }

  markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: "PUT" });
  }

  markAllRead() {
    return this.request("/notifications/read-all", { method: "PUT" });
  }
}

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Preference {
  id: string;
  job_title: string;
  country: string | null;
  experience_level: string | null;
  remote_allowed: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  country: string | null;
  description: string | null;
  job_url: string;
  source: string;
  posted_date: string | null;
  created_at: string;
  similarity_score: number | null;
}

export interface Notification {
  id: string;
  job: Job;
  is_read: boolean;
  created_at: string;
}

export const api = new ApiClient();
