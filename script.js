import { FALLBACK_AUTHOR, FALLBACK_COVER, fetchBooks, normalizeText } from "./data.js";
import { getAllBlogPosts, getStoredHeroSlides } from "./blog-store.js";
import { syncSiteAuthUi } from "./auth-ui.js";

const elements = {
  booksGrid: document.querySelector("#books-grid"),
  pagination: document.querySelector("#pagination"),
  loadingState: document.querySelector("#loading-state"),
  errorState: document.querySelector("#error-state"),
  emptyState: document.querySelector("#empty-state"),
  searchInput: document.querySelector("#search-input"),
  monthFilter: document.querySelector("#month-filter"),
  yearFilter: document.querySelector("#year-filter"),
  template: document.querySelector("#book-card-template"),
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  projectTabButtons: [...document.querySelectorAll(".project-tab-button")],
  projectPanels: [...document.querySelectorAll(".project-panel")],
  reviewsFeaturedIframe: document.querySelector("#reviews-featured-iframe"),
  reviewsFeaturedTitle: document.querySelector("#reviews-featured-title"),
  reviewsFeaturedKicker: document.querySelector("#reviews-featured-kicker"),
  reviewsFeaturedDescription: document.querySelector("#reviews-featured-description"),
  reviewsFeaturedLink: document.querySelector("#reviews-featured-link"),
  reviewsGrid: document.querySelector("#reviews-grid"),
  reviewsFeaturedSection: document.querySelector(".reviews-featured"),
  heroSlider: document.querySelector("[data-slider]"),
  heroSlides: [...document.querySelectorAll("[data-slide]")],
  heroDots: [...document.querySelectorAll("[data-slide-dot]")],
  heroPrev: document.querySelector("[data-slide-prev]"),
  heroNext: document.querySelector("[data-slide-next]"),
  blogFeaturedShell: document.querySelector("#blog-featured-shell"),
  blogGrid: document.querySelector("#blog-grid")
};

let allBooks = [];
let currentPage = 1;
let currentHeroSlide = 0;
let heroInterval = null;
const BOOKS_PER_PAGE = 20;
const initialFilters = getInitialFilters();
const REVIEW_PLAYLIST_URL =
  "https://www.youtube.com/playlist?list=PLF6P2O-4jVaH_89Oh1dxPaSDoxmGX7c2k";
const REVIEW_VIDEOS = [
  {
    id: "1Hy-CH-9pJs",
    title: "A Sociedade de Preservação dos Kaiju ENTREGOU? Minha Opinião Real Oficial"
  },
  {
    id: "ZAGGPTa-Nng",
    title: "Pecatricce do autor Kadu Junqueira - Resenha do Livro da Hoffmann Littera"
  },
  {
    id: "OWgVRX69JQg",
    title: "Chiaroscuro do autor Lucas Kaliko - Resenha do Livro da Flyve"
  },
  {
    id: "ZCn8wm_vWm0",
    title: "O Parque Macabro – Resenha do Livro da Coleção Dark-Rewind Macabra Darkside"
  },
  {
    id: "PTLZsRC67Qs",
    title: "Bruxa de Areia – Resenha do Livro de Lucas Santana (com e sem spoilers): o livro é bom?"
  },
  {
    id: "Jt1h_UthTWQ",
    title: "Ed e Lorraine Warren Vidas Eternas Vol 3 – Resenha do Livro de Robert Curran (com e sem spoilers)"
  },
  {
    id: "qN8_mhSeKuM",
    title: "Amityville – Resenha do Livro darkside de Jay Anson (com e sem spoilers): o livro é bom?"
  },
  {
    id: "svXZwojlGJE",
    title: "Ed e Lorraine Warren – Demonologistas Vol. 1 de Gerald Brittle: Resenha do Livro: é bom?"
  },
  {
    id: "htBoLuyzi0w",
    title: "Resenha de Casamento Perfeito (com spoilers) da Darkside: autora Jeneva Rose. O livro é bom?"
  },
  {
    id: "pKv3JvFrqc4",
    title: "Resenha de Casamento Perfeito (sem spoilers) da Darkside: autora Jeneva Rose. O livro é bom?"
  },
  {
    id: "MmWq4AIUr0s",
    title: "Resenha de Objetos Sobrenaturais da Darkside: autora Stacey Graham. O livro é bom?"
  }
];

