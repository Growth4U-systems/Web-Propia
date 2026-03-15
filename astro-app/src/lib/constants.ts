export const SITE_URL = 'https://growth4u.io';
export const SITE_NAME = 'Growth4U';
export const SITE_DESCRIPTION = 'Especialistas en Growth para Empresas Tech. Te ayudamos a crear un motor de crecimiento que perdura en el tiempo y reduce tu CAC apoyándonos en el valor de la confianza.';

export const BOOKING_LINK = 'https://api.leadconnectorhq.com/widget/booking/XsVb9H5fZjGeVArLn2EN';

export const OG_IMAGE = 'https://i.imgur.com/imHxGWI.png';
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

// OG Image generator (Cloudinary text overlay on branded background)
export function generateOgImage(title: string, subtitle = 'Growth4U | Recurso Gratuito'): string {
  const encodedTitle = encodeURIComponent(title);
  const encodedSubtitle = encodeURIComponent(subtitle);
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_1200,h_630,c_fill,e_colorize:100,co_rgb:032149/l_text:arial_44_bold_center:${encodedTitle},co_white,g_center,y_-20,w_900,c_fit/l_text:arial_22_bold:${encodedSubtitle},co_rgb:45b6f7,g_south,y_70/sample`;
}

// Social
export const LINKEDIN_URL = 'https://www.linkedin.com/company/growth4u/';
export const TRUSTPILOT_URL = 'https://www.trustpilot.com/evaluate/growth4u.io';
