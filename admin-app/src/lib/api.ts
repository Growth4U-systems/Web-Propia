/**
 * Base URL for Netlify functions.
 * In production (admin.growth4u.io), calls go to the main site.
 * In development, Vite proxy handles it (see vite.config.ts).
 */
export const API_BASE = import.meta.env.PROD ? 'https://growth4u.io' : '';