init();

async function init() {
  syncSiteAuthUi();
  bindEvents();
  applyStoredHeroSlides();
  initHeroSlider();
  renderReviews();
  renderBlog();
  activateInitialTab();

  const shouldLoadBooks =
    !document.body.dataset.pageTab || document.body.dataset.pageTab === "leituras";

  if (!elements.booksGrid || !shouldLoadBooks) {
    return;
  }

  try {
    allBooks = await fetchBooks();
    populateFilterOptions();
    syncInitialFilterControls();
    applyFilters();
  } catch (error) {
    console.error("Erro ao carregar a planilha:", error);
    elements.loadingState?.classList.add("hidden");
    elements.errorState?.classList.remove("hidden");
  }
}

function bindEvents() {
  elements.searchInput?.addEventListener("input", applyFilters);
  elements.monthFilter?.addEventListener("change", applyFilters);
  elements.yearFilter?.addEventListener("change", applyFilters);
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
  });
  elements.projectTabButtons.forEach((button) => {
    button.addEventListener("click", () => activateProjectTab(button.dataset.projectTarget));
  });
  elements.heroPrev?.addEventListener("click", () => {
    setHeroSlide(currentHeroSlide - 1);
    restartHeroSlider();
  });
  elements.heroNext?.addEventListener("click", () => {
    setHeroSlide(currentHeroSlide + 1);
    restartHeroSlider();
  });
  elements.heroDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      setHeroSlide(Number(dot.dataset.slideDot));
      restartHeroSlider();
    });
  });
  elements.heroSlider?.addEventListener("mouseenter", stopHeroSlider);
  elements.heroSlider?.addEventListener("mouseleave", startHeroSlider);
}

function activateTab(targetId) {
  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === targetId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.tabPanels.forEach((panel) => {
    const isActive = panel.id === targetId;
    panel.classList.toggle("is-active", isActive);
    panel.classList.toggle("hidden", !isActive);
  });
}

