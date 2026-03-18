export const SITE_URL = 'https://growth4u.io';
export const SITE_NAME = 'Growth4U';
export const SITE_DESCRIPTION = 'Especialistas en Growth para Empresas Tech. Te ayudamos a crear un motor de crecimiento que perdura en el tiempo y reduce tu CAC apoyándonos en el valor de la confianza.';

export const BOOKING_LINK = 'https://api.leadconnectorhq.com/widget/booking/XsVb9H5fZjGeVArLn2EN';

export const LOGO_IMAGE = 'https://i.imgur.com/imHxGWI.png';
export const OG_IMAGE = `https://res.cloudinary.com/dsc0jsbkz/image/upload/l_text:arial_72_bold_center:Growth4U,co_white,g_center,w_1000,c_fit/brand/og-gradient-bg-v2`;
export const FAVICON = 'https://i.imgur.com/h5sWS3W.png';

// Analytics
export const GA4_ID = 'G-4YBYPVQDT6';
export const META_PIXEL_ID = '1330785362070217';
export const TRUSTPILOT_BU_ID = 'txZ8DOmwsM3AEPQc';

// Firebase
export const FIREBASE_PROJECT_ID = 'landing-growth4u';
export const FIREBASE_APP_ID = 'growth4u-public-app';

// Cloudinary
export const CLOUDINARY_CLOUD_NAME = 'dsc0jsbkz';
export const CLOUDINARY_UPLOAD_PRESET = 'blog_uploads';

// Netlify
export const NETLIFY_BUILD_HOOK = 'https://api.netlify.com/build_hooks/69a9ce0e98ff45fea8db5696';

// Brand colors
export const COLORS = {
  primary: '#6351d5',
  primaryDark: '#5242b8',
  navy: '#032149',
  blue: '#1a3690',
  brightBlue: '#3f45fe',
  cyan: '#45b6f7',
  teal: '#0faec1',
  background: '#f1f5f9',
} as const;

// Trust Score Analyzer
export const TRUST_SCORE_URL = '/trust-score/';

// OG Image generator — matches blog cover style (navy→teal gradient + title)
export function generateOgImage(title: string): string {
  const t = encodeURIComponent(title);
  const CL = CLOUDINARY_CLOUD_NAME;
  const fontSize = title.length > 60 ? 56 : title.length > 45 ? 64 : 72;
  return `https://res.cloudinary.com/${CL}/image/upload/l_text:arial_${fontSize}_bold_center:${t},co_white,g_center,w_1000,c_fit/brand/og-gradient-bg-v2`;
}

// Social
export const LINKEDIN_URL = 'https://www.linkedin.com/company/growth4u/';
export const INSTAGRAM_URL = 'https://www.instagram.com/growth4u_systems/';
export const TRUSTPILOT_URL = 'https://www.trustpilot.com/evaluate/growth4u.io';
