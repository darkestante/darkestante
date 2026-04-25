import { BLOG_POSTS } from "./blog-data.js";
import { slugify } from "./data.js";

const BLOG_STORAGE_KEY = "darkestante.blog.customPosts";
const BLOG_ADMIN_AUTH_KEY = "darkestante.blog.adminAuth";
const HERO_SLIDES_STORAGE_KEY = "darkestante.hero.customSlides";
const BLOG_COMMENTS_STORAGE_KEY = "darkestante.blog.comments";
export const BLOG_ADMIN_EMAIL = "darkestante@gmail.com";
export const BLOG_ADMIN_PASSWORD = "@Bc86022389";

export function getAllBlogPosts() {
  return [...BLOG_POSTS, ...getStoredBlogPosts()];
}

export function getStoredBlogPosts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(BLOG_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBlogPost(post) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = getStoredBlogPosts().filter((entry) => entry.slug !== post.slug);
  existing.unshift(post);
  window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(existing));
}

export function isBlogAdminAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(BLOG_ADMIN_AUTH_KEY) === "true";
}

export function setBlogAdminAuthenticated(isAuthenticated) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BLOG_ADMIN_AUTH_KEY, isAuthenticated ? "true" : "false");
}

export function buildBlogPostPayload(fields) {
  const title = String(fields.title || "").trim();
  const category = String(fields.category || "Editorial").trim() || "Editorial";
  const excerpt = String(fields.excerpt || "").trim();
  const intro = String(fields.intro || "").trim();
  const bodyText = String(fields.body || "").trim();

  const paragraphs = bodyText
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  return {
    slug: slugify(title),
    title,
    category,
    date: String(fields.date || "").trim(),
    readingTime: estimateReadingTime(bodyText, String(fields.readingTime || "").trim()),
    featured: Boolean(fields.featured),
    coverLabel: String(fields.coverLabel || category).trim() || category,
    coverTone: "editorial",
    coverImage: String(fields.coverImage || "").trim(),
    videoUrl: String(fields.videoUrl || "").trim(),
    tags: String(fields.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    excerpt,
    intro,
    body: [
      {
        heading: "",
        paragraphs
      }
    ]
  };
}

export function estimateReadingTime(text, fallback = "") {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (!words) {
    return fallback || "1 min de leitura";
  }

  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min de leitura`;
}

export function getStoredHeroSlides() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HERO_SLIDES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHeroSlides(slides) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HERO_SLIDES_STORAGE_KEY, JSON.stringify(slides));
}

export function getPostComments(slug) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(BLOG_COMMENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.[slug]) ? parsed[slug] : [];
  } catch {
    return [];
  }
}

export function savePostComment(slug, comment) {
  if (typeof window === "undefined") {
    return;
  }

  let parsed = {};
  try {
    parsed = JSON.parse(window.localStorage.getItem(BLOG_COMMENTS_STORAGE_KEY) || "{}");
  } catch {
    parsed = {};
  }

  const current = Array.isArray(parsed[slug]) ? parsed[slug] : [];
  parsed[slug] = [comment, ...current];
  window.localStorage.setItem(BLOG_COMMENTS_STORAGE_KEY, JSON.stringify(parsed));
}
