import {
  BLOG_ADMIN_EMAIL,
  BLOG_ADMIN_PASSWORD,
  buildBlogPostPayload,
  estimateReadingTime,
  getAllBlogPosts,
  getBlogPostBySlug,
  getStoredHeroSlides,
  isBlogAdminAuthenticated,
  saveBlogPost,
  saveHeroSlides,
  setBlogAdminAuthenticated
} from "./blog-store.js";

const DEFAULT_PREVIEW_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric"
}).format(new Date());

const state = {
  editingSlug: "",
  draftCoverImage: "",
  currentPanel: "banners"
};

const elements = {
  blogAdminAuth: document.querySelector("#blog-admin-auth"),
  blogAdminEmail: document.querySelector("#blog-admin-email"),
  blogAdminPassword: document.querySelector("#blog-admin-password"),
  blogAdminLogin: document.querySelector("#blog-admin-login"),
  blogAdminForm: document.querySelector("#blog-admin-form"),
  blogAdminLogout: document.querySelector("#blog-admin-logout"),
  blogAdminFeedback: document.querySelector("#blog-admin-feedback"),
  blogCreateNew: document.querySelector("#blog-create-new"),
  blogCancelEdit: document.querySelector("#blog-cancel-edit"),
  blogPostsList: document.querySelector("#blog-posts-list"),
  blogEditingSlug: document.querySelector("#blog-editing-slug"),
  blogTitle: document.querySelector("#blog-title"),
  blogCategory: document.querySelector("#blog-category"),
  blogDate: document.querySelector("#blog-date"),
  blogReadingTime: document.querySelector("#blog-reading-time"),
  blogCoverLabel: document.querySelector("#blog-cover-label"),
  blogTags: document.querySelector("#blog-tags"),
  blogVideoUrl: document.querySelector("#blog-video-url"),
  blogCoverImage: document.querySelector("#blog-cover-image"),
  blogExcerpt: document.querySelector("#blog-excerpt"),
  blogIntro: document.querySelector("#blog-intro"),
  blogBody: document.querySelector("#blog-body"),
  blogFeaturedInput: document.querySelector("#blog-featured"),
  heroSlideInputs: [
    document.querySelector("#hero-slide-1"),
    document.querySelector("#hero-slide-2"),
    document.querySelector("#hero-slide-3")
  ],
  heroSlidesSave: document.querySelector("#hero-slides-save"),
  heroSlidesFeedback: document.querySelector("#hero-slides-feedback"),
  heroSlidesPreview: document.querySelector("#hero-slides-preview"),
  menuBanners: document.querySelector("#admin-menu-banners"),
  menuBlog: document.querySelector("#admin-menu-blog"),
  panelBanners: document.querySelector("#admin-panel-banners"),
  panelBlog: document.querySelector("#admin-panel-blog"),
  previewCategory: document.querySelector("#blog-preview-category"),
  previewTitle: document.querySelector("#blog-preview-title"),
  previewMeta: document.querySelector("#blog-preview-meta"),
  previewExcerpt: document.querySelector("#blog-preview-excerpt"),
  previewCover: document.querySelector("#blog-preview-cover"),
  previewIntro: document.querySelector("#blog-preview-intro"),
  previewBody: document.querySelector("#blog-preview-body"),
  previewTags: document.querySelector("#blog-preview-tags"),
  previewVideo: document.querySelector("#blog-preview-video"),
  previewVideoFrame: document.querySelector("#blog-preview-video-frame")
};

init();

function init() {
  bindEvents();
  syncAdminVisibility();
  renderHeroSlidesPreview();
}

function bindEvents() {
  elements.blogAdminLogin?.addEventListener("click", handleBlogAdminLogin);
  elements.blogAdminLogout?.addEventListener("click", handleBlogAdminLogout);
  elements.blogAdminForm?.addEventListener("submit", handleBlogPublish);
  elements.heroSlidesSave?.addEventListener("click", handleHeroSlidesSave);
  elements.blogBody?.addEventListener("input", syncReadingTimeEstimate);
  elements.blogTitle?.addEventListener("input", updateEditorPreview);
  elements.blogCategory?.addEventListener("input", updateEditorPreview);
  elements.blogDate?.addEventListener("input", updateEditorPreview);
  elements.blogCoverLabel?.addEventListener("input", updateEditorPreview);
  elements.blogTags?.addEventListener("input", updateEditorPreview);
  elements.blogVideoUrl?.addEventListener("input", updateEditorPreview);
  elements.blogExcerpt?.addEventListener("input", updateEditorPreview);
  elements.blogIntro?.addEventListener("input", updateEditorPreview);
  elements.blogBody?.addEventListener("input", updateEditorPreview);
  elements.blogFeaturedInput?.addEventListener("change", renderPostsList);
  elements.blogCoverImage?.addEventListener("change", handleCoverImagePreview);
  elements.blogCreateNew?.addEventListener("click", resetBlogEditor);
  elements.blogCancelEdit?.addEventListener("click", resetBlogEditor);
  elements.menuBanners?.addEventListener("click", () => switchAdminPanel("banners"));
  elements.menuBlog?.addEventListener("click", () => switchAdminPanel("blog"));
}

