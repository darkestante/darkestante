import {
  BLOG_ADMIN_EMAIL,
  BLOG_ADMIN_PASSWORD,
  buildBlogPostPayload,
  clearGitHubPublishToken,
  deleteBlogPost,
  deleteBlogPostFromGitHub,
  estimateReadingTime,
  getAllBlogPosts,
  getBlogPostBySlug,
  getGitHubPublishToken,
  getStoredHeroSlides,
  isBlogAdminAuthenticated,
  publishBlogPostToGitHub,
  saveBlogPost,
  saveHeroSlides,
  setGitHubPublishToken,
  setBlogAdminAuthenticated
} from "./blog-store.js";
import { syncSiteAuthUi } from "./auth-ui.js";

const DEFAULT_PREVIEW_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric"
}).format(new Date());

const state = {
  editingSlug: "",
  draftCoverImage: "",
  draftGalleryImages: [],
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
  blogPublishLive: document.querySelector("#blog-publish-live"),
  blogPostsList: document.querySelector("#blog-posts-list"),
  blogPostSearch: document.querySelector("#blog-post-search"),
  blogEditingSlug: document.querySelector("#blog-editing-slug"),
  blogTitle: document.querySelector("#blog-title"),
  blogCategory: document.querySelector("#blog-category"),
  blogDate: document.querySelector("#blog-date"),
  blogAuthor: document.querySelector("#blog-author"),
  blogReadingTime: document.querySelector("#blog-reading-time"),
  blogCoverLabel: document.querySelector("#blog-cover-label"),
  blogTags: document.querySelector("#blog-tags"),
  blogVideoUrl: document.querySelector("#blog-video-url"),
  blogCoverImage: document.querySelector("#blog-cover-image"),
  blogGalleryImages: document.querySelector("#blog-gallery-images"),
  blogExcerpt: document.querySelector("#blog-excerpt"),
  blogIntro: document.querySelector("#blog-intro"),
  blogBody: document.querySelector("#blog-body"),
  blogFeaturedInput: document.querySelector("#blog-featured"),
  blogGitHubToken: document.querySelector("#blog-github-token"),
  blogGitHubSaveToken: document.querySelector("#blog-github-save-token"),
  blogGitHubClearToken: document.querySelector("#blog-github-clear-token"),
  blogGitHubStatus: document.querySelector("#blog-github-status"),
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
  previewAuthor: document.querySelector("#blog-preview-author"),
  previewExcerpt: document.querySelector("#blog-preview-excerpt"),
  previewCover: document.querySelector("#blog-preview-cover"),
  previewGallery: document.querySelector("#blog-preview-gallery"),
  previewIntro: document.querySelector("#blog-preview-intro"),
  previewBody: document.querySelector("#blog-preview-body"),
  previewTags: document.querySelector("#blog-preview-tags"),
  previewVideo: document.querySelector("#blog-preview-video"),
  previewVideoFrame: document.querySelector("#blog-preview-video-frame")
};

init();