function activateProjectTab(targetId) {
  elements.projectTabButtons.forEach((button) => {
    const isActive = button.dataset.projectTarget === targetId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.projectPanels.forEach((panel) => {
    const isActive = panel.id === targetId;
    panel.classList.toggle("is-active", isActive);
    panel.classList.toggle("hidden", !isActive);
  });
}

function applyFilters() {
  if (!elements.searchInput || !elements.monthFilter || !elements.yearFilter || !elements.booksGrid) {
    return;
  }

  const searchTerm = normalizeText(elements.searchInput.value);
  const selectedMonth = elements.monthFilter.value;
  const selectedYear = elements.yearFilter.value;

  const filteredBooks = allBooks
    .filter((book) => {
    const matchesSearch =
      !searchTerm ||
      normalizeText(`${book.title} ${book.author} ${book.publisher}`).includes(searchTerm);

    const matchesStatus =
      book.statusKey === "lido";

    const matchesPublisher =
      !initialFilters.publisher ||
      normalizeText(book.publisher) === normalizeText(initialFilters.publisher);

    const matchesAuthor =
      !initialFilters.author ||
      normalizeText(book.author) === normalizeText(initialFilters.author);

    const matchesSize =
      !initialFilters.size || getBookSizeLabel(book.pageCount) === initialFilters.size;

    const matchesMonth =
      selectedMonth === "todos" || normalizeText(book.month) === normalizeText(selectedMonth);

    const matchesYear =
      selectedYear === "todos" || normalizeText(book.year) === normalizeText(selectedYear);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPublisher &&
        matchesAuthor &&
        matchesSize &&
        matchesMonth &&
        matchesYear
      );
    })
    .sort(compareBooksByRecency);

  currentPage = 1;
  renderBooksPage(filteredBooks);
}

function getInitialFilters() {
  const params = new URLSearchParams(window.location.search);
  const pageTab = document.body.dataset.pageTab;
  const pageProject = document.body.dataset.pageProject;
  return {
    search: params.get("search") || "",
    month: params.get("month") || "todos",
    year: params.get("year") || "todos",
    publisher: params.get("publisher") || "",
    author: params.get("author") || "",
    size: params.get("size") || "",
    tab: pageTab || params.get("tab") || "leituras",
    project: pageProject || params.get("project") || "torre-negra"
  };
}

function syncInitialFilterControls() {
  if (!elements.searchInput || !elements.monthFilter || !elements.yearFilter) {
    return;
  }

  if (initialFilters.search) {
    elements.searchInput.value = initialFilters.search;
  }

  if (initialFilters.month) {
    elements.monthFilter.value = hasSelectOption(elements.monthFilter, initialFilters.month)
      ? initialFilters.month
      : "todos";
  }

  if (initialFilters.year) {
    elements.yearFilter.value = hasSelectOption(elements.yearFilter, initialFilters.year)
      ? initialFilters.year
      : "todos";
  }
}

function activateInitialTab() {
  const initialTab = ["leituras", "resenhas", "blog", "tribo-da-caveira", "projetos"].includes(initialFilters.tab)
    ? initialFilters.tab
    : "leituras";
  activateTab(initialTab);

  if (initialTab === "projetos") {
    const initialProject =
      initialFilters.project === "terror-nacional" ? "terror-nacional" : "torre-negra";
    activateProjectTab(initialProject);
  }
}

function initHeroSlider() {
  if (!elements.heroSlider || elements.heroSlides.length <= 1) {
    return;
  }

  ensureHeroSlideImages();
  setHeroSlide(0);
  startHeroSlider();
}

function setHeroSlide(index) {
  if (elements.heroSlides.length === 0) {
    return;
  }

  currentHeroSlide = (index + elements.heroSlides.length) % elements.heroSlides.length;

  elements.heroSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === currentHeroSlide);
  });

  elements.heroDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === currentHeroSlide;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-selected", String(isActive));
  });

  syncHeroSliderRatio();
}

function ensureHeroSlideImages() {
  elements.heroSlides.forEach((slide, index) => {
    const source = getHeroSlideSource(slide);
    if (!source) {
      return;
    }

    let image = slide.querySelector(".hero-slide__image");
    if (!image) {
      image = document.createElement("img");
      image.className = "hero-slide__image";
      image.alt = `Banner Darkestante ${index + 1}`;
      image.decoding = "async";
      image.loading = index === 0 ? "eager" : "lazy";
      image.addEventListener("load", () => syncHeroSliderRatio(slide));
      slide.appendChild(image);
    }

    if (image.getAttribute("src") !== source) {
      image.src = source;
    }
  });
}

