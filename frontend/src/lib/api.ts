const API_URL = typeof window !== "undefined"
  ? window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.1.6"
    ? `${window.location.protocol}//${window.location.hostname}:8001/api`
    : "https://catch-jobs-production.up.railway.app/api"
  : "https://catch-jobs-production.up.railway.app/api";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (res.status === 401) {
      this.clearToken();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    return res;
  }

  async register(email: string, password: string, full_name: string) {
    const res = await this.fetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
    return res.json();
  }

  async login(email: string, password: string) {
    const res = await this.fetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  }

  async getMe() {
    const res = await this.fetch("/auth/me");
    return res.json();
  }

  async getJobs(params: {
    page?: number;
    page_size?: number;
    country?: string;
    source?: string;
    search?: string;
    days?: number;
  } = {}) {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.page_size) sp.set("page_size", String(params.page_size));
    if (params.country) sp.set("country", params.country);
    if (params.source) sp.set("source", params.source);
    if (params.search) sp.set("search", params.search);
    if (params.days) sp.set("days", String(params.days));
    const res = await this.fetch(`/jobs/?${sp.toString()}`);
    return res.json();
  }

  async getRecommended(limit: number = 20) {
    const res = await this.fetch(`/jobs/recommended?limit=${limit}`);
    return res.json();
  }

  async getFilters() {
    const res = await this.fetch("/jobs/filters");
    return res.json();
  }

  async getJobStats() {
    const res = await this.fetch("/jobs/stats");
    return res.json();
  }

  async saveJob(jobId: string) {
    const res = await this.fetch(`/jobs/${jobId}/save`, { method: "POST" });
    return res.json();
  }

  async getSavedJobs() {
    const res = await this.fetch("/jobs/saved/list");
    return res.json();
  }

  async getPreferences() {
    const res = await this.fetch("/preferences/");
    return res.json();
  }

  async addPreference(data: { job_title: string; country: string; remote_allowed?: boolean }) {
    const res = await this.fetch("/preferences/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async deletePreference(id: string) {
    const res = await this.fetch(`/preferences/${id}`, { method: "DELETE" });
    return res.json();
  }

  async getNotifications(page: number = 1) {
    const res = await this.fetch(`/notifications/?page=${page}`);
    return res.json();
  }

  async getNotificationCount() {
    const res = await this.fetch("/notifications/count");
    return res.json();
  }

  async markNotificationRead(id: string) {
    const res = await this.fetch(`/notifications/${id}/read`, { method: "PUT" });
    return res.json();
  }
}

export const api = new ApiClient();