function init() {
  syncSiteAuthUi();
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
  elements.blogAuthor?.addEventListener("input", updateEditorPreview);
  elements.blogCoverLabel?.addEventListener("input", updateEditorPreview);
  elements.blogTags?.addEventListener("input", updateEditorPreview);
  elements.blogVideoUrl?.addEventListener("input", updateEditorPreview);
  elements.blogExcerpt?.addEventListener("input", updateEditorPreview);
  elements.blogIntro?.addEventListener("input", updateEditorPreview);
  elements.blogBody?.addEventListener("input", updateEditorPreview);
  elements.blogFeaturedInput?.addEventListener("change", renderPostsList);
  elements.blogPostSearch?.addEventListener("input", renderPostsList);
  elements.blogCoverImage?.addEventListener("change", handleCoverImagePreview);
  elements.blogGalleryImages?.addEventListener("change", handleGalleryImagesPreview);
  elements.blogCreateNew?.addEventListener("click", resetBlogEditor);
  elements.blogCancelEdit?.addEventListener("click", resetBlogEditor);
  elements.blogPublishLive?.addEventListener("click", handleLivePublish);
  elements.blogGitHubSaveToken?.addEventListener("click", handleSaveGitHubToken);
  elements.blogGitHubClearToken?.addEventListener("click", handleClearGitHubToken);
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
    syncGitHubTokenState();
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

  const query = normalizeSearch(elements.blogPostSearch?.value || "");
  const allPosts = getAllBlogPosts();
  const posts = query
    ? allPosts.filter((post) => normalizeSearch(getPostSearchText(post)).includes(query))
    : allPosts;
  elements.blogPostsList.innerHTML = "";

  if (!posts.length) {
    elements.blogPostsList.innerHTML = query
      ? '<p class="blog-admin-posts__empty">Nenhum artigo encontrado para essa busca.</p>'
      : '<p class="blog-admin-posts__empty">Nenhum artigo publicado ainda.</p>';
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
        <button class="detail-button detail-button--danger" type="button" data-delete-post="${escapeHtml(post.slug)}">Excluir</button>
      </div>
    `;
    fragment.appendChild(item);
  });

  elements.blogPostsList.appendChild(fragment);

  elements.blogPostsList.querySelectorAll("[data-edit-post]").forEach((button) => {
    button.addEventListener("click", () => startEditingPost(button.getAttribute("data-edit-post") || ""));
  });

  elements.blogPostsList.querySelectorAll("[data-delete-post]").forEach((button) => {
    button.addEventListener("click", () => handleDeletePost(button.getAttribute("data-delete-post") || ""));
  });
}

function getPostSearchText(post) {
  const tags = Array.isArray(post.tags) ? post.tags.join(" ") : "";
  const body = Array.isArray(post.body)
    ? post.body
        .flatMap((section) => [section.heading, ...(section.paragraphs || [])])
        .join(" ")
    : "";

  return [
    post.title,
    post.category,
    post.author,
    post.excerpt,
    post.intro,
    post.slug,
    tags,
    body
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function startEditingPost(slug) {
  const post = getBlogPostBySlug(slug);
  if (!post) {
    showBlogAdminFeedback("Não foi possível abrir esse artigo para edição.", true);
    return;
  }

  state.editingSlug = post.slug;
  state.draftCoverImage = post.coverImage || "";
  state.draftGalleryImages = Array.isArray(post.galleryImages) ? [...post.galleryImages] : [];
  if (elements.blogEditingSlug) elements.blogEditingSlug.value = post.slug;
  if (elements.blogTitle) elements.blogTitle.value = post.title || "";
  if (elements.blogCategory) elements.blogCategory.value = post.category || "";
  if (elements.blogDate) elements.blogDate.value = post.date || "";
  if (elements.blogAuthor) elements.blogAuthor.value = post.author || "";
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
  if (elements.blogGalleryImages) elements.blogGalleryImages.value = "";
  elements.blogCancelEdit?.classList.remove("hidden");
  switchAdminPanel("blog");
  syncReadingTimeEstimate();
  updateEditorPreview();
  showBlogAdminFeedback(`Editando: ${post.title}`, false);
}

function resetBlogEditor() {
  state.editingSlug = "";
  state.draftCoverImage = "";
  state.draftGalleryImages = [];
  elements.blogAdminForm?.reset();
  if (elements.blogEditingSlug) elements.blogEditingSlug.value = "";
  if (elements.blogDate) {
    elements.blogDate.value = new Date().toISOString().slice(0, 10);
  }
  if (elements.blogGalleryImages) {
    elements.blogGalleryImages.value = "";
  }
  elements.blogCancelEdit?.classList.add("hidden");
  syncReadingTimeEstimate();
  updateEditorPreview();
  showBlogAdminFeedback("", false);
}

async function handleBlogPublish(event) {
  event.preventDefault();

  try {
    const post = await buildCurrentPostFromForm();

    saveBlogPost(post);
    renderPostsList();
    showBlogAdminFeedback(
      state.editingSlug
        ? "Rascunho atualizado com sucesso neste navegador."
        : "Rascunho salvo com sucesso neste navegador.",
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

async function handleDeletePost(slug) {
  const post = getBlogPostBySlug(slug);
  if (!post) {
    showBlogAdminFeedback("Não foi possível localizar esse artigo para exclusão.", true);
    return;
  }

  const confirmed = window.confirm(`Deseja excluir o artigo "${post.title}"?`);
  if (!confirmed) {
    return;
  }

  try {
    const token = getGitHubPublishToken();

    if (token) {
      await deleteBlogPostFromGitHub(slug);
    }

    deleteBlogPost(slug);

    if (state.editingSlug === slug) {
      resetBlogEditor();
    }

    renderPostsList();
    updateEditorPreview();
    showBlogAdminFeedback(
      token
        ? "Artigo removido da lista local e do blog público com sucesso."
        : "Artigo removido apenas deste navegador. Para excluir do site também, salve um token do GitHub.",
      false
    );
  } catch (error) {
    console.error(error);
    showBlogAdminFeedback(
      error instanceof Error ? error.message : "Não foi possível excluir o artigo agora.",
      true
    );
  }
}

async function handleLivePublish() {
  try {
    const token = getGitHubPublishToken();
    if (!token) {
      showGitHubStatus("Salve um token do GitHub neste navegador antes de publicar no site.", true);
      return;
    }

    const post = await buildCurrentPostFromForm();
    saveBlogPost(post);
    await publishBlogPostToGitHub(post);

    state.editingSlug = post.slug;
    if (elements.blogEditingSlug) elements.blogEditingSlug.value = post.slug;
    elements.blogCancelEdit?.classList.remove("hidden");
    renderPostsList();
    updateEditorPreview();
    showBlogAdminFeedback("Rascunho local salvo com sucesso.", false);
    showGitHubStatus(
      "Artigo enviado ao GitHub com sucesso. A Netlify vai atualizar o blog público automaticamente.",
      false
    );
  } catch (error) {
    console.error(error);
    showGitHubStatus(error instanceof Error ? error.message : "Não foi possível publicar o artigo no site.", true);
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

async function buildCurrentPostFromForm() {
  const selectedCoverImage = await readSelectedImage(elements.blogCoverImage);
  const selectedGalleryImages = await readSelectedImages(elements.blogGalleryImages);

  if (selectedCoverImage) {
    state.draftCoverImage = selectedCoverImage;
  }
  if (selectedGalleryImages.length) {
    state.draftGalleryImages = selectedGalleryImages;
  }

  const post = buildBlogPostPayload({
    existingSlug: state.editingSlug,
    title: elements.blogTitle?.value,
    category: elements.blogCategory?.value,
    date: elements.blogDate?.value,
    author: elements.blogAuthor?.value,
    readingTime: elements.blogReadingTime?.value,
    coverLabel: elements.blogCoverLabel?.value,
    tags: elements.blogTags?.value,
    videoUrl: elements.blogVideoUrl?.value,
    coverImage: state.draftCoverImage,
    galleryImages: state.draftGalleryImages,
    excerpt: elements.blogExcerpt?.value,
    intro: elements.blogIntro?.value,
    body: elements.blogBody?.value,
    featured: elements.blogFeaturedInput?.checked
  });

  if (!post.title || !post.excerpt || !post.intro || !post.body[0]?.paragraphs?.length) {
    throw new Error("Preencha título, resumo, introdução e texto do artigo.");
  }

  return post;
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

async function handleGalleryImagesPreview() {
  try {
    const selectedGalleryImages = await readSelectedImages(elements.blogGalleryImages);
    if (selectedGalleryImages.length) {
      state.draftGalleryImages = selectedGalleryImages;
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
  const author = elements.blogAuthor?.value.trim() || "";
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
  if (elements.previewAuthor) {
    elements.previewAuthor.textContent = author ? `Por ${author}` : "";
    elements.previewAuthor.classList.toggle("hidden", !author);
  }

  renderPreviewCover(coverLabel);
  renderPreviewParagraphs(elements.previewIntro, intro, "A introdução aparecerá aqui.");
  renderPreviewBody(bodyText);
  renderPreviewGallery(state.draftGalleryImages);
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
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  renderPreviewParagraphs(
    elements.previewBody,
    paragraphs.join("\n\n"),
    "O corpo do artigo aparecerá aqui."
  );
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

function renderPreviewGallery(images) {
  if (!elements.previewGallery) {
    return;
  }

  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  if (!safeImages.length) {
    elements.previewGallery.classList.add("hidden");
    elements.previewGallery.innerHTML = "";
    return;
  }

  elements.previewGallery.classList.remove("hidden");
  elements.previewGallery.innerHTML = `
    <div class="blog-preview-gallery__stage">
      <img src="${safeImages[0]}" alt="Prévia da galeria do artigo" />
    </div>
    <div class="blog-preview-gallery__thumbs">
      ${safeImages
        .map(
          (image, index) =>
            `<img class="blog-preview-gallery__thumb${index === 0 ? " is-active" : ""}" src="${image}" alt="Miniatura ${index + 1}" />`
        )
        .join("")}
    </div>
  `;
}

function renderPreviewParagraphs(container, text, emptyMessage) {
  if (!container) {
    return;
  }

  const paragraphs = String(text || "")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    container.innerHTML = `<p class="blog-post-section__text">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  container.innerHTML = paragraphs
    .map((paragraph) => `<p class="blog-post-section__text">${escapeHtml(paragraph)}</p>`)
    .join("");
}

function syncReadingTimeEstimate() {
  if (!elements.blogReadingTime || !elements.blogBody) {
    return;
  }

  elements.blogReadingTime.value = estimateReadingTime(elements.blogBody.value);
}

function handleSaveGitHubToken() {
  const token = elements.blogGitHubToken?.value.trim() || "";
  if (!token) {
    showGitHubStatus("Cole o token do GitHub antes de salvar neste navegador.", true);
    return;
  }

  setGitHubPublishToken(token);
  syncGitHubTokenState();
  showGitHubStatus("Token do GitHub salvo neste navegador com sucesso.", false);
}

function handleClearGitHubToken() {
  clearGitHubPublishToken();
  syncGitHubTokenState();
  showGitHubStatus("Token salvo removido deste navegador.", false);
}

function syncGitHubTokenState() {
  const token = getGitHubPublishToken();
  if (elements.blogGitHubToken) {
    elements.blogGitHubToken.value = token;
  }
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

function showGitHubStatus(message, isError) {
  if (!elements.blogGitHubStatus) {
    return;
  }

  elements.blogGitHubStatus.textContent = message;
  elements.blogGitHubStatus.classList.toggle("hidden", !message);
  elements.blogGitHubStatus.classList.toggle("blog-admin-feedback--error", Boolean(isError));
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

function readSelectedImages(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) {
    return Promise.resolve([]);
  }

  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => reject(new Error("Falha ao ler uma das imagens da galeria"));
          reader.readAsDataURL(file);
        })
    )
  );
}

function formatAdminPostMeta(post) {
  const formattedDate = post.date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(`${post.date}T12:00:00`))
    : "Sem data";

  const details = [formattedDate, post.readingTime || "1 min de leitura"];
  if (post.author) {
    details.push(`Por ${post.author}`);
  }
  return details.join(" • ");
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