function getHeroSlideSource(slide) {
  const rawValue =
    slide.style.getPropertyValue("--hero-image") ||
    window.getComputedStyle(slide).getPropertyValue("--hero-image");
  const imageValue = rawValue.trim();
  const urlMatch = imageValue.match(/^url\((['"]?)(.*)\1\)$/);

  return urlMatch ? urlMatch[2] : imageValue;
}

function syncHeroSliderRatio(slide = elements.heroSlides[currentHeroSlide]) {
  const image = slide?.querySelector(".hero-slide__image");
  if (!elements.heroSlider || !image || !image.naturalWidth || !image.naturalHeight) {
    return;
  }

  elements.heroSlider.style.setProperty(
    "--hero-aspect-ratio",
    `${image.naturalWidth} / ${image.naturalHeight}`
  );
}

function startHeroSlider() {
  if (heroInterval || elements.heroSlides.length <= 1) {
    return;
  }

  heroInterval = window.setInterval(() => {
    setHeroSlide(currentHeroSlide + 1);
  }, 5600);
}

function stopHeroSlider() {
  if (!heroInterval) {
    return;
  }

  window.clearInterval(heroInterval);
  heroInterval = null;
}

function restartHeroSlider() {
  stopHeroSlider();
  startHeroSlider();
}

function renderReviews() {
  if (!elements.reviewsGrid || !elements.reviewsFeaturedIframe || REVIEW_VIDEOS.length === 0) {
    return;
  }

  setFeaturedReview(REVIEW_VIDEOS[0].id, false);
  const fragment = document.createDocumentFragment();

  REVIEW_VIDEOS.forEach((review, index) => {
    const card = document.createElement("article");
    card.className = "review-card";
    card.dataset.reviewId = review.id;

    const thumbnailButton = document.createElement("button");
    thumbnailButton.type = "button";
    thumbnailButton.className = "review-card__thumbnail";
    thumbnailButton.setAttribute("aria-label", `Abrir resenha ${review.title}`);

    const thumbnail = document.createElement("img");
    thumbnail.src = `https://i.ytimg.com/vi/${review.id}/hqdefault.jpg`;
    thumbnail.alt = `Capa do vídeo ${review.title}`;
    thumbnail.loading = "lazy";
    thumbnailButton.appendChild(thumbnail);

    const body = document.createElement("div");
    body.className = "review-card__body";

    const kicker = document.createElement("p");
    kicker.className = "review-card__kicker";
    kicker.textContent = index === 0 ? "Mais recente" : `Arquivo ${index + 1}`;

    const title = document.createElement("h4");
    title.className = "review-card__title";
    title.textContent = review.title;

    const description = document.createElement("p");
    description.className = "review-card__description";
    description.textContent = getReviewDescription(review.title);

    const actions = document.createElement("div");
    actions.className = "review-card__actions";

    const featureButton = document.createElement("button");
    featureButton.type = "button";
    featureButton.className = "review-card__button review-card__button--feature";
    featureButton.textContent = "Ver no player";
    featureButton.addEventListener("click", () => setFeaturedReview(review.id, true));

    const youtubeLink = document.createElement("a");
    youtubeLink.className = "review-card__button review-card__button--link";
    youtubeLink.href = `${getYouTubeWatchUrl(review.id)}&list=${getPlaylistId(REVIEW_PLAYLIST_URL)}`;
    youtubeLink.target = "_blank";
    youtubeLink.rel = "noreferrer";
    youtubeLink.textContent = "YouTube";

    thumbnailButton.addEventListener("click", () => setFeaturedReview(review.id, true));

    actions.append(featureButton, youtubeLink);
    body.append(kicker, title, description, actions);
    card.append(thumbnailButton, body);
    fragment.appendChild(card);
  });

  elements.reviewsGrid.innerHTML = "";
  elements.reviewsGrid.appendChild(fragment);
}

function renderBlog() {
  if (!elements.blogFeaturedShell || !elements.blogGrid) {
    return;
  }

  const orderedPosts = getAllBlogPosts().sort(comparePostsByDate);
  const featuredPost =
    orderedPosts.find((post) => post.featured) ||
    orderedPosts[0];
  const remainingPosts = orderedPosts.filter((post) => post.slug !== featuredPost?.slug);

  if (featuredPost) {
    elements.blogFeaturedShell.innerHTML = `
      <article class="blog-featured">
        <div class="blog-featured__media blog-featured__media--${featuredPost.coverTone || "editorial"}">
          <span>${featuredPost.coverLabel || featuredPost.category}</span>
        </div>
        <div class="blog-featured__content">
          <p class="eyebrow">Post em destaque</p>
          <h3 id="blog-featured-title" class="detail-block__title">${featuredPost.title}</h3>
          <p class="blog-featured__meta">${formatBlogPostMeta(featuredPost)}</p>
          <p class="blog-featured__text">${featuredPost.excerpt}</p>
          <p class="blog-featured__text">${featuredPost.intro}</p>
          <div class="blog-featured__actions">
            <a class="detail-button detail-button--accent" href="${getBlogPostUrl(featuredPost.slug)}">Ler artigo</a>
          </div>
        </div>
      </article>
    `;
  }

  elements.blogGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  remainingPosts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "blog-card";
    article.innerHTML = `
      <p class="blog-card__eyebrow">${post.category}</p>
      <h4 class="blog-card__title">
        <a class="blog-card__link" href="${getBlogPostUrl(post.slug)}">${post.title}</a>
      </h4>
      <p class="blog-card__meta">${formatBlogPostMeta(post)}</p>
      <p class="blog-card__text">${post.excerpt}</p>
    `;
    fragment.appendChild(article);
  });

  if (remainingPosts.length === 0 && featuredPost) {
    const article = document.createElement("article");
    article.className = "blog-card";
    article.innerHTML = `
      <p class="blog-card__eyebrow">Estrutura pronta</p>
      <h4 class="blog-card__title">Seu próximo artigo entra aqui</h4>
      <p class="blog-card__text">
        Quando você quiser publicar um novo texto, basta me mandar título, categoria, data,
        resumo e conteúdo. Eu adiciono o post e ele aparece automaticamente nesta grade.
      </p>
    `;
    fragment.appendChild(article);
  }

  elements.blogGrid.appendChild(fragment);
}

function applyStoredHeroSlides() {
  const storedSlides = getStoredHeroSlides();
  if (!storedSlides.length || !elements.heroSlides.length) {
    return;
  }

  elements.heroSlides.forEach((slide, index) => {
    const image = storedSlides[index];
    if (image) {
      slide.style.setProperty("--hero-image", `url('${image}')`);
    }
  });

  ensureHeroSlideImages();
}

function formatBlogPostMeta(post) {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${post.date}T12:00:00`));

  return `${post.category} • ${formattedDate} • ${post.readingTime}`;
}

function getBlogPostUrl(slug) {
  const safeSlug = String(slug || "").replace(/^\/+|\/+$/g, "");
  return safeSlug ? `/blog/${safeSlug}/` : "/blog/";
}

function comparePostsByDate(left, right) {
  return new Date(`${right.date}T12:00:00`) - new Date(`${left.date}T12:00:00`);
}

function setFeaturedReview(reviewId, shouldScroll) {
  const review = REVIEW_VIDEOS.find((item) => item.id === reviewId) || REVIEW_VIDEOS[0];
  if (!review) {
    return;
  }

  elements.reviewsFeaturedIframe.src = `${getYouTubeEmbedUrl(review.id)}?rel=0`;
  elements.reviewsFeaturedTitle.textContent = review.title;
  elements.reviewsFeaturedKicker.textContent = getReviewKicker(review.title);
  elements.reviewsFeaturedDescription.textContent = getReviewDescription(review.title);
  elements.reviewsFeaturedLink.href = `${getYouTubeWatchUrl(review.id)}&list=${getPlaylistId(REVIEW_PLAYLIST_URL)}`;

  if (elements.reviewsGrid) {
    [...elements.reviewsGrid.children].forEach((card) => {
      card.classList.toggle("is-active", card.dataset.reviewId === review.id);
    });
  }

  if (shouldScroll && elements.reviewsFeaturedSection) {
    elements.reviewsFeaturedSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function getYouTubeEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}`;
}

function getYouTubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function getPlaylistId(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : "";
}

function getReviewKicker(title) {
  const normalized = normalizeText(title);
  if (normalized.includes("sem spoilers")) {
    return "Entrada ideal para conhecer o livro sem revelar demais";
  }
  if (normalized.includes("com spoilers")) {
    return "Leitura aprofundada para quem quer mergulhar na obra";
  }
  if (normalized.includes("opiniao real oficial")) {
    return "Comentário frontal, direto e pensado para retenção longa";
  }
  return "Resenha em vídeo para assistir com calma e boa contextualização";
}

function getReviewDescription(title) {
  const normalized = normalizeText(title);
  if (normalized.includes("sem spoilers")) {
    return "Um vídeo pensado para apresentar clima, proposta e impressões gerais sem comprometer a descoberta da leitura.";
  }
  if (normalized.includes("com spoilers")) {
    return "Um mergulho mais detalhado em narrativa, estrutura, pontos fortes e fragilidades da obra para quem já conhece a história.";
  }
  if (normalized.includes("opiniao real oficial")) {
    return "Uma análise mais frontal, com posicionamento claro sobre o livro e espaço para quem gosta de resenhas mais diretas.";
  }
  return "Uma resenha longa com contexto, comentários sobre a obra e ritmo confortável para quem quer assistir de verdade, sem pressa.";
}

function populateFilterOptions() {
  if (!elements.monthFilter || !elements.yearFilter) {
    return;
  }

  populateSelect(elements.monthFilter, getSortedValues(allBooks.map((book) => book.month), monthSort));
  populateSelect(elements.yearFilter, getSortedValues(allBooks.map((book) => book.year), yearSort));
}

function populateSelect(select, values) {
  const currentValue = select.value;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (hasSelectOption(select, currentValue)) {
    select.value = currentValue;
  }
}

function getSortedValues(values, sorter) {
  return [...new Set(values.filter(Boolean))].sort(sorter);
}

function monthSort(left, right) {
  const months = [
    "janeiro",
    "fevereiro",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro"
  ];
  return months.indexOf(normalizeText(left)) - months.indexOf(normalizeText(right));
}

function yearSort(left, right) {
  return Number(right) - Number(left);
}

function hasSelectOption(select, value) {
  return [...select.options].some((option) => option.value === value);
}

function getBookSizeLabel(pageCount) {
  const pages = parsePageCount(pageCount);
  if (!pages) {
    return "";
  }
  if (pages < 200) {
    return "Leitura rápida";
  }
  if (pages <= 500) {
    return "Romance";
  }
  return "Calhamaço";
}

function parsePageCount(pageCount) {
  const match = String(pageCount || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function renderBooks(books) {
  renderBooksPage(books);
}

function renderBooksPage(books) {
  if (!elements.booksGrid || !elements.loadingState || !elements.errorState || !elements.emptyState || !elements.pagination) {
    return;
  }

  elements.booksGrid.innerHTML = "";
  elements.loadingState.classList.add("hidden");
  elements.errorState.classList.add("hidden");
  elements.emptyState.classList.toggle("hidden", books.length > 0);
  elements.pagination.innerHTML = "";

  if (books.length === 0) {
    elements.pagination.classList.add("hidden");
    return;
  }

  const totalPages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);
  const pageStart = (currentPage - 1) * BOOKS_PER_PAGE;
  const visibleBooks = books.slice(pageStart, pageStart + BOOKS_PER_PAGE);
  const fragment = document.createDocumentFragment();

  visibleBooks.forEach((book) => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const coverLink = card.querySelector(".book-card__cover-link");
    const titleLink = card.querySelector(".book-card__title-link");
    const cover = card.querySelector(".book-card__cover");
    const authorPhoto = card.querySelector(".book-card__author-photo");
    const status = card.querySelector(".status-pill");
    const partnerPill = card.querySelector(".partner-pill");
    const rating = card.querySelector(".book-card__rating");
    const description = card.querySelector(".book-card__description");
    const toggle = card.querySelector(".book-card__toggle");
    const toggleLabel = card.querySelector(".book-card__toggle-label");
    const amazonButton = card.querySelector(".book-card__button--amazon");
    const reviewButton = card.querySelector(".book-card__button--review");

    const detailHref = `livros/${book.slug}/`;
    coverLink.href = detailHref;
    titleLink.href = detailHref;
    coverLink.setAttribute("aria-label", `Abrir detalhes de ${book.title || "livro"}`);
    titleLink.setAttribute("aria-label", `Abrir detalhes de ${book.title || "livro"}`);

    cover.src = book.cover || FALLBACK_COVER;
    cover.alt = `Capa do livro ${book.title || "sem título"}`;
    cover.addEventListener("error", () => {
      cover.src = FALLBACK_COVER;
    });

    authorPhoto.src = book.authorPhoto || FALLBACK_AUTHOR;
    authorPhoto.alt = `Foto do autor ${book.author || "desconhecido"}`;
    authorPhoto.addEventListener("error", () => {
      authorPhoto.src = FALLBACK_AUTHOR;
    });

    status.textContent = book.statusLabel;
    status.dataset.status = book.statusKey;
    status.classList.add("hidden");
    card.classList.toggle("book-card--partner", book.isPartnerPublisher);
    card.classList.toggle("book-card--unread", book.statusKey === "nao lido");
    partnerPill.classList.toggle("hidden", !book.isPartnerPublisher);

    card.querySelector(".book-card__author-name").textContent =
      book.author || "Autor não informado";
    card.querySelector(".book-card__title").textContent =
      book.title || "Título não informado";
    renderRating(rating, book.score, book.statusKey);
    description.textContent = book.description || "";
    description.classList.add("hidden");
    toggle.classList.toggle("hidden", !book.description);
    if (book.description) {
      const title = book.title || "livro";
      toggle.setAttribute("aria-label", `Abrir seção sobre ${title}`);
      toggle.addEventListener("click", () => {
        const isExpanded = card.classList.toggle("book-card--expanded");
        toggle.setAttribute("aria-expanded", String(isExpanded));
        toggle.setAttribute(
          "aria-label",
          `${isExpanded ? "Fechar" : "Abrir"} seção sobre ${title}`
        );
        toggleLabel.textContent = "Sobre";
        description.classList.toggle("hidden", !isExpanded);
      });
    }
    card.querySelector(".book-card__meta").textContent = book.publisher || "";

    amazonButton.classList.toggle("hidden", !book.affiliateLink);
    if (book.affiliateLink) {
      amazonButton.href = book.affiliateLink;
    }

    reviewButton.classList.toggle("hidden", !book.youtubeUrl);
    if (book.youtubeUrl) {
      reviewButton.href = book.youtubeUrl;
    }

    fragment.appendChild(card);
  });

  elements.booksGrid.appendChild(fragment);
  renderPagination(books, totalPages);
}

function renderPagination(books, totalPages) {
  elements.pagination.innerHTML = "";
  elements.pagination.classList.toggle("hidden", totalPages <= 1);
  if (totalPages <= 1) {
    return;
  }

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "pagination__button";
  prevButton.textContent = "Anterior";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderBooksPage(books);
    }
  });
  elements.pagination.appendChild(prevButton);

  for (let page = 1; page <= totalPages; page += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pagination__button";
    button.textContent = String(page);
    button.classList.toggle("is-active", page === currentPage);
    button.addEventListener("click", () => {
      currentPage = page;
      renderBooksPage(books);
    });
    elements.pagination.appendChild(button);
  }

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "pagination__button";
  nextButton.textContent = "Próxima";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      renderBooksPage(books);
    }
  });
  elements.pagination.appendChild(nextButton);
}

