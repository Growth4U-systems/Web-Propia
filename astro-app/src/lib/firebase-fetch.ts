/**
 * Firebase Firestore REST API for build-time data fetching.
 * Uses a local JSON cache (src/data/posts.json) as primary source so builds
 * never hit Firebase rate limits. Falls back to Firestore REST API if the cache
 * is empty. The Python publish script keeps the cache up to date.
 */

import { FIREBASE_PROJECT_ID, FIREBASE_APP_ID } from './constants';
import postsCache from '../data/posts.json';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const COLLECTION_BASE = `artifacts/${FIREBASE_APP_ID}/public/data`;

// Types matching the existing Next.js interfaces
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  readTime: string;
  author: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CaseStudy {
  id: string;
  slug: string;
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
  createdAt: string | null;
  updatedAt: string | null;
}

// Slug generation - same logic as the original firebase.ts
export function createSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// Parse Firestore REST API field values
function parseFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue) {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      result[k] = parseFirestoreValue(v);
    }
    return result;
  }
  return null;
}

// Parse a Firestore document into a plain object
function parseDocument(doc: any): Record<string, any> {
  const fields = doc.fields || {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value);
  }
  // Extract document ID from the name path
  const nameParts = (doc.name || '').split('/');
  result._id = nameParts[nameParts.length - 1];
  return result;
}

// Fetch all blog posts — uses local JSON cache as primary source
export async function getAllPosts(): Promise<BlogPost[]> {
  // Use the local JSON cache if populated (avoids Firestore rate limits at build time)
  if (Array.isArray(postsCache) && postsCache.length > 0) {
    return postsCache as BlogPost[];
  }

  // Fallback: fetch from Firestore REST API
  try {
    const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/blog_posts?pageSize=300`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Firestore API error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const documents = data.documents || [];

    return documents.map((doc: any) => {
      const d = parseDocument(doc);
      return {
        id: d._id,
        title: d.title || '',
        slug: createSlug(d.title || ''),
        category: d.category || 'Estrategia',
        excerpt: d.excerpt || '',
        content: d.content || '',
        image: d.image || '',
        readTime: d.readTime || '5 min lectura',
        author: d.author || 'Equipo Growth4U',
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      };
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getAllSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map((post) => post.slug);
}

// Fetch all case studies
export async function getAllCaseStudies(): Promise<CaseStudy[]> {
  try {
    const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/case_studies?orderBy=createdAt desc`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Firestore API error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const documents = data.documents || [];

    return documents.map((doc: any) => {
      const d = parseDocument(doc);
      return {
        id: d._id,
        slug: createSlug(d.company || ''),
        company: d.company || '',
        logo: d.logo || '',
        stat: d.stat || '',
        statLabel: d.statLabel || '',
        highlight: d.highlight || '',
        summary: d.summary || '',
        challenge: d.challenge || '',
        solution: d.solution || '',
        results: d.results || [],
        testimonial: d.testimonial || '',
        testimonialAuthor: d.testimonialAuthor || '',
        testimonialRole: d.testimonialRole || '',
        testimonialImage: d.testimonialImage || '',
        image: d.image || '',
        videoUrl: d.videoUrl || '',
        content: d.content || '',
        mediaUrl: d.mediaUrl || '',
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      };
    });
  } catch (error) {
    console.error('Error fetching case studies:', error);
    return [];
  }
}

export async function getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  const cases = await getAllCaseStudies();
  return cases.find((c) => c.slug === slug) || null;
}

export async function getAllCaseStudySlugs(): Promise<string[]> {
  const cases = await getAllCaseStudies();
  return cases.map((c) => c.slug);
}

// Articles (gated content)
export interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  image: string;
  readTime: string;
  author: string;
  published: boolean;
  createdAt: string | null;
}

export async function getAllArticles(): Promise<Article[]> {
  try {
    const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/articles`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const documents = data.documents || [];
    return documents
      .map((doc: any) => {
        const d = parseDocument(doc);
        return {
          id: d._id,
          title: d.title || '',
          slug: createSlug(d.title || ''),
          category: d.category || 'Estrategia',
          excerpt: d.excerpt || '',
          image: d.image || '',
          readTime: d.readTime || '5 min lectura',
          author: d.author || 'Equipo Growth4U',
          published: d.published !== false,
          createdAt: d.createdAt || null,
        };
      })
      .filter((a: Article) => a.published);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getAllArticles();
  return articles.find((a) => a.slug === slug) || null;
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const articles = await getAllArticles();
  return articles.map((a) => a.slug);
}

// Lead Magnets
export interface LeadMagnet {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  excerpt: string;
  contentUrl: string;
  published: boolean;
}

export async function getAllLeadMagnets(): Promise<LeadMagnet[]> {
  try {
    const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/lead_magnets`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const documents = data.documents || [];
    return documents
      .map((doc: any) => {
        const d = parseDocument(doc);
        return {
          id: d._id,
          title: d.title || '',
          slug: d.slug || createSlug(d.title || ''),
          description: d.description || '',
          image: d.image || '',
          excerpt: d.excerpt || '',
          contentUrl: d.contentUrl || '',
          published: d.published !== false,
        };
      })
      .filter((m: LeadMagnet) => m.published);
  } catch (error) {
    console.error('Error fetching lead magnets:', error);
    return [];
  }
}

export async function getLeadMagnetBySlug(slug: string): Promise<LeadMagnet | null> {
  const magnets = await getAllLeadMagnets();
  return magnets.find((m) => m.slug === slug) || null;
}

export async function getAllLeadMagnetSlugs(): Promise<string[]> {
  const magnets = await getAllLeadMagnets();
  return magnets.map((m) => m.slug);
}
