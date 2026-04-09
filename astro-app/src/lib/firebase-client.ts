/**
 * Firebase Client SDK - used ONLY by React islands (admin, feedback).
 * This code is never loaded on public static pages.
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  limit,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBGtatMbThV_pupfPk6ytO5omidlJrQLcw',
  authDomain: 'landing-growth4u.firebaseapp.com',
  projectId: 'landing-growth4u',
  storageBucket: 'landing-growth4u.firebasestorage.app',
  messagingSenderId: '562728954202',
  appId: '1:562728954202:web:90cff4aa486f38b4b62b63',
  measurementId: 'G-4YBYPVQDT6',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const APP_ID = 'growth4u-public-app';

// Re-export types from firebase-fetch for consistency
export type { BlogPost, CaseStudy } from './firebase-fetch';
export { createSlug } from './firebase-fetch';

// Re-export FeedbackData interface
export interface FeedbackData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  mainChallenge: string;
  howIdentifiedProblem: string;
  teamIntegration: string;
  proposedSolutions: string;
  technicalExecution: string;
  quizFlowHighlights: string;
  iterativeApproach: string;
  conversionComparison: string;
  autonomousImprovement: string;
  scalingConfidence: string;
  wouldRecommend: string;
  standoutAspects: string;
  additionalComments: string;
}

export interface BlogPostInput {
  title: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  readTime: string;
  author: string;
}

export interface CaseStudyInput {
  company: string;
  logo: string;
  stat: string;
  statLabel: string;
  highlight: string;
  summary: string;
  challenge: string;
  solution: string;
  results: string[];
  testimonial: string;
  testimonialAuthor: string;
  testimonialRole: string;
  image: string;
  videoUrl: string;
  content: string;
  mediaUrl: string;
}

// Blog CRUD
export async function getAllPosts() {
  const postsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'blog_posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title || '',
      slug: (data.title || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-'),
      category: data.category || 'Estrategia',
      excerpt: data.excerpt || '',
      content: data.content || '',
      image: data.image || '',
      readTime: data.readTime || '5 min lectura',
      author: data.author || 'Equipo Growth4U',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createPost(post: BlogPostInput): Promise<string> {
  const postsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'blog_posts');
  const docRef = await addDoc(postsRef, {
    ...post,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePost(postId: string, post: Partial<BlogPostInput>): Promise<void> {
  const postRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'blog_posts', postId);
  await updateDoc(postRef, { ...post, updatedAt: serverTimestamp() });
}

export async function deletePost(postId: string): Promise<void> {
  const postRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'blog_posts', postId);
  await deleteDoc(postRef);
}

// Case Studies CRUD
export async function getAllCaseStudies() {
  const casesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'case_studies');
  const q = query(casesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      slug: (data.company || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-'),
      company: data.company || '',
      logo: data.logo || '',
      stat: data.stat || '',
      statLabel: data.statLabel || '',
      highlight: data.highlight || '',
      summary: data.summary || '',
      challenge: data.challenge || '',
      solution: data.solution || '',
      results: data.results || [],
      testimonial: data.testimonial || '',
      testimonialAuthor: data.testimonialAuthor || '',
      testimonialRole: data.testimonialRole || '',
      image: data.image || '',
      videoUrl: data.videoUrl || '',
      content: data.content || '',
      mediaUrl: data.mediaUrl || '',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createCaseStudy(caseStudy: CaseStudyInput): Promise<string> {
  const casesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'case_studies');
  const docRef = await addDoc(casesRef, {
    ...caseStudy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCaseStudy(caseId: string, caseStudy: Partial<CaseStudyInput>): Promise<void> {
  const caseRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'case_studies', caseId);
  await updateDoc(caseRef, { ...caseStudy, updatedAt: serverTimestamp() });
}

export async function deleteCaseStudy(caseId: string): Promise<void> {
  const caseRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'case_studies', caseId);
  await deleteDoc(caseRef);
}

// Feedback
export async function saveFeedback(data: FeedbackData): Promise<string> {
  const feedbackRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedback');
  const docRef = await addDoc(feedbackRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export interface FeedbackResponse extends FeedbackData {
  id: string;
  createdAt: Date | null;
}

export async function getAllFeedback(): Promise<FeedbackResponse[]> {
  const feedbackRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedback');
  const q = query(feedbackRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as FeedbackData),
    createdAt: d.data().createdAt?.toDate() || null,
  }));
}

// Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const ALLOWED_DOMAIN = 'growth4u.io';

export async function signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const email = result.user.email || '';
    if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
      await signOut(auth);
      return { user: null, error: `Solo se permiten correos de @${ALLOWED_DOMAIN}` };
    }
    return { user: result.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      const email = user.email || '';
      if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
        signOut(auth);
        callback(null);
        return;
      }
    }
    callback(user);
  });
}

// Articles
export interface ArticleInput {
  title: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  readTime: string;
  author: string;
  published: boolean;
}

export interface ArticleLead {
  nombre: string;
  email: string;
  tag: string;
  articleSlug: string;
  articleTitle: string;
}

// Lead Magnets
export interface LeadMagnetInput {
  title: string;
  slug: string;
  description: string;
  image: string;
  excerpt: string;
  content: string;
  contentUrl: string;
  published: boolean;
}

export interface LeadMagnetLead {
  nombre: string;
  email: string;
  tag: string;
  magnetSlug: string;
  magnetTitle: string;
}

// Articles CRUD
export async function getAllArticles() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'articles');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title || '',
      slug: (data.title || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-'),
      category: data.category || 'Estrategia',
      excerpt: data.excerpt || '',
      content: data.content || '',
      image: data.image || '',
      readTime: data.readTime || '5 min lectura',
      author: data.author || 'Equipo Growth4U',
      published: data.published !== false,
      createdAt: data.createdAt?.toDate() || null,
    };
  });
}

export async function createArticle(article: ArticleInput): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'articles');
  const docRef = await addDoc(ref, { ...article, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateArticle(id: string, article: Partial<ArticleInput>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'articles', id);
  await updateDoc(ref, { ...article, updatedAt: serverTimestamp() });
}

export async function deleteArticle(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'articles', id);
  await deleteDoc(ref);
}

export async function saveArticleLead(data: ArticleLead): Promise<void> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'article_leads');
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
}

export async function getArticleById(id: string): Promise<{ content: string } | null> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'articles', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { content: snap.data().content || '' };
}

export async function getAllArticleLeads() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'article_leads');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() as any }));
}

// Lead Magnets CRUD
export async function getAllLeadMagnets() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnets');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    const slugVal = data.slug || (data.title || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
    return {
      id: d.id,
      title: data.title || '',
      slug: slugVal,
      description: data.description || '',
      image: data.image || '',
      excerpt: data.excerpt || '',
      content: data.content || '',
      contentUrl: data.contentUrl || '',
      published: data.published !== false,
      createdAt: data.createdAt?.toDate() || null,
    };
  });
}

export async function createLeadMagnet(magnet: LeadMagnetInput): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnets');
  const docRef = await addDoc(ref, { ...magnet, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateLeadMagnet(id: string, magnet: Partial<LeadMagnetInput>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnets', id);
  await updateDoc(ref, { ...magnet, updatedAt: serverTimestamp() });
}

export async function deleteLeadMagnet(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnets', id);
  await deleteDoc(ref);
}

export async function getLeadMagnetById(id: string): Promise<{ content: string } | null> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnets', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { content: snap.data().content || '' };
}

const GHL_WEBHOOK_LEADMAGNET = 'https://services.leadconnectorhq.com/hooks/BnXWP5dcLVMgUudLv10O/webhook-trigger/80a057fa-778c-43af-9ca1-5186e4b0d058';
const GHL_WEBHOOK_NEWSLETTER = 'https://services.leadconnectorhq.com/hooks/BnXWP5dcLVMgUudLv10O/webhook-trigger/dc7377a6-1e39-41aa-8080-93cb3d03fd33';

function sendToGHL(data: LeadMagnetLead): void {
  const isNewsletter = data.magnetSlug === 'newsletter';
  const nameParts = data.nombre.trim().split(' ');
  const firstName = nameParts[0] || data.nombre;
  const lastName = nameParts.slice(1).join(' ') || '';
  const payload = {
    firstName,
    lastName,
    email: data.email,
    tags: isNewsletter ? ['newsletter-subscriber'] : ['lead-magnet', data.magnetSlug],
    source: `Growth4U - ${data.magnetTitle}`,
    customData: {
      magnetSlug: data.magnetSlug,
      magnetTitle: data.magnetTitle,
      tag: data.tag,
    },
  };
  const webhookUrl = isNewsletter ? GHL_WEBHOOK_NEWSLETTER : GHL_WEBHOOK_LEADMAGNET;
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export async function saveLeadMagnetLead(data: LeadMagnetLead): Promise<void> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnet_leads');
  await addDoc(ref, { ...data, createdAt: serverTimestamp() });
  sendToGHL(data);
}

export async function getAllLeadMagnetLeads() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnet_leads');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() as any }));
}

export async function deleteFeedback(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'feedback', id);
  await deleteDoc(ref);
}

// Instagram Scheduled Posts
export interface IGScheduledPost {
  imageUrl: string;
  caption: string;
  blogTitle: string;
  blogSlug: string;
  scheduledAt: Date;
  status: 'pending' | 'publishing' | 'published' | 'error';
  error?: string;
  mediaId?: string;
  createdAt?: Date;
}

export async function getIGScheduledPosts() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'ig_scheduled_posts');
  const q = query(ref, orderBy('scheduledAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      imageUrl: data.imageUrl || '',
      caption: data.caption || '',
      blogTitle: data.blogTitle || '',
      blogSlug: data.blogSlug || '',
      scheduledAt: data.scheduledAt?.toDate() || new Date(),
      status: data.status || 'pending',
      error: data.error || '',
      mediaId: data.mediaId || '',
      createdAt: data.createdAt?.toDate() || null,
    };
  });
}

export async function createIGScheduledPost(post: Omit<IGScheduledPost, 'status' | 'createdAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'ig_scheduled_posts');
  const docRef = await addDoc(ref, {
    ...post,
    scheduledAt: post.scheduledAt,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteIGScheduledPost(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'ig_scheduled_posts', id);
  await deleteDoc(ref);
}

// Instagram Bot Status (synced from instagram-bot via REST API)
export interface IGBotDailyStats {
  date: string;
  follows: number;
  unfollows: number;
  likes: number;
  comments: number;
}

export interface IGBotActivity {
  type: 'follow' | 'unfollow' | 'like' | 'comment';
  username: string;
  detail: string;
  timestamp: string;
}

export interface IGBotStats {
  poolSize: number;
  activeFollows: number;
  totalFollowed: number;
  totalUnfollowed: number;
  totalLikes: number;
  totalComments: number;
  blacklistCount: number;
  todayStats: IGBotDailyStats;
  dailyStats: IGBotDailyStats[];
  recentActivity: IGBotActivity[];
  sessionStartedAt: string;
  sessionEndedAt: string;
  sessionDurationMin: number;
  targetAccounts: string[];
  limits: {
    maxFollowsPerDay: number;
    maxLikesPerDay: number;
    maxCommentsPerDay: number;
    maxUnfollowsPerDay: number;
    unfollowAfterDays: number;
  };
  lastRunAt: string;
}

export async function getIGBotStats(): Promise<IGBotStats | null> {
  try {
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'ig_bot_status', 'current');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as IGBotStats;
  } catch (error) {
    console.error('Error fetching IG bot stats:', error);
    return null;
  }
}

// LinkedIn Scheduled Posts
export interface LIScheduledPost {
  imageUrl: string;
  caption: string;
  blogTitle: string;
  blogSlug: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'sent' | 'scheduled' | 'error';
  account: string;
  error?: string;
  createdAt?: Date;
}

export async function getLIScheduledPosts() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_scheduled_posts');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      imageUrl: data.imageUrl || '',
      caption: data.caption || '',
      blogTitle: data.blogTitle || '',
      blogSlug: data.blogSlug || '',
      scheduledDate: data.scheduledDate || '',
      scheduledTime: data.scheduledTime || '',
      status: data.status || 'sent',
      account: data.account || 'growth4u',
      error: data.error || '',
      createdAt: data.createdAt?.toDate() || null,
    };
  });
}

export async function createLIScheduledPost(post: Omit<LIScheduledPost, 'createdAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_scheduled_posts');
  const docRef = await addDoc(ref, {
    ...post,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateLIScheduledPost(id: string, updates: Partial<LIScheduledPost>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_scheduled_posts', id);
  await updateDoc(ref, updates);
}

export async function deleteLIScheduledPost(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_scheduled_posts', id);
  await deleteDoc(ref);
}

// LinkedIn Content Posts (text, carousel, etc.)
export type LIContentFormat = 'text' | 'carousel';
export type LIContentStatus = 'draft' | 'ready' | 'published';

export interface LICarouselSlide {
  title: string;
  body: string;
  imageUrl?: string;
}

export interface LIContentPost {
  format: LIContentFormat;
  title: string;
  body: string;
  slides: LICarouselSlide[];
  author: string;
  status: LIContentStatus;
  hook?: string;
  cta?: string;
  tags: string[];
  publishedUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllLIContentPosts() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_content_posts');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      format: data.format || 'text',
      title: data.title || '',
      body: data.body || '',
      slides: data.slides || [],
      author: data.author || 'philippe',
      status: data.status || 'draft',
      hook: data.hook || '',
      cta: data.cta || '',
      tags: data.tags || [],
      publishedUrl: data.publishedUrl || '',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    } as LIContentPost & { id: string };
  });
}

export async function createLIContentPost(post: Omit<LIContentPost, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_content_posts');
  const docRef = await addDoc(ref, {
    ...post,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateLIContentPost(id: string, updates: Partial<LIContentPost>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_content_posts', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteLIContentPost(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_content_posts', id);
  await deleteDoc(ref);
}

// LinkedIn Bot — Comments
export interface LIComment {
  profileName: string;
  profileUrl: string;
  profileTitle: string;
  postUrl: string;
  postSnippet: string;
  commentDraft: string;
  commentType: 'outbound' | 'authority' | 'growth' | 'founder';
  status: 'pending' | 'approved' | 'rejected' | 'posted';
  postDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllLIComments() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_comments');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      profileName: data.profileName || '',
      profileUrl: data.profileUrl || '',
      profileTitle: data.profileTitle || '',
      postUrl: data.postUrl || '',
      postSnippet: data.postSnippet || '',
      commentDraft: data.commentDraft || '',
      commentType: data.commentType || 'outbound',
      status: data.status || 'pending',
      postDate: data.postDate || '',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createLIComment(comment: Omit<LIComment, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_comments');
  const docRef = await addDoc(ref, { ...comment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateLIComment(id: string, updates: Partial<LIComment>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_comments', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteLIComment(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_comments', id);
  await deleteDoc(ref);
}

// LinkedIn Bot — Prospects
export type ProspectProfileType = 'ceo' | 'cto' | 'cmo' | 'coo' | 'vp_growth' | 'head_growth' | 'founder' | 'growth_expert' | 'other';

export interface LIProspect {
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  email: string;
  source: string;
  country: string;
  location: string;
  profileType: ProspectProfileType;
  funnelStage: 'detected' | 'connected' | 'nurturing' | 'meeting' | 'disqualified';
  // Company intelligence
  companySector: string;
  companySize: string;
  fundingStage: string;
  painPoints: string;
  // G4U match
  g4uMatch: string;
  outreachMessage: string;
  connectionMessage: string;
  // Signals
  intentScore: number;
  signals: string[];
  tags: string[];
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllLIProspects() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_prospects');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      title: data.title || '',
      company: data.company || '',
      linkedinUrl: data.linkedinUrl || '',
      email: data.email || '',
      source: data.source || '',
      country: data.country || '',
      location: data.location || '',
      profileType: (data.profileType || 'other') as ProspectProfileType,
      funnelStage: data.funnelStage || 'detected',
      companySector: data.companySector || '',
      companySize: data.companySize || '',
      fundingStage: data.fundingStage || '',
      painPoints: data.painPoints || '',
      g4uMatch: data.g4uMatch || '',
      outreachMessage: data.outreachMessage || '',
      connectionMessage: data.connectionMessage || '',
      intentScore: data.intentScore || 0,
      signals: data.signals || [],
      tags: data.tags || [],
      notes: data.notes || '',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createLIProspect(prospect: Omit<LIProspect, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_prospects');
  const docRef = await addDoc(ref, { ...prospect, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateLIProspect(id: string, updates: Partial<LIProspect>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_prospects', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteLIProspect(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_prospects', id);
  await deleteDoc(ref);
}

// LinkedIn Bot — Creator Network
export interface LICreator {
  name: string;
  linkedinUrl: string;
  category: string;
  lastPostDate: string;
  lastCommentDate: string;
  commentCount: number;
  notes: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllLICreators() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_creators');
  const q = query(ref, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      linkedinUrl: data.linkedinUrl || '',
      category: data.category || '',
      lastPostDate: data.lastPostDate || '',
      lastCommentDate: data.lastCommentDate || '',
      commentCount: data.commentCount || 0,
      notes: data.notes || '',
      active: data.active !== false,
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createLICreator(creator: Omit<LICreator, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_creators');
  const docRef = await addDoc(ref, { ...creator, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateLICreator(id: string, updates: Partial<LICreator>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_creators', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteLICreator(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_creators', id);
  await deleteDoc(ref);
}

// LinkedIn Bot — Candidates (pre-validation, before becoming prospects)
export interface LICandidate {
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  country: string;             // country code (e.g. "ES", "US")
  location: string;            // full location text (e.g. "Madrid, Spain")
  sourcePostUrl: string;       // post where they interacted
  sourceCreatorName: string;   // whose post they interacted with
  sourceCommentDraft: string;  // comment Growth4U made/would make on that post
  interactionType: 'like' | 'comment' | 'repost';
  profileType: ProspectProfileType;
  reason: string;              // why AI flagged them (e.g. "CTO at fintech")
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllLICandidates() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_candidates');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      title: data.title || '',
      company: data.company || '',
      linkedinUrl: data.linkedinUrl || '',
      country: data.country || '',
      location: data.location || '',
      sourcePostUrl: data.sourcePostUrl || '',
      sourceCreatorName: data.sourceCreatorName || '',
      sourceCommentDraft: data.sourceCommentDraft || '',
      interactionType: data.interactionType || 'like',
      profileType: (data.profileType || 'other') as ProspectProfileType,
      reason: data.reason || '',
      status: data.status || 'pending',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createLICandidate(candidate: Omit<LICandidate, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_candidates');
  const docRef = await addDoc(ref, { ...candidate, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateLICandidate(id: string, updates: Partial<LICandidate>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_candidates', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteLICandidate(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_candidates', id);
  await deleteDoc(ref);
}

// Slack Notifications — via Netlify Function proxy (avoids CORS)
const SLACK_PROXY_URL = '/api/slack';

export async function sendSlackNotification(text: string, blocks?: any[]): Promise<boolean> {
  try {
    const payload: any = { text };
    if (blocks) payload.blocks = blocks;
    const res = await fetch(SLACK_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendLIBotSlackSummary(data: {
  pendingComments: number;
  approvedToday: number;
  postedTotal: number;
  activeProspects: number;
  uncuratedProspects: number;
  meetingProspects: number;
  activeCreators: number;
}): Promise<boolean> {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'LinkedIn Bot — Resumen diario', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Comentarios pendientes:*\n${data.pendingComments}` },
        { type: 'mrkdwn', text: `*Aprobados hoy:*\n${data.approvedToday}` },
        { type: 'mrkdwn', text: `*Total publicados:*\n${data.postedTotal}` },
        { type: 'mrkdwn', text: `*Prospects activos:*\n${data.activeProspects}` },
        { type: 'mrkdwn', text: `*Sin curar:*\n${data.uncuratedProspects}` },
        { type: 'mrkdwn', text: `*En reunión:*\n${data.meetingProspects}` },
      ],
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Creators activos: ${data.activeCreators} · <https://growth4u.io/admin/linkedin-bot/|Ver dashboard>` },
      ],
    },
    { type: 'divider' },
  ];

  const urgentItems: string[] = [];
  if (data.pendingComments > 0) urgentItems.push(`${data.pendingComments} comentarios esperan aprobación`);
  if (data.uncuratedProspects > 0) urgentItems.push(`${data.uncuratedProspects} prospects sin curar`);

  if (urgentItems.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Acción requerida:*\n${urgentItems.map((i) => `• ${i}`).join('\n')}` },
    } as any);
  }

  return sendSlackNotification(
    `LinkedIn Bot: ${data.pendingComments} pendientes, ${data.activeProspects} prospects activos`,
    blocks,
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SEO+GEO Audits
// ═══════════════════════════════════════════════════════════════════════

export interface GEOPromptResult {
  platform: string;
  prompt: string;
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  citedUrls: string[];
  responseSnippet: string;
  testedAt: string;
}

export interface SERPCheck {
  keyword: string;
  position: number | null;
  url: string;
  title: string;
  checkedAt: string;
}

export interface SEOGEOAudit {
  name: string;
  domain: string;
  status: 'draft' | 'running' | 'completed';
  targetKeywords: string[];
  serpResults: SERPCheck[];
  webVitals: Record<string, any> | null;
  geoPrompts: GEOPromptResult[];
  seoScore: number;
  geoScore: number;
  gaps: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllSEOGEOAudits() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'seo_geo_audits');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      domain: data.domain || '',
      status: data.status || 'draft',
      targetKeywords: data.targetKeywords || [],
      serpResults: data.serpResults || [],
      webVitals: data.webVitals || null,
      geoPrompts: data.geoPrompts || [],
      seoScore: data.seoScore || 0,
      geoScore: data.geoScore || 0,
      gaps: data.gaps || [],
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createSEOGEOAudit(audit: Omit<SEOGEOAudit, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'seo_geo_audits');
  const docRef = await addDoc(ref, { ...audit, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateSEOGEOAudit(id: string, updates: Partial<SEOGEOAudit>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'seo_geo_audits', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteSEOGEOAudit(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'seo_geo_audits', id);
  await deleteDoc(ref);
}

// ═══════════════════════════════════════════════════════════════════════
// Partners
// ═══════════════════════════════════════════════════════════════════════

export interface OutreachEvent {
  date: string;
  type: 'email' | 'dm' | 'call' | 'meeting' | 'other';
  notes: string;
}

export type PartnerType = 'influencer' | 'media' | 'referral' | 'agency' | 'community';
export type PartnerStatus = 'discovered' | 'contacted' | 'negotiating' | 'active' | 'inactive';

export interface Partner {
  name: string;
  type: PartnerType;
  platform: string;
  contactName: string;
  contactEmail: string;
  contactUrl: string;
  status: PartnerStatus;
  relevanceScore: number;
  niche: string;
  audienceSize: string;
  notes: string;
  outreachHistory: OutreachEvent[];
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllPartners() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'partners');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      type: (data.type || 'referral') as PartnerType,
      platform: data.platform || '',
      contactName: data.contactName || '',
      contactEmail: data.contactEmail || '',
      contactUrl: data.contactUrl || '',
      status: (data.status || 'discovered') as PartnerStatus,
      relevanceScore: data.relevanceScore || 0,
      niche: data.niche || '',
      audienceSize: data.audienceSize || '',
      notes: data.notes || '',
      outreachHistory: data.outreachHistory || [],
      tags: data.tags || [],
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createPartner(partner: Omit<Partner, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'partners');
  const docRef = await addDoc(ref, { ...partner, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updatePartner(id: string, updates: Partial<Partner>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'partners', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deletePartner(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'partners', id);
  await deleteDoc(ref);
}

// ═══════════════════════════════════════════════════════════════════════
// Content Briefs (Keyword Research + Brief Generator)
// ═══════════════════════════════════════════════════════════════════════

export interface KeywordSuggestion {
  keyword: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  difficulty: 'low' | 'medium' | 'high';
  relevance: number;
  selected: boolean;
}

export type BriefStatus = 'draft' | 'researched' | 'brief_ready' | 'writing' | 'published';

export interface ContentBrief {
  topic: string;
  status: BriefStatus;
  keywords: KeywordSuggestion[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  suggestedTitle: string;
  metaDescription: string;
  outline: string[];
  targetWordCount: number;
  targetAudience: string;
  contentAngle: string;
  competitorUrls: string[];
  internalLinks: string[];
  linkedBlogPostId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllContentBriefs() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'content_briefs');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      topic: data.topic || '',
      status: (data.status || 'draft') as BriefStatus,
      keywords: data.keywords || [],
      primaryKeyword: data.primaryKeyword || '',
      secondaryKeywords: data.secondaryKeywords || [],
      suggestedTitle: data.suggestedTitle || '',
      metaDescription: data.metaDescription || '',
      outline: data.outline || [],
      targetWordCount: data.targetWordCount || 1000,
      targetAudience: data.targetAudience || '',
      contentAngle: data.contentAngle || '',
      competitorUrls: data.competitorUrls || [],
      internalLinks: data.internalLinks || [],
      linkedBlogPostId: data.linkedBlogPostId || '',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createContentBrief(brief: Omit<ContentBrief, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'content_briefs');
  const docRef = await addDoc(ref, { ...brief, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateContentBrief(id: string, updates: Partial<ContentBrief>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'content_briefs', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteContentBrief(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'content_briefs', id);
  await deleteDoc(ref);
}

// ============================================
// NEWSLETTERS
// ============================================

export interface Newsletter {
  subject: string;
  htmlContent: string;
  recipientCount: number;
  status: 'draft' | 'sent' | 'failed';
  sentAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export async function getAllNewsletters() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'newsletters');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() as any }));
}

export async function createNewsletter(newsletter: Omit<Newsletter, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'newsletters');
  const docRef = await addDoc(ref, { ...newsletter, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateNewsletter(id: string, updates: Partial<Newsletter>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'newsletters', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteNewsletter(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'newsletters', id);
  await deleteDoc(ref);
}

export async function getNewsletterSubscribers() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnet_leads');
  const q = query(ref, where('magnetSlug', '==', 'newsletter'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() as any }));
}

// LinkedIn Bot — Knowledge Base (per-person "second brain" extracted from their posts)
export interface LIKnowledge {
  name: string;
  slug: string;        // philippe, alfonso, martin
  role: string;
  topics: string[];
  opinions: string[];
  experiences: string[];
  tone: string;
  summary: string;
  postCount: number;
  lastUpdated: string;
  updatedAt?: Date;
}

export async function getAllLIKnowledge() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'li_knowledge');
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      slug: data.slug || d.id,
      role: data.role || '',
      topics: data.topics || [],
      opinions: data.opinions || [],
      experiences: data.experiences || [],
      tone: data.tone || '',
      summary: data.summary || '',
      postCount: data.postCount || 0,
      lastUpdated: data.lastUpdated || '',
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function getLIKnowledge(slug: string) {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_knowledge', slug);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as LIKnowledge & { id: string };
}

export async function updateLIKnowledge(slug: string, updates: Partial<LIKnowledge>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'li_knowledge', slug);
  await setDoc(ref, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

// =====================================================
// X/Twitter Bot — Creators
// =====================================================

export interface XCreator {
  handle: string;
  name: string;
  category: string;
  notes: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllXCreators() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'x_creators');
  const q = query(ref, orderBy('handle', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      handle: data.handle || '',
      name: data.name || '',
      category: data.category || '',
      notes: data.notes || '',
      active: data.active !== false,
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createXCreator(creator: Omit<XCreator, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'x_creators');
  const docRef = await addDoc(ref, { ...creator, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateXCreator(id: string, updates: Partial<XCreator>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'x_creators', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteXCreator(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'x_creators', id);
  await deleteDoc(ref);
}

// =====================================================
// X/Twitter Bot — Replies (generated replies to influencer tweets)
// =====================================================

export interface XReply {
  handle: string;
  tweetUrl: string;
  tweetSnippet: string;
  replyDraft: string;
  category: string;
  views?: number;
  status: 'pending' | 'approved' | 'rejected' | 'posted';
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllXReplies() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'x_replies');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      handle: data.handle || '',
      tweetUrl: data.tweetUrl || '',
      tweetSnippet: data.tweetSnippet || '',
      replyDraft: data.replyDraft || '',
      category: data.category || 'engagement',
      views: data.views || 0,
      status: data.status || 'pending',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createXReply(reply: Omit<XReply, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'x_replies');
  const docRef = await addDoc(ref, { ...reply, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateXReply(id: string, updates: Partial<XReply>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'x_replies', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteXReply(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'x_replies', id);
  await deleteDoc(ref);
}

export async function deleteAllXReplies(): Promise<number> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'x_replies');
  const snapshot = await getDocs(ref);
  let deleted = 0;
  // Firestore batches support max 500 ops
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

// =====================================================
// X/Twitter Bot — Posts (own content ideas and drafts)
// =====================================================

export interface XPost {
  topic: string;
  angle: string;
  format: 'tweet' | 'thread' | 'quote';
  draft: string;
  threadSlides: string[];
  inspiration: string;
  language: string;
  status: 'idea' | 'draft' | 'approved' | 'scheduled' | 'posted';
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getAllXPosts() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'x_posts');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      topic: data.topic || '',
      angle: data.angle || '',
      format: data.format || 'tweet',
      draft: data.draft || '',
      threadSlides: data.threadSlides || [],
      inspiration: data.inspiration || '',
      language: data.language || 'es',
      status: data.status || 'idea',
      scheduledDate: data.scheduledDate || '',
      scheduledTime: data.scheduledTime || '',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    };
  });
}

export async function createXPost(post: Omit<XPost, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'x_posts');
  const docRef = await addDoc(ref, { ...post, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateXPost(id: string, updates: Partial<XPost>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'x_posts', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteXPost(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'x_posts', id);
  await deleteDoc(ref);
}

// ===================== Content Ideas (Ideas Hub) =====================

export interface ContentIdea {
  topic: string;
  angle: string;
  platforms: ('linkedin' | 'twitter' | 'instagram' | 'newsletter' | 'blog')[];
  format: 'post' | 'thread' | 'carousel' | 'article' | 'newsletter-section';
  priority: 'high' | 'medium' | 'low';
  status: 'idea' | 'draft' | 'assigned' | 'done';
  assignedTo?: string;
  sourceType: 'x_creator' | 'li_creator' | 'news' | 'mixed';
  sourceInspiration: string;
  sourceUrl?: string;
  generatedBy: 'ai' | 'manual';
  batchId?: string;
  notes: string;
  createdAt?: any;
  updatedAt?: any;
}

export async function getAllContentIdeas() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'content_ideas');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      topic: data.topic || '',
      angle: data.angle || '',
      platforms: data.platforms || [],
      format: data.format || 'post',
      priority: data.priority || 'medium',
      status: data.status || 'idea',
      assignedTo: data.assignedTo || '',
      sourceType: data.sourceType || 'mixed',
      sourceInspiration: data.sourceInspiration || '',
      sourceUrl: data.sourceUrl || '',
      generatedBy: data.generatedBy || 'ai',
      batchId: data.batchId || '',
      notes: data.notes || '',
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
    } as ContentIdea & { id: string };
  });
}

export async function createContentIdea(idea: Omit<ContentIdea, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'content_ideas');
  const docRef = await addDoc(ref, { ...idea, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateContentIdea(id: string, updates: Partial<ContentIdea>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'content_ideas', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteContentIdea(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'content_ideas', id);
  await deleteDoc(ref);
}

// ===================== News Sources (Ideas Hub) =====================

export interface NewsSource {
  name: string;
  query: string;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export async function getAllNewsSources() {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'news_sources');
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => ({
    id: d.id,
    name: d.data().name || '',
    query: d.data().query || '',
    active: d.data().active !== false,
    createdAt: d.data().createdAt?.toDate() || null,
    updatedAt: d.data().updatedAt?.toDate() || null,
  })) as (NewsSource & { id: string })[];
}

export async function createNewsSource(source: Omit<NewsSource, 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'news_sources');
  const docRef = await addDoc(ref, { ...source, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function updateNewsSource(id: string, updates: Partial<NewsSource>): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'news_sources', id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteNewsSource(id: string): Promise<void> {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'news_sources', id);
  await deleteDoc(ref);
}

export { db, auth, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, limit, where, serverTimestamp };
