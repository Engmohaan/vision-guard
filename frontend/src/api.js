// ============================================================
// api.js - Vision Guard Backend API client
// Dhammaan calls-ku waxay isticmaalaan JWT token-ka localStorage
// ============================================================

export const API_BASE = "http://localhost:8000";

function authHeaders(extra = {}) {
  const token = localStorage.getItem("vision-guard-token");
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res, fallbackMessage) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || fallbackMessage);
  }
  return res.json();
}

export async function fetchIdentities() {
  const res = await fetch(`${API_BASE}/api/identities`, { headers: authHeaders() });
  return handle(res, "Ma soo helin xogta database-ka");
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload/image`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  return handle(res, "Sawirka lama process-gareyn karin");
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload/video`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  // Returns { task_id } immediately - processing happens in a background
  // thread on the server. Poll getTaskStatus(task_id) until status is
  // "done" or "error" (see useVideoProcessing hook).
  return handle(res, "Video-ga lama soo diri karin");
}

export async function getTaskStatus(taskId) {
  const res = await fetch(`${API_BASE}/api/status/${taskId}`, { headers: authHeaders() });
  return handle(res, "Task-ka xaaladiisa lama soo helin");
}

export function webcamSocketUrl() {
  const token = localStorage.getItem("vision-guard-token");
  // WebSockets can't set an Authorization header from the browser -
  // pass the JWT as a query param instead, same as the old MJPEG endpoint did.
  const wsProtocol = API_BASE.startsWith("https") ? "wss" : "ws";
  const host = API_BASE.replace(/^https?:\/\//, "");
  return `${wsProtocol}://${host}/ws/webcam?token=${encodeURIComponent(token || "")}`;
}

export async function fetchLogs({ mediaType, identity, matchedOnly, limit = 200 } = {}) {
  const params = new URLSearchParams();
  if (mediaType) params.set("media_type", mediaType);
  if (identity) params.set("identity", identity);
  if (matchedOnly) params.set("matched_only", "true");
  params.set("limit", limit);

  const res = await fetch(`${API_BASE}/api/logs?${params.toString()}`, { headers: authHeaders() });
  return handle(res, "Taariikhda lama soo helin");
}

export async function fetchLogStats() {
  const res = await fetch(`${API_BASE}/api/logs/stats`, { headers: authHeaders() });
  return handle(res, "Stats-ka lama soo helin");
}

export async function clearLogs() {
  const res = await fetch(`${API_BASE}/api/logs/clear`, { method: "POST", headers: authHeaders() });
  return handle(res, "Taariikhda lama nadiifin karin (admin oo keliya)");
}

export async function fetchReportsSummary() {
  const res = await fetch(`${API_BASE}/api/reports/summary`, { headers: authHeaders() });
  return handle(res, "Reports-ka lama soo helin");
}

export async function updateProfile({ fullName, email }) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ full_name: fullName, email }),
  });
  return handle(res, "Profile-ka lama cusboonaysiin karin");
}

export async function changePassword({ currentPassword, newPassword }) {
  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  return handle(res, "Password-ka lama beddeli karin");
}

export async function fetchAllUsers() {
  const res = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() });
  return handle(res, "Users-ka lama soo helin (admin oo keliya)");
}

export async function updateUserRole(userId, role) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ role }),
  });
  return handle(res, "Role-ka lama beddeli karin");
}
