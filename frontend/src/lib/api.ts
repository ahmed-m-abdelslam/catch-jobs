const API_URL = typeof window !== "undefined"
  ? window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.1.6"
    ? `${window.location.protocol}//${window.location.hostname}:8001/api`
    : "/api"
  : "/api";

class ApiClient {
  private getHeaders(auth = true): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }; 
    if (auth && typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async register(email: string, password: string, full_name: string) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST", headers: this.getHeaders(false),
      body: JSON.stringify({ email, password, full_name }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Register failed");
    return res.json();
  }

  async verifyCode(email: string, code: string) {
    const res = await fetch(`${API_URL}/auth/verify-code`, {
      method: "POST", headers: this.getHeaders(false),
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Verification failed");
    return res.json();
  }

  async resendCode(email: string) {
    const res = await fetch(`${API_URL}/auth/resend-code`, {
      method: "POST", headers: this.getHeaders(false),
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to resend");
    return res.json();
  }

  async forgotPassword(email: string) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST", headers: this.getHeaders(false),
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to send reset code");
    return res.json();
  }

  async resetPassword(email: string, code: string, new_password: string) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST", headers: this.getHeaders(false),
      body: JSON.stringify({ email, code, new_password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to reset password");
    return res.json();
  }

  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST", headers: this.getHeaders(false),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
    return res.json();
  }

  async getMe() {
    const res = await fetch(`${API_URL}/auth/me`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  }

  async getJobs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/jobs?${query}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  }

  async getRecommended(limit: number = 20) {
    const res = await fetch(`${API_URL}/jobs/recommended?limit=${limit}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch recommended");
    return res.json();
  }

  async getFilters() {
    const res = await fetch(`${API_URL}/jobs/filters`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch filters");
    return res.json();
  }

  async getJobStats() {
    const res = await fetch(`${API_URL}/jobs/stats`, { headers: this.getHeaders(false) });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  }

  async saveJob(jobId: string) {
    const res = await fetch(`${API_URL}/jobs/save/${jobId}`, {
      method: "POST", headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to save job");
    return res.json();
  }

  async getSavedJobs() {
    const res = await fetch(`${API_URL}/jobs/saved`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch saved jobs");
    return res.json();
  }

  async getPreferences() {
    const res = await fetch(`${API_URL}/preferences`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch preferences");
    return res.json();
  }

  async addPreference(data: { job_title: string; country?: string; experience_level?: string; remote_allowed?: boolean }) {
    const res = await fetch(`${API_URL}/preferences`, {
      method: "POST", headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add preference");
    return res.json();
  }

  async deletePreference(id: string) {
    const res = await fetch(`${API_URL}/preferences/${id}`, {
      method: "DELETE", headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete preference");
    return res.json();
  }

  async getNotifications() {
    const res = await fetch(`${API_URL}/notifications`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
  }

  async getNotificationCount() {
    const res = await fetch(`${API_URL}/notifications/count`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch count");
    return res.json();
  }

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: "PUT", headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to mark read");
    return res.json();
  }

  async getJob(id: string) {
    const res = await fetch(`${API_URL}/jobs/${id}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch job");
    return res.json();
  }

  async aiSearch(query: string, limit: number = 20) {
    const res = await fetch(`${API_URL}/jobs/ai-search?q=${encodeURIComponent(query)}&limit=${limit}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("AI search failed");
    return res.json();
  }


  async updateProfile(fullName: string) {
    const form = new FormData();
    form.append("full_name", fullName);
    const res = await fetch(`${API_URL}/auth/profile`, { method: "PUT", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: form });
    if (!res.ok) throw new Error("Update failed");
    return res.json();
  }

  async uploadAvatar(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/auth/upload-avatar`, { method: "POST", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: form });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }

  async uploadCV(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/auth/upload-cv`, { method: "POST", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: form });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }

  async removeCV() {
    const res = await fetch(`${API_URL}/auth/remove-cv`, { method: "DELETE", headers: this.getHeaders() });
    if (!res.ok) throw new Error("Remove failed");
    return res.json();
  }

  async analyzeCV() {
    const res = await fetch(`${API_URL}/auth/analyze-cv`, { method: "POST", headers: this.getHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Analysis failed"); }
    return res.json();
  },
}

export const api = new ApiClient();