function renderRating(container, rawScore, statusKey) {
  container.innerHTML = "";
  if (statusKey === "nao lido") {
    container.classList.add("hidden");
    return;
  }

  const score = parseScore(rawScore);

  if (score <= 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  const fragment = document.createDocumentFragment();
  const rounded = Math.round(score * 2) / 2;

  for (let index = 1; index <= 5; index += 1) {
    const star = document.createElement("span");
    star.className = "star";

    if (rounded >= index) {
      star.classList.add("star--full");
    } else if (rounded >= index - 0.5) {
      star.classList.add("star--half");
    } else {
      star.classList.add("star--empty");
    }

    star.textContent = "★";
    fragment.appendChild(star);
  }

  const value = document.createElement("span");
  value.className = "book-card__rating-value";
  value.textContent = rawScore ? String(rawScore).replace(".", ",") : "";
  fragment.appendChild(value);

  container.appendChild(fragment);
}

function parseScore(value) {
  if (!value) {
    return 0;
  }

  const normalized = String(value).replace(",", ".").trim();
  const score = Number.parseFloat(normalized);
  return Number.isFinite(score) ? score : 0;
}

function compareBooksByRecency(left, right) {
  const yearDiff = Number(right.year || 0) - Number(left.year || 0);
  if (yearDiff !== 0) {
    return yearDiff;
  }

  const monthDiff = monthOrder(right.month) - monthOrder(left.month);
  if (monthDiff !== 0) {
    return monthDiff;
  }

  return Number(right.id || 0) - Number(left.id || 0);
}

function monthOrder(month) {
  const months = [
    "janeiro",
    "fevereiro",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro"
  ];
  return months.indexOf(normalizeText(month));
}
