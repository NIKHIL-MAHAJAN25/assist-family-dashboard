import axios from 'axios';

const STORAGE_KEY = 'family_dashboard_auth';

// When the dashboard is opened from another device on the LAN (e.g. a phone at
// http://192.168.x.x:5173), "localhost" would point at that device, so reuse the
// page's own host for the API instead.
const configured = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_BASE_URL =
  typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? configured.replace(/\/\/(localhost|127\.0\.0\.1)/, `//${window.location.hostname}`)
    : configured;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

function getStoredToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401 from any authenticated route, clear the stored session so the
// route guard bounces the user back to /login on the next render.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export function buildCloudinaryUrl(imagePublicId) {
  if (!imagePublicId) return null;
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return null;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${imagePublicId}`;
}

/**
 * A camera photo exactly as the camera took it: no AI upscaling, no cropping, true resolution.
 * Kept as { src, fallback } so callers didn't need to change; both are the original.
 */
export function enhancedPhoto(imagePublicId) {
  const url = buildCloudinaryUrl(imagePublicId);
  return { src: url, fallback: url };
}