function syncAdminVisibility() {
  const isAuthenticated = isBlogAdminAuthenticated();
  elements.blogAdminAuth?.classList.toggle("hidden", isAuthenticated);
  elements.blogAdminForm?.classList.toggle("hidden", !isAuthenticated);

  if (isAuthenticated) {
    hydrateBlogDefaults();
    renderPostsList();
    updateEditorPreview();
    switchAdminPanel(state.currentPanel);
  }
}

function hydrateBlogDefaults() {
  if (elements.blogDate && !elements.blogDate.value) {
    elements.blogDate.value = new Date().toISOString().slice(0, 10);
  }
  syncReadingTimeEstimate();
}

function handleBlogAdminLogin() {
  const email = elements.blogAdminEmail?.value.trim().toLowerCase();
  const password = elements.blogAdminPassword?.value.trim();

  if (email !== BLOG_ADMIN_EMAIL || password !== BLOG_ADMIN_PASSWORD) {
    showBlogAdminFeedback("Email ou senha incorretos. Tente novamente.", true);
    return;
  }

  setBlogAdminAuthenticated(true);
  if (elements.blogAdminEmail) elements.blogAdminEmail.value = "";
  if (elements.blogAdminPassword) elements.blogAdminPassword.value = "";
  showBlogAdminFeedback("", false);
  syncAdminVisibility();
}

function handleBlogAdminLogout() {
  setBlogAdminAuthenticated(false);
  showBlogAdminFeedback("", false);
  syncAdminVisibility();
}

function switchAdminPanel(panel) {
  state.currentPanel = panel;

  const isBanners = panel === "banners";
  elements.menuBanners?.classList.toggle("is-active", isBanners);
  elements.menuBlog?.classList.toggle("is-active", !isBanners);
  elements.panelBanners?.classList.toggle("hidden", !isBanners);
  elements.panelBlog?.classList.toggle("hidden", isBanners);
}

function renderPostsList() {
  if (!elements.blogPostsList) {
    return;
  }

  const posts = getAllBlogPosts();
  elements.blogPostsList.innerHTML = "";

  if (!posts.length) {
    elements.blogPostsList.innerHTML =
      '<p class="blog-admin-posts__empty">Nenhum artigo publicado ainda neste navegador.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const item = document.createElement("article");
    item.className = "blog-admin-post";
    item.innerHTML = `
      <div class="blog-admin-post__meta">
        <p class="blog-card__eyebrow">${escapeHtml(post.category || "Editorial")}</p>
        <h4 class="blog-card__title">${escapeHtml(post.title)}</h4>
        <p class="blog-card__meta">${escapeHtml(formatAdminPostMeta(post))}</p>
      </div>
      <div class="blog-admin-post__actions">
        ${post.featured ? '<span class="blog-admin-post__badge">Destaque</span>' : ""}
        <button class="detail-button" type="button" data-edit-post="${escapeHtml(post.slug)}">Editar</button>
      </div>
    `;
    fragment.appendChild(item);
  });

  elements.blogPostsList.appendChild(fragment);

  elements.blogPostsList.querySelectorAll("[data-edit-post]").forEach((button) => {
    button.addEventListener("click", () => startEditingPost(button.getAttribute("data-edit-post") || ""));
  });
}

function startEditingPost(slug) {
  const post = getBlogPostBySlug(slug);
  if (!post) {
    showBlogAdminFeedback("Não foi possível abrir esse artigo para edição.", true);
    return;
  }

  state.editingSlug = post.slug;
  state.draftCoverImage = post.coverImage || "";
  if (elements.blogEditingSlug) elements.blogEditingSlug.value = post.slug;
  if (elements.blogTitle) elements.blogTitle.value = post.title || "";
  if (elements.blogCategory) elements.blogCategory.value = post.category || "";
  if (elements.blogDate) elements.blogDate.value = post.date || "";
  if (elements.blogReadingTime) elements.blogReadingTime.value = post.readingTime || "";
  if (elements.blogCoverLabel) elements.blogCoverLabel.value = post.coverLabel || "";
  if (elements.blogTags) elements.blogTags.value = Array.isArray(post.tags) ? post.tags.join(", ") : "";
  if (elements.blogVideoUrl) elements.blogVideoUrl.value = post.videoUrl || "";
  if (elements.blogExcerpt) elements.blogExcerpt.value = post.excerpt || "";
  if (elements.blogIntro) elements.blogIntro.value = post.intro || "";
  if (elements.blogBody) {
    elements.blogBody.value = (post.body || [])
      .flatMap((section) => section.paragraphs || [])
      .join("\n\n");
  }
  if (elements.blogFeaturedInput) elements.blogFeaturedInput.checked = Boolean(post.featured);
  if (elements.blogCoverImage) elements.blogCoverImage.value = "";
  elements.blogCancelEdit?.classList.remove("hidden");
  switchAdminPanel("blog");
  syncReadingTimeEstimate();
  updateEditorPreview();
  showBlogAdminFeedback(`Editando: ${post.title}`, false);
}

