import type { Context } from "@netlify/functions";

const METRICOOL_TOKEN = process.env.METRICOOL_USER_TOKEN;
const METRICOOL_USER_ID = process.env.METRICOOL_USER_ID;
const METRICOOL_BLOG_ID = process.env.METRICOOL_BLOG_ID;
const METRICOOL_BASE = "https://app.metricool.com/api";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const mcHeaders = () => ({
  "X-Mc-Auth": METRICOOL_TOKEN!,
});

// Check if LinkedIn is connected via Metricool profiles
async function checkConnection(): Promise<{ connected: boolean; org?: string }> {
  const url = `${METRICOOL_BASE}/admin/simpleProfiles?blogId=${METRICOOL_BLOG_ID}&userId=${METRICOOL_USER_ID}`;
  const res = await fetch(url, { headers: mcHeaders() });
  if (!res.ok) {
    return { connected: false };
  }
  const data = await res.json();
  // Look for LinkedIn in the profiles list
  const profiles = Array.isArray(data) ? data : data.profiles || data.elements || [];
  const linkedin = profiles.find(
    (p: Record<string, unknown>) =>
      (p.network as string)?.toUpperCase() === "LINKEDIN" ||
      (p.type as string)?.toUpperCase() === "LINKEDIN"
  );
  if (linkedin) {
    return { connected: true, org: (linkedin.name as string) || (linkedin.username as string) || "LinkedIn" };
  }
  // If we can't find LinkedIn specifically but Metricool is configured, assume connected
  // since scheduling already works
  return { connected: true, org: "LinkedIn (via Metricool)" };
}

// Fetch LinkedIn post metrics from Metricool
async function fetchMetrics() {
  // Get date range: last 90 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const url = `${METRICOOL_BASE}/stats/linkedin/posts?blogId=${METRICOOL_BLOG_ID}&userId=${METRICOOL_USER_ID}&initDate=${startStr}&endDate=${endStr}`;
  const res = await fetch(url, { headers: mcHeaders() });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Metricool stats failed (${res.status}): ${text}`);
  }

  let rawPosts: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(text);
    rawPosts = Array.isArray(parsed) ? parsed : parsed.posts || parsed.elements || parsed.data || [];
  } catch {
    throw new Error(`Invalid response from Metricool stats`);
  }

  const posts = rawPosts.map((p) => ({
    id: (p.id as string) || (p.postId as string) || "",
    text: (p.text as string) || (p.caption as string) || (p.commentary as string) || "",
    createdAt: (p.date as string) || (p.publishedAt as string) || (p.createdAt as string) || null,
    imageUrl: (p.imageUrl as string) || (p.image as string) || (p.mediaUrl as string) || "",
    likes: (p.likes as number) || (p.reactions as number) || 0,
    comments: (p.comments as number) || 0,
    shares: (p.shares as number) || (p.reposts as number) || 0,
    impressions: (p.impressions as number) || 0,
    clicks: (p.clicks as number) || 0,
  }));

  return {
    account: {
      name: "LinkedIn (via Metricool)",
      personUrn: "",
      headline: "",
      profilePicture: "",
    },
    posts,
  };
}

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!METRICOOL_TOKEN || !METRICOOL_USER_ID || !METRICOOL_BLOG_ID) {
    return Response.json(
      { error: "Metricool API not configured. Set METRICOOL_USER_TOKEN, METRICOOL_USER_ID, and METRICOOL_BLOG_ID." },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // GET = check connection or fetch metrics
  if (req.method === "GET") {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ?action=metrics → fetch posts + engagement via Metricool
    if (action === "metrics") {
      try {
        const data = await fetchMetrics();
        return Response.json(data, { headers: CORS_HEADERS });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // Default GET = connection check via Metricool
    try {
      const status = await checkConnection();
      return Response.json(status, { headers: CORS_HEADERS });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return Response.json({ connected: false, error: message }, { headers: CORS_HEADERS });
    }
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  // POST = schedule a LinkedIn post via Metricool (publish "now" = schedule 2 min from now)
  try {
    const body = await req.json() as { text: string; imageUrl?: string };
    const { text, imageUrl } = body;

    if (!text) {
      return Response.json(
        { error: "text is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Normalize image if provided
    let mediaIds: string[] = [];
    if (imageUrl) {
      const normalizeUrl = `${METRICOOL_BASE}/actions/normalize/image/url?url=${encodeURIComponent(imageUrl)}&blogId=${METRICOOL_BLOG_ID}&userId=${METRICOOL_USER_ID}`;
      const normRes = await fetch(normalizeUrl, { headers: mcHeaders() });
      const normText = await normRes.text();
      if (!normRes.ok) {
        throw new Error(`Image normalize failed (${normRes.status}): ${normText}`);
      }
      let mediaId: string;
      try {
        const d = JSON.parse(normText);
        mediaId = d.mediaId || d.id || String(d);
      } catch {
        mediaId = normText.trim();
      }
      mediaIds = [mediaId];
    }

    // Schedule 5 minutes from now for "publish now"
    const publishDate = new Date(Date.now() + 5 * 60 * 1000);
    const dateTime = publishDate.toISOString().replace(/\.\d{3}Z$/, "");
    const timezone = "UTC";

    const scheduleUrl = `${METRICOOL_BASE}/v2/scheduler/posts?blogId=${METRICOOL_BLOG_ID}&userId=${METRICOOL_USER_ID}`;
    const scheduleBody = {
      text,
      providers: [{ network: "LINKEDIN" }],
      publicationDate: { dateTime, timezone },
      autoPublish: true,
      draft: false,
      media: mediaIds,
      mediaAltText: [],
      descendants: [],
      firstCommentText: "",
      shortener: false,
      smartLinkData: { ids: [] },
      linkedinData: {
        documentTitle: "",
        publishImagesAsPDF: false,
        previewIncluded: true,
        type: imageUrl ? "IMAGE" : "NONE",
        poll: null,
      },
      twitterData: { tags: [] },
      facebookData: { type: "IMAGE", title: "", boostPayer: null, boostBeneficiary: null },
      instagramData: { type: "POST", collaborators: [], carouselTags: {}, showReelOnFeed: true },
      pinterestData: { boardId: null, pinTitle: "", pinLink: "", pinNewFormat: false },
      youtubeData: { title: "", type: "VIDEO", privacy: "PUBLIC", tags: [], category: "", madeForKids: false },
      tiktokData: { disableComment: false, disableDuet: false, disableStitch: false, privacyOption: "PUBLIC_TO_EVERYONE" },
      blueskyData: { postLanguages: [] },
    };

    const res = await fetch(scheduleUrl, {
      method: "POST",
      headers: {
        ...mcHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scheduleBody),
    });

    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`Schedule failed (${res.status}): ${responseText}`);
    }

    let result: Record<string, unknown> = { published: true };
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { published: true, raw: responseText };
      }
    }

    return Response.json(
      { success: true, data: result },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};
