import { getAllBlogPosts, getPostComments, savePostComment } from "./blog-store.js";

const elements = {
  title: document.querySelector("#blog-post-title"),
  category: document.querySelector("#blog-post-category"),
  meta: document.querySelector("#blog-post-meta"),
  excerpt: document.querySelector("#blog-post-excerpt"),
  cover: document.querySelector("#blog-post-cover"),
  content: document.querySelector("#blog-post-content"),
  share: document.querySelector("#blog-post-share"),
  commentsList: document.querySelector("#blog-comments-list"),
  commentForm: document.querySelector("#blog-comment-form"),
  commentName: document.querySelector("#blog-comment-name"),
  commentText: document.querySelector("#blog-comment-text"),
  commentFeedback: document.querySelector("#blog-comment-feedback"),
  loadingState: document.querySelector("#loading-state"),
  errorState: document.querySelector("#error-state"),
  detailState: document.querySelector("#detail-state"),
  backLinks: [...document.querySelectorAll("[data-blog-back]")]
};

init();

function init() {
  const slug = getCurrentBlogSlug();
  const posts = getAllBlogPosts();
  const post = posts.find((entry) => entry.slug === slug);

  if (!slug || !post) {
    elements.loadingState.classList.add("hidden");
    elements.errorState.classList.remove("hidden");
    return;
  }

  renderPost(post);
}

function renderPost(post) {
  document.title = `${post.title} | Blog | Darkestante`;
  elements.title.textContent = post.title;
  elements.category.textContent = post.category;
  elements.meta.textContent = formatMeta(post);
  elements.excerpt.textContent = post.excerpt;
  renderCover(post);

  const fragment = document.createDocumentFragment();

  if (Array.isArray(post.tags) && post.tags.length > 0) {
    const tagsWrap = document.createElement("div");
    tagsWrap.className = "blog-post-tags";
    post.tags.forEach((tag) => {
      const tagItem = document.createElement("span");
      tagItem.className = "blog-post-tag";
      tagItem.textContent = tag;
      tagsWrap.appendChild(tagItem);
    });
    fragment.appendChild(tagsWrap);
  }

  if (post.intro) {
    fragment.appendChild(renderTextSection("", post.intro));
  }

  if (Array.isArray(post.galleryImages) && post.galleryImages.length > 0) {
    fragment.appendChild(renderGallerySection(post.galleryImages, post.title));
  }

  if (post.videoUrl) {
    const videoWrap = document.createElement("section");
    videoWrap.className = "blog-post-video";
    videoWrap.innerHTML = `
      <h2 class="blog-post-section__title">Vídeo relacionado</h2>
      <div class="blog-post-video__frame">
        <iframe src="${getEmbedVideoUrl(post.videoUrl)}" title="Vídeo do artigo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>
    `;
    fragment.appendChild(videoWrap);
  }

  post.body.forEach((section) => {
    const textSection = renderTextSection(
      section.heading || "",
      Array.isArray(section.paragraphs) ? section.paragraphs.join("\n\n") : ""
    );
    if (textSection) {
      fragment.appendChild(textSection);
    }
  });

  elements.content.innerHTML = "";
  elements.content.appendChild(fragment);
  renderShareButtons(post);
  renderComments(post.slug);
  bindCommentForm(post.slug);

  elements.backLinks.forEach((link) => {
    link.href = getBlogIndexUrl();
  });

  elements.loadingState.classList.add("hidden");
  elements.detailState.classList.remove("hidden");
}

function getCurrentBlogSlug() {
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("slug") || params.get("post");
  if (querySlug) {
    return querySlug;
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const blogIndex = segments.lastIndexOf("blog");
  if (blogIndex >= 0 && segments[blogIndex + 1]) {
    return decodeURIComponent(segments[blogIndex + 1]);
  }

  return "";
}

function getBlogIndexUrl() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const blogIndex = segments.lastIndexOf("blog");
  if (blogIndex >= 0 && segments[blogIndex + 1]) {
    return "/blog/";
  }

  return "/blog/";
}

function renderShareButtons(post) {
  if (!elements.share) {
    return;
  }

  const shareUrl = new URL(`/blog/${post.slug}/`, window.location.origin);
  const encodedUrl = encodeURIComponent(shareUrl.href);
  const encodedTitle = encodeURIComponent(post.title);

  elements.share.innerHTML = `
    <a class="detail-button" href="https://wa.me/?text=${encodedTitle}%20${encodedUrl}" target="_blank" rel="noreferrer">WhatsApp</a>
    <a class="detail-button" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noreferrer">Facebook</a>
    <a class="detail-button" href="https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}" target="_blank" rel="noreferrer">X</a>
    <a class="detail-button" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noreferrer">LinkedIn</a>
  `;
}