function resetBlogEditor() {
  state.editingSlug = "";
  state.draftCoverImage = "";
  elements.blogAdminForm?.reset();
  if (elements.blogEditingSlug) elements.blogEditingSlug.value = "";
  if (elements.blogDate) {
    elements.blogDate.value = new Date().toISOString().slice(0, 10);
  }
  elements.blogCancelEdit?.classList.add("hidden");
  syncReadingTimeEstimate();
  updateEditorPreview();
  showBlogAdminFeedback("", false);
}

async function handleBlogPublish(event) {
  event.preventDefault();

  try {
    const selectedCoverImage = await readSelectedImage(elements.blogCoverImage);
    if (selectedCoverImage) {
      state.draftCoverImage = selectedCoverImage;
    }

    const post = buildBlogPostPayload({
      existingSlug: state.editingSlug,
      title: elements.blogTitle?.value,
      category: elements.blogCategory?.value,
      date: elements.blogDate?.value,
      readingTime: elements.blogReadingTime?.value,
      coverLabel: elements.blogCoverLabel?.value,
      tags: elements.blogTags?.value,
      videoUrl: elements.blogVideoUrl?.value,
      coverImage: state.draftCoverImage,
      excerpt: elements.blogExcerpt?.value,
      intro: elements.blogIntro?.value,
      body: elements.blogBody?.value,
      featured: elements.blogFeaturedInput?.checked
    });

    if (!post.title || !post.excerpt || !post.intro || !post.body[0]?.paragraphs?.length) {
      showBlogAdminFeedback("Preencha título, resumo, introdução e texto do artigo.", true);
      return;
    }

    saveBlogPost(post);
    renderPostsList();
    showBlogAdminFeedback(
      state.editingSlug ? "Artigo atualizado com sucesso neste navegador." : "Artigo publicado neste navegador com sucesso.",
      false
    );
    state.editingSlug = post.slug;
    if (elements.blogEditingSlug) elements.blogEditingSlug.value = post.slug;
    elements.blogCancelEdit?.classList.remove("hidden");
    updateEditorPreview();
  } catch (error) {
    console.error(error);
    showBlogAdminFeedback("Não foi possível salvar o artigo agora.", true);
  }
}

async function handleHeroSlidesSave() {
  try {
    const storedSlides = getStoredHeroSlides();
    const nextSlides = [];

    for (let index = 0; index < elements.heroSlideInputs.length; index += 1) {
      const imageData = await readSelectedImage(elements.heroSlideInputs[index]);
      nextSlides[index] = imageData || storedSlides[index] || "";
    }

    if (nextSlides.every((item) => !item)) {
      showHeroSlidesFeedback("Selecione ao menos uma imagem para atualizar o slideshow.", true);
      return;
    }

    saveHeroSlides(nextSlides);
    elements.heroSlideInputs.forEach((input) => {
      if (input) {
        input.value = "";
      }
    });
    renderHeroSlidesPreview();
    showHeroSlidesFeedback("Slideshow salvo neste navegador com sucesso.", false);
  } catch (error) {
    console.error(error);
    showHeroSlidesFeedback("Não foi possível atualizar o slideshow agora.", true);
  }
}

function renderHeroSlidesPreview() {
  if (!elements.heroSlidesPreview) {
    return;
  }

  const slides = getStoredHeroSlides();
  elements.heroSlidesPreview.innerHTML = "";

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 3; index += 1) {
    const item = document.createElement("article");
    item.className = "hero-slides-preview__item";
    const slide = slides[index];

    item.innerHTML = slide
      ? `<img src="${slide}" alt="Preview do slide ${index + 1}" />`
      : `<div class="hero-slides-preview__placeholder">Slide ${index + 1}</div>`;

    fragment.appendChild(item);
  }

  elements.heroSlidesPreview.appendChild(fragment);
}

async function handleCoverImagePreview() {
  try {
    const selectedCoverImage = await readSelectedImage(elements.blogCoverImage);
    if (selectedCoverImage) {
      state.draftCoverImage = selectedCoverImage;
      updateEditorPreview();
    }
  } catch (error) {
    console.error(error);
  }
}

