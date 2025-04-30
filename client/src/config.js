// API and Socket configuration
const isDevelopment = import.meta.env.MODE === 'development';

// Use environment variables in production, fallback to localhost in development
export const API_URL = import.meta.env.VITE_API_URL ||
  (isDevelopment ? 'http://localhost:5000' : 'https://my-whatsapp-backend-iku0.onrender.com');

export const SOCKET_URL = API_URL; // Using the same URL for socket connection
