import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({ baseURL: BASE });

// Injeta token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redireciona para login se token expirar
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post("/api/auth/login", { email, password }).then((r) => r.data);

export const getMe = () =>
  api.get("/api/auth/me").then((r) => r.data);

// ── Clients ───────────────────────────────────────────────────────────────────
export const getClients = () =>
  api.get("/api/clients").then((r) => r.data);

export const getClient = (id) =>
  api.get(`/api/clients/${id}`).then((r) => r.data);

export const createClient = (data) =>
  api.post("/api/clients", data).then((r) => r.data);

export const updateClient = (id, data) =>
  api.put(`/api/clients/${id}`, data).then((r) => r.data);

export const deleteClient = (id) =>
  api.delete(`/api/clients/${id}`).then((r) => r.data);

// ── Branches ──────────────────────────────────────────────────────────────────
export const getBranches = (client_id) =>
  api.get("/api/branches", { params: { client_id } }).then((r) => r.data);

export const createBranch = (data) =>
  api.post("/api/branches", data).then((r) => r.data);

export const deleteBranch = (id) =>
  api.delete(`/api/branches/${id}`).then((r) => r.data);

// ── Screens ───────────────────────────────────────────────────────────────────
export const getScreens = (params) =>
  api.get("/api/screens", { params }).then((r) => r.data);

export const pairScreen = (data) =>
  api.post("/api/screens/pair", data).then((r) => r.data);

export const checkPairCode = (code) =>
  api.get(`/api/screens/pair/check/${code}`).then((r) => r.data);

export const assignPlaylist = (id, playlist_id) =>
  api.patch(`/api/screens/${id}/playlist`, { playlist_id }).then((r) => r.data);

export const restartScreen = (id) =>
  api.post(`/api/screens/${id}/restart`).then((r) => r.data);

export const deleteScreen = (id) =>
  api.delete(`/api/screens/${id}`).then((r) => r.data);

// ── Playlists ─────────────────────────────────────────────────────────────────
export const getPlaylists = () =>
  api.get("/api/playlists").then((r) => r.data);

export const getPlaylist = (id) =>
  api.get(`/api/playlists/${id}`).then((r) => r.data);

export const createPlaylist = (data) =>
  api.post("/api/playlists", data).then((r) => r.data);

export const updatePlaylist = (id, data) =>
  api.put(`/api/playlists/${id}`, data).then((r) => r.data);

export const deletePlaylist = (id) =>
  api.delete(`/api/playlists/${id}`).then((r) => r.data);

// ── Media ─────────────────────────────────────────────────────────────────────
export const getMedia = (type) =>
  api.get("/api/media", { params: type ? { type } : {} }).then((r) => r.data);

export const uploadMedia = (formData, onProgress) =>
  api.post("/api/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  }).then((r) => r.data);

export const addMediaUrl = (data) =>
  api.post("/api/media/url", data).then((r) => r.data);

export const deleteMedia = (id) =>
  api.delete(`/api/media/${id}`).then((r) => r.data);

// ── Schedules ─────────────────────────────────────────────────────────────────
export const getSchedules = () =>
  api.get("/api/schedules").then((r) => r.data);

export const createSchedule = (data) =>
  api.post("/api/schedules", data).then((r) => r.data);

export const toggleSchedule = (id) =>
  api.patch(`/api/schedules/${id}/toggle`).then((r) => r.data);

export const deleteSchedule = (id) =>
  api.delete(`/api/schedules/${id}`).then((r) => r.data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () =>
  api.get("/api/users").then((r) => r.data);

export const createUser = (data) =>
  api.post("/api/users", data).then((r) => r.data);

export const updateUser = (id, data) =>
  api.put(`/api/users/${id}`, data).then((r) => r.data);

export const resetPassword = (id, new_password) =>
  api.patch(`/api/users/${id}/reset-password`, { new_password }).then((r) => r.data);

export const deleteUser = (id) =>
  api.delete(`/api/users/${id}`).then((r) => r.data);

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSettings = () =>
  api.get("/api/settings").then((r) => r.data);

export const saveSettings = (data) =>
  api.put("/api/settings", data).then((r) => r.data);

export default api;

// ── Playlist items ────────────────────────────────────────────────────────────
export const addMediaToPlaylist = (playlistId, data) =>
  api.post(`/api/playlists/${playlistId}/items`, data).then((r) => r.data);

export const removePlaylistItem = (playlistId, itemId) =>
  api.delete(`/api/playlists/${playlistId}/items/${itemId}`).then((r) => r.data);
