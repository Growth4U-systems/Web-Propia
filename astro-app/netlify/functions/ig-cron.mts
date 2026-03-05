import type { Config } from "@netlify/functions";

const IG_USER_ID = process.env.META_IG_USER_ID;
const ACCESS_TOKEN = process.env.META_IG_ACCESS_TOKEN;
const GRAPH_API = "https://graph.instagram.com/v21.0";

// Firebase REST API
const FIREBASE_PROJECT_ID = "landing-growth4u";
const APP_ID = "growth4u-public-app";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const COLLECTION_PATH = `artifacts/${APP_ID}/public/data/ig_scheduled_posts`;

interface FirestoreDoc {
  name: string;
  fields: Record<string, { stringValue?: string; integerValue?: string; timestampValue?: string; }>;
}

async function getScheduledPosts(): Promise<Array<{ id: string; imageUrl: string; caption: string; scheduledAt: Date; status: string }>> {
  const url = `${FIRESTORE_BASE}/${COLLECTION_PATH}?pageSize=100`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.documents) return [];

  return data.documents
    .map((doc: FirestoreDoc) => {
      const f = doc.fields;
      const id = doc.name.split("/").pop()!;
      return {
        id,
        imageUrl: f.imageUrl?.stringValue || "",
        caption: f.caption?.stringValue || "",
        scheduledAt: new Date(f.scheduledAt?.timestampValue || 0),
        status: f.status?.stringValue || "pending",
      };
    })
    .filter((p: { status: string }) => p.status === "pending");
}

async function updatePostStatus(docId: string, status: string, extra: Record<string, string> = {}) {
  const url = `${FIRESTORE_BASE}/${COLLECTION_PATH}/${docId}?updateMask.fieldPaths=status${Object.keys(extra).map((k) => `&updateMask.fieldPaths=${k}`).join("")}`;

  const fields: Record<string, { stringValue: string }> = {
    status: { stringValue: status },
  };
  for (const [k, v] of Object.entries(extra)) {
    fields[k] = { stringValue: v };
  }

  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
}

async function publishToIG(imageUrl: string, caption: string): Promise<string> {
  // Create container
  const containerRes = await fetch(`${GRAPH_API}/${IG_USER_ID}/media`, {
    method: "POST",
    body: new URLSearchParams({
      image_url: imageUrl,
      caption: caption,
      access_token: ACCESS_TOKEN!,
    }),
  });
  const container = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(container.error?.message || "Failed to create container");
  }

  // Wait for container to be ready
  await new Promise((r) => setTimeout(r, 3000));

  // Publish
  const publishRes = await fetch(`${GRAPH_API}/${IG_USER_ID}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: container.id,
      access_token: ACCESS_TOKEN!,
    }),
  });
  const published = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(published.error?.message || "Failed to publish");
  }
  return published.id;
}

export default async () => {
  if (!IG_USER_ID || !ACCESS_TOKEN) {
    console.log("Instagram API not configured, skipping");
    return;
  }

  const now = new Date();
  console.log(`[ig-cron] Running at ${now.toISOString()}`);

  const pending = await getScheduledPosts();
  console.log(`[ig-cron] Found ${pending.length} pending posts`);

  const due = pending.filter((p) => p.scheduledAt <= now);
  console.log(`[ig-cron] ${due.length} posts are due`);

  for (const post of due) {
    console.log(`[ig-cron] Publishing: ${post.id}`);
    try {
      await updatePostStatus(post.id, "publishing");
      const mediaId = await publishToIG(post.imageUrl, post.caption);
      await updatePostStatus(post.id, "published", { mediaId });
      console.log(`[ig-cron] Published ${post.id} -> ${mediaId}`);
      // Wait between posts to respect rate limits
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[ig-cron] Error publishing ${post.id}: ${message}`);
      await updatePostStatus(post.id, "error", { error: message });
    }
  }

  console.log("[ig-cron] Done");
};

// Run every 15 minutes
export const config: Config = {
  schedule: "*/15 * * * *",
};
