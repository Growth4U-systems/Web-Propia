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
export function generateOgImage(title: string): string {
  const t = encodeURIComponent(title);
  const CL = CLOUDINARY_CLOUD_NAME;
  return [
    `https://res.cloudinary.com/${CL}/image/upload`,
    'w_1200,h_630,c_fill,e_colorize:100,co_rgb:032149',                  // navy base
    'l_brand:growth4u-logo,w_52,h_52,c_fit,r_max,g_north_west,x_72,y_48', // logo top-left
    'l_text:arial_20_bold:Growth4U,co_rgb:45b6f7,g_north_west,x_138,y_62', // brand name
    `l_text:arial_48_bold_center:${t},co_white,g_west,x_72,y_20,w_1050,c_fit`, // title
    'l_text:arial_20:growth4u.io,co_rgb:6351d5,g_south_west,x_72,y_48',   // url bottom-left
    'sample',
  ].join('/');
}

// Social
export const LINKEDIN_URL = 'https://www.linkedin.com/company/growth4u/';
export const TRUSTPILOT_URL = 'https://www.trustpilot.com/evaluate/growth4u.io';
