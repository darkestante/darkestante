import { BLOG_POSTS } from "./blog-data.js";
import { slugify } from "./data.js";

const BLOG_STORAGE_KEY = "darkestante.blog.customPosts";
const BLOG_ADMIN_AUTH_KEY = "darkestante.blog.adminAuth";
const HERO_SLIDES_STORAGE_KEY = "darkestante.hero.customSlides";
const BLOG_COMMENTS_STORAGE_KEY = "darkestante.blog.comments";
const BLOG_GITHUB_TOKEN_STORAGE_KEY = "darkestante.blog.githubToken";
const GITHUB_OWNER = "darkestante";
const GITHUB_REPO = "darkestante";
const GITHUB_BRANCH = "main";
const GITHUB_BLOG_DATA_PATH = "blog-data.js";
export const BLOG_ADMIN_EMAIL = "darkestante@gmail.com";
export const BLOG_ADMIN_PASSWORD = "@Bc86022389";

export function getAllBlogPosts() {
  const merged = new Map();

  BLOG_POSTS.forEach((post) => {
    merged.set(post.slug, structuredCloneSafe(post));
  });

  getStoredBlogPosts().forEach((post) => {
    merged.set(post.slug, structuredCloneSafe(post));
  });

  return [...merged.values()].sort(sortBlogPosts);
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

export function getGitHubPublishToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(BLOG_GITHUB_TOKEN_STORAGE_KEY) || "";
}

export function setGitHubPublishToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  const safeToken = String(token || "").trim();
  if (!safeToken) {
    window.localStorage.removeItem(BLOG_GITHUB_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(BLOG_GITHUB_TOKEN_STORAGE_KEY, safeToken);
}

export function clearGitHubPublishToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(BLOG_GITHUB_TOKEN_STORAGE_KEY);
}

export function getBlogPostBySlug(slug) {
  return getAllBlogPosts().find((post) => post.slug === slug) || null;
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
  const existingSlug = String(fields.existingSlug || "").trim();

  const paragraphs = bodyText
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  return {
    slug: existingSlug || slugify(title),
    title,
    category,
    date: String(fields.date || "").trim(),
    readingTime: estimateReadingTime(bodyText, String(fields.readingTime || "").trim()),
    featured: Boolean(fields.featured),
    coverLabel: String(fields.coverLabel || category).trim() || category,
    coverTone: "editorial",
    coverImage: String(fields.coverImage || "").trim(),
    galleryImages: Array.isArray(fields.galleryImages)
      ? fields.galleryImages.filter((image) => String(image || "").trim())
      : [],
    videoUrl: normalizeVideoValue(fields.videoUrl),
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
    ],
    updatedAt: new Date().toISOString()
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

export async function publishBlogPostToGitHub(post) {
  const token = getGitHubPublishToken();
  if (!token) {
    throw new Error("Salve um token do GitHub neste navegador antes de publicar no site.");
  }

  return publishBlogPostToGitHubAttempt(post, token, 0);
}

async function publishBlogPostToGitHubAttempt(post, token, attempt) {
  const endpoint = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_BLOG_DATA_PATH}?ref=${GITHUB_BRANCH}`;
  const currentFileResponse = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!currentFileResponse.ok) {
    const details = await safeReadJson(currentFileResponse);
    throw new Error(details?.message || "Não foi possível ler o arquivo do blog no GitHub.");
  }

  const currentFile = await currentFileResponse.json();
  const posts = parseBlogPostsModule(currentFile.content);
  const nextPosts = upsertPost(posts, post).sort(sortBlogPosts);
  const nextContent = formatBlogDataModule(nextPosts);

  const updateResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_BLOG_DATA_PATH}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      message: `Publica artigo: ${post.title}`,
      content: encodeBase64Utf8(nextContent),
      sha: currentFile.sha,
      branch: GITHUB_BRANCH
    })
  });

  if (!updateResponse.ok) {
    const details = await safeReadJson(updateResponse);
    const message = details?.message || "Não foi possível publicar o artigo no GitHub.";

    if (
      attempt < 1 &&
      typeof message === "string" &&
      (message.includes("does not match") || message.includes("sha"))
    ) {
      return publishBlogPostToGitHubAttempt(post, token, attempt + 1);
    }

    throw new Error(message);
  }

  return updateResponse.json();
}

function sortBlogPosts(a, b) {
  if (Boolean(a.featured) !== Boolean(b.featured)) {
    return a.featured ? -1 : 1;
  }

  const dateA = Date.parse(`${a.date || "1970-01-01"}T12:00:00`);
  const dateB = Date.parse(`${b.date || "1970-01-01"}T12:00:00`);
  return dateB - dateA;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function upsertPost(posts, nextPost) {
  const existing = posts.filter((post) => post.slug !== nextPost.slug);
  existing.unshift(structuredCloneSafe(nextPost));
  return existing;
}

function formatBlogDataModule(posts) {
  return `export const BLOG_POSTS = ${JSON.stringify(posts, null, 2)};\n`;
}

function parseBlogPostsModule(base64Content) {
  const source = decodeBase64Utf8(base64Content);
  const prefix = "export const BLOG_POSTS = ";
  const start = source.indexOf(prefix);

  if (start === -1) {
    throw new Error("Não foi possível localizar BLOG_POSTS em blog-data.js.");
  }

  const arraySource = source.slice(start + prefix.length).trim().replace(/;\s*$/, "");
  try {
    const parsed = Function(`"use strict"; return (${arraySource});`)();
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("Não foi possível interpretar o conteúdo atual de blog-data.js no GitHub.");
  }
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64Utf8(value) {
  const normalized = String(value || "").replace(/\n/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeVideoValue(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  const iframeSrcMatch = input.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch?.[1]) {
    return iframeSrcMatch[1];
  }

  return input;
}