function renderComments(slug) {
  if (!elements.commentsList) {
    return;
  }

  const comments = getPostComments(slug);
  elements.commentsList.innerHTML = "";

  if (!comments.length) {
    elements.commentsList.innerHTML = `<p class="blog-comments__empty">Ainda não há comentários neste artigo.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  comments.forEach((comment) => {
    const item = document.createElement("article");
    item.className = "blog-comment";
    item.innerHTML = `
      <h3 class="blog-comment__name">${comment.name}</h3>
      <p class="blog-comment__meta">${comment.date}</p>
      <p class="blog-comment__text">${comment.text}</p>
    `;
    fragment.appendChild(item);
  });

  elements.commentsList.appendChild(fragment);
}

function bindCommentForm(slug) {
  if (!elements.commentForm) {
    return;
  }

  elements.commentForm.onsubmit = (event) => {
    event.preventDefault();

    const name = elements.commentName?.value.trim();
    const text = elements.commentText?.value.trim();

    if (!name || !text) {
      showCommentFeedback("Preencha nome, sobrenome e comentário.", true);
      return;
    }

    savePostComment(slug, {
      name,
      text,
      date: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date())
    });

    elements.commentForm.reset();
    showCommentFeedback("Comentário salvo neste navegador.", false);
    renderComments(slug);
  };
}

function showCommentFeedback(message, isError) {
  if (!elements.commentFeedback) {
    return;
  }

  elements.commentFeedback.textContent = message;
  elements.commentFeedback.classList.toggle("hidden", !message);
  elements.commentFeedback.classList.toggle("blog-admin-feedback--error", Boolean(isError));
}

function renderCover(post) {
  if (!elements.cover) {
    return;
  }

  if (post.coverImage) {
    elements.cover.className = "blog-post-cover blog-post-cover--image";
    elements.cover.innerHTML = `<img src="${post.coverImage}" alt="${post.title}" />`;
    return;
  }

  elements.cover.className = `blog-post-cover blog-post-cover--${post.coverTone || "editorial"}`;
  elements.cover.innerHTML = `<span>${post.coverLabel || post.category}</span>`;
}

function renderTextSection(title, text) {
  const paragraphs = String(text || "")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return null;
  }

  const articleSection = document.createElement("section");
  articleSection.className = "blog-post-section";

  if (title) {
    const heading = document.createElement("h2");
    heading.className = "blog-post-section__title";
    heading.textContent = title;
    articleSection.appendChild(heading);
  }

  const bodyStack = document.createElement("div");
  bodyStack.className = "blog-copy-stack";

  paragraphs.forEach((textValue) => {
    const paragraph = document.createElement("p");
    paragraph.className = "blog-post-section__text";
    paragraph.textContent = textValue;
    bodyStack.appendChild(paragraph);
  });

  articleSection.appendChild(bodyStack);
  return articleSection;
}

function renderGallerySection(images, title) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  if (!safeImages.length) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "blog-post-gallery";

  const heading = document.createElement("h2");
  heading.className = "blog-post-section__title";
  heading.textContent = "Galeria de fotos";
  section.appendChild(heading);

  const stage = document.createElement("div");
  stage.className = "blog-post-gallery__stage";

  const stageImage = document.createElement("img");
  stageImage.className = "blog-post-gallery__image";
  stageImage.src = safeImages[0];
  stageImage.alt = `${title} — foto 1`;
  stage.appendChild(stageImage);

  if (safeImages.length > 1) {
    const controls = document.createElement("div");
    controls.className = "blog-post-gallery__controls";
    controls.innerHTML = `
      <button class="blog-post-gallery__button" type="button" aria-label="Foto anterior">‹</button>
      <button class="blog-post-gallery__button" type="button" aria-label="Próxima foto">›</button>
    `;
    stage.appendChild(controls);
  }

  section.appendChild(stage);

  const thumbs = document.createElement("div");
  thumbs.className = "blog-post-gallery__thumbs";
  section.appendChild(thumbs);

  let currentIndex = 0;

  function updateGallery(index) {
    currentIndex = index;
    stageImage.src = safeImages[index];
    stageImage.alt = `${title} — foto ${index + 1}`;
    thumbs.querySelectorAll(".blog-post-gallery__thumb").forEach((thumb, thumbIndex) => {
      thumb.classList.toggle("is-active", thumbIndex === index);
    });
  }

  safeImages.forEach((image, index) => {
    const thumb = document.createElement("button");
    thumb.className = `blog-post-gallery__thumb${index === 0 ? " is-active" : ""}`;
    thumb.type = "button";
    thumb.setAttribute("aria-label", `Abrir foto ${index + 1}`);
    thumb.innerHTML = `<img src="${image}" alt="" />`;
    thumb.addEventListener("click", () => updateGallery(index));
    thumbs.appendChild(thumb);
  });

  const [prevButton, nextButton] = section.querySelectorAll(".blog-post-gallery__button");
  prevButton?.addEventListener("click", () => {
    updateGallery((currentIndex - 1 + safeImages.length) % safeImages.length);
  });
  nextButton?.addEventListener("click", () => {
    updateGallery((currentIndex + 1) % safeImages.length);
  });

  return section;
}

function formatMeta(post) {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${post.date}T12:00:00`));

  return `${formattedDate} • ${post.readingTime}`;
}

function getEmbedVideoUrl(url) {
  const iframeSrcMatch = String(url || "").match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch?.[1]) {
    return iframeSrcMatch[1];
  }

  const youtubeMatch =
    url.match(/youtube\.com\/watch\?v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?&]+)/) ||
    url.match(/youtube\.com\/embed\/([^?&]+)/);

  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  return url;
}