function updateEditorPreview() {
  const title = elements.blogTitle?.value.trim() || "Título do artigo";
  const category = elements.blogCategory?.value.trim() || "Editorial";
  const excerpt = elements.blogExcerpt?.value.trim() || "O resumo aparecerá aqui conforme você preencher o artigo.";
  const intro = elements.blogIntro?.value.trim() || "A introdução aparecerá aqui.";
  const coverLabel = elements.blogCoverLabel?.value.trim() || category;
  const bodyText = elements.blogBody?.value.trim() || "";
  const tags = String(elements.blogTags?.value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const videoUrl = elements.blogVideoUrl?.value.trim() || "";

  syncReadingTimeEstimate();

  if (elements.previewCategory) elements.previewCategory.textContent = category;
  if (elements.previewTitle) elements.previewTitle.textContent = title;
  if (elements.previewExcerpt) elements.previewExcerpt.textContent = excerpt;
  if (elements.previewIntro) elements.previewIntro.textContent = intro;
  if (elements.previewMeta) {
    const dateValue = elements.blogDate?.value
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        }).format(new Date(`${elements.blogDate.value}T12:00:00`))
      : DEFAULT_PREVIEW_DATE;
    elements.previewMeta.textContent = `${dateValue} • ${elements.blogReadingTime?.value || "1 min de leitura"}`;
  }

  renderPreviewCover(coverLabel);
  renderPreviewBody(bodyText);
  renderPreviewTags(tags);
  renderPreviewVideo(videoUrl);
}

function renderPreviewCover(coverLabel) {
  if (!elements.previewCover) {
    return;
  }

  if (state.draftCoverImage) {
    elements.previewCover.className = "blog-post-cover blog-post-cover--image";
    elements.previewCover.innerHTML = `<img src="${state.draftCoverImage}" alt="Prévia da capa do artigo" />`;
    return;
  }

  elements.previewCover.className = "blog-post-cover blog-post-cover--editorial";
  elements.previewCover.innerHTML = `<span>${escapeHtml(coverLabel)}</span>`;
}

function renderPreviewBody(text) {
  if (!elements.previewBody) {
    return;
  }

  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    elements.previewBody.innerHTML = '<p class="blog-post-section__text">O corpo do artigo aparecerá aqui.</p>';
    return;
  }

  elements.previewBody.innerHTML = paragraphs
    .map((paragraph) => `<p class="blog-post-section__text">${escapeHtml(paragraph)}</p>`)
    .join("");
}

function renderPreviewTags(tags) {
  if (!elements.previewTags) {
    return;
  }

  elements.previewTags.innerHTML = "";
  if (!tags.length) {
    return;
  }

  const fragment = document.createDocumentFragment();
  tags.forEach((tag) => {
    const item = document.createElement("span");
    item.className = "blog-post-tag";
    item.textContent = tag;
    fragment.appendChild(item);
  });
  elements.previewTags.appendChild(fragment);
}

function renderPreviewVideo(videoUrl) {
  if (!elements.previewVideo || !elements.previewVideoFrame) {
    return;
  }

  if (!videoUrl) {
    elements.previewVideo.classList.add("hidden");
    elements.previewVideoFrame.src = "";
    return;
  }

  elements.previewVideo.classList.remove("hidden");
  elements.previewVideoFrame.src = getEmbedVideoUrl(videoUrl);
}

function syncReadingTimeEstimate() {
  if (!elements.blogReadingTime || !elements.blogBody) {
    return;
  }

  elements.blogReadingTime.value = estimateReadingTime(elements.blogBody.value);
}

function showBlogAdminFeedback(message, isError) {
  if (!elements.blogAdminFeedback) {
    return;
  }

  elements.blogAdminFeedback.textContent = message;
  elements.blogAdminFeedback.classList.toggle("hidden", !message);
  elements.blogAdminFeedback.classList.toggle("blog-admin-feedback--error", Boolean(isError));
}

function showHeroSlidesFeedback(message, isError) {
  if (!elements.heroSlidesFeedback) {
    return;
  }

  elements.heroSlidesFeedback.textContent = message;
  elements.heroSlidesFeedback.classList.toggle("hidden", !message);
  elements.heroSlidesFeedback.classList.toggle("blog-admin-feedback--error", Boolean(isError));
}

function readSelectedImage(input) {
  const file = input?.files?.[0];
  if (!file) {
    return Promise.resolve("");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

function formatAdminPostMeta(post) {
  const formattedDate = post.date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(`${post.date}T12:00:00`))
    : "Sem data";

  return `${formattedDate} • ${post.readingTime || "1 min de leitura"}`;
}

function getEmbedVideoUrl(url) {
  const youtubeMatch =
    url.match(/youtube\.com\/watch\?v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?&]+)/) ||
    url.match(/youtube\.com\/embed\/([^?&]+)/);

  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  return url;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
