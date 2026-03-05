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

export { db, auth, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, limit, where, serverTimestamp };
