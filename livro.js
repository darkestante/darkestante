import { FALLBACK_AUTHOR, FALLBACK_COVER, fetchBooks } from "./data.js";

const elements = {
  loadingState: document.querySelector("#loading-state"),
  errorState: document.querySelector("#error-state"),
  detailState: document.querySelector("#detail-state"),
  notFoundState: document.querySelector("#not-found-state"),
  title: document.querySelector("#detail-title"),
  cover: document.querySelector("#detail-cover"),
  status: document.querySelector("#detail-status"),
  authorPhoto: document.querySelector("#detail-author-photo"),
  meta: document.querySelector("#detail-meta"),
  description: document.querySelector("#detail-description"),
  score: document.querySelector("#detail-score"),
  buyLink: document.querySelector("#detail-buy-link"),
  youtubeArea: document.querySelector("#youtube-area"),
  youtubePanel: document.querySelector(".detail-hero__panel--media"),
  socialArea: document.querySelector("#social-area"),
  technicalList: document.querySelector("#technical-list"),
  sidebarKeywords: document.querySelector("#sidebar-keywords"),
  reviewBlock: document.querySelector("#review-block"),
  reviewText: document.querySelector("#review-text")
};

init();

async function init() {
  try {
    const slug = getCurrentBookSlug();
    const books = await fetchBooks();
    const book = books.find((entry) => entry.slug === slug);

    elements.loadingState.classList.add("hidden");

    if (!book) {
      elements.notFoundState.classList.remove("hidden");
      return;
    }

    renderBook(book);
    elements.detailState.classList.remove("hidden");
  } catch (error) {
    console.error("Erro ao carregar o livro:", error);
    elements.loadingState.classList.add("hidden");
    elements.errorState.classList.remove("hidden");
  }
}

function getCurrentBookSlug() {
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("slug");
  if (querySlug) {
    return querySlug;
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const livrosIndex = segments.lastIndexOf("livros");
  if (livrosIndex >= 0 && segments[livrosIndex + 1]) {
    return decodeURIComponent(segments[livrosIndex + 1]);
  }

  return "";
}

function renderBook(book) {
  document.title = `${book.title} | Darkestante`;
  elements.title.textContent = book.title || "Título não informado";
  elements.meta.textContent = buildDetailMeta(book);
  elements.description.textContent =
    book.description || "A sinopse deste livro ainda será preenchida.";

  elements.cover.src = book.cover || FALLBACK_COVER;
  elements.cover.alt = `Capa do livro ${book.title || "sem título"}`;
  elements.cover.addEventListener("error", () => {
    elements.cover.src = FALLBACK_COVER;
  });

  elements.authorPhoto.src = book.authorPhoto || FALLBACK_AUTHOR;
  elements.authorPhoto.alt = `Foto do autor ${book.author || "desconhecido"}`;
  elements.authorPhoto.addEventListener("error", () => {
    elements.authorPhoto.src = FALLBACK_AUTHOR;
  });
  elements.status.textContent = book.statusLabel;
  elements.status.dataset.status = book.statusKey;

  const scoreText = [];
  if (book.statusKey !== "nao lido" && book.score) {
    scoreText.push(`Nota pessoal: ${book.score}/5`);
  }
  if (book.reviewDate) {
    scoreText.push(`Resenha registrada em ${book.reviewDate}`);
  }
  elements.score.textContent =
    scoreText.join(" • ") || "Espaço preparado para avaliação e histórico de leitura.";

  elements.buyLink.classList.toggle("hidden", !book.affiliateLink);
  if (book.affiliateLink) {
    elements.buyLink.href = book.affiliateLink;
  }

  renderTechnicalList(book);
  renderKeywordTags(book);
  renderReview(book);
  elements.youtubePanel.classList.toggle("hidden", !(book.youtubeEmbed || book.youtubeUrl));
  renderMediaArea(elements.youtubeArea, "YouTube", book.youtubeEmbed, book.youtubeUrl);
  renderMediaArea(elements.socialArea, "Redes sociais", book.socialEmbed, book.socialUrl);
}

function buildDetailMeta(book) {
  const publisher = book.publisher || "Editora não informada";
  if (book.statusKey === "lido") {
    const readMoment = [book.month, book.year].filter(Boolean).join(" de ");
    return readMoment ? `${publisher} • Lido em ${readMoment}` : `${publisher} • Lido`;
  }

  if (book.statusKey === "nao lido") {
    return `${publisher} • Não lido`;
  }

  return publisher;
}

function renderTechnicalList(book) {
  elements.technicalList.innerHTML = "";

  const items = [
    ["Autor(a)", book.author],
    ["Editora", book.publisher],
    ["Tradução", book.translation],
    ["Acabamento", book.finish],
    ["Publicação", book.publicationDate],
    ["Páginas", book.pageCount],
    ["Dimensões", book.dimensions]
  ].filter(([, value]) => value);

  const fragment = document.createDocumentFragment();

  items.forEach(([label, value]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "detail-item";
    wrapper.innerHTML = `
      <p class="detail-label">${label}</p>
      <p class="detail-value">${value}</p>
    `;
    fragment.appendChild(wrapper);
  });

  elements.technicalList.appendChild(fragment);
}

function renderReview(book) {
  const hasReview = Boolean(book.review);
  elements.reviewBlock.classList.toggle("hidden", !hasReview);
  if (hasReview) {
    elements.reviewText.textContent = book.review;
  }
}

function renderKeywordTags(book) {
  elements.sidebarKeywords.innerHTML = "";

  const tags = extractKeywords(book);
  if (tags.length === 0) {
    const emptyTag = document.createElement("span");
    emptyTag.className = "sidebar-tag";
    emptyTag.textContent = "Sem tags";
    elements.sidebarKeywords.appendChild(emptyTag);
    return;
  }

  tags.forEach((tag) => {
    const item = document.createElement("span");
    item.className = "sidebar-tag";
    item.textContent = tag;
    elements.sidebarKeywords.appendChild(item);
  });
}
function extractKeywords(book) {
  const source = `${book.description || ""} ${book.review || ""}`.toLowerCase();
  const dictionary = [
    "terror",
    "suspense",
    "mistério",
    "sobrenatural",
    "fantasia",
    "ficção científica",
    "ficcao cientifica",
    "medieval",
    "horror",
    "investigação",
    "investigacao",
    "paranormal",
    "vampiro",
    "demônio",
    "demonio",
    "amizade",
    "aventura",
    "psicológico",
    "psicologico",
    "religioso",
    "conto",
    "thriller",
    "monstro",
    "lendas"
  ];

  const normalizedTags = [];
  dictionary.forEach((term) => {
    if (source.includes(term)) {
      normalizedTags.push(formatTag(term));
    }
  });

  return [...new Set(normalizedTags)].slice(0, 8);
}

function formatTag(value) {
  return value
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("Ficcao", "Ficção")
    .replace("Cientifica", "Científica")
    .replace("Investigacao", "Investigação")
    .replace("Demonio", "Demônio")
    .replace("Psicologico", "Psicológico");
}

function renderMediaArea(container, label, embedValue, fallbackUrl) {
  container.innerHTML = "";

  const hasContent = Boolean(embedValue || fallbackUrl);
  const wrapper = document.createElement("div");
  wrapper.className = "embed-placeholder";

  if (hasContent) {
    const mediaNodes = createMediaNodes(embedValue, fallbackUrl);
    wrapper.innerHTML = `
      <span class="embed-placeholder__badge">${label}</span>
    `;

    if (mediaNodes.length > 0) {
      if (label === "Redes sociais") {
        const galleryGrid = document.createElement("div");
        galleryGrid.className = "embed-gallery-grid";
        mediaNodes.forEach((node) => {
          galleryGrid.appendChild(node);
        });
        wrapper.appendChild(galleryGrid);
      } else {
        const mediaStack = document.createElement("div");
        mediaStack.className = "embed-stack";
        mediaNodes.forEach((node) => {
          mediaStack.appendChild(node);
        });
        wrapper.appendChild(mediaStack);
      }
    } else if (fallbackUrl) {
      const text = document.createElement("p");
      text.className = "detail-copy";
      text.textContent = "Este espaço já está pronto para receber a resenha publicada.";
      wrapper.appendChild(text);
    }

    if (fallbackUrl) {
      const button = document.createElement("a");
      button.className = "detail-button detail-button--accent";
      button.href = fallbackUrl;
      button.target = "_blank";
      button.rel = "noreferrer";
      button.textContent = "Abrir conteúdo atual";
      wrapper.appendChild(button);
    }
  } else {
    wrapper.innerHTML = `
      <span class="embed-placeholder__badge">${label}</span>
      <p class="detail-copy">
        Área reservada para embed futuro de vídeos, posts ou shorts relacionados a este livro.
      </p>
    `;
  }

  container.appendChild(wrapper);
}

function createMediaNodes(embedValue, fallbackUrl) {
  const raw = String(embedValue || "").trim();
  if (!raw) {
    const fallbackNode = createLinkedMedia(fallbackUrl, labelFromUrl(fallbackUrl));
    return fallbackNode ? [fallbackNode] : [];
  }

  const nodes = [];
  const iframeMatches = [...raw.matchAll(/<iframe[\s\S]*?src=(["'])(.*?)\1[\s\S]*?<\/iframe>/gi)];
  iframeMatches.forEach((match) => {
    const iframeNode = createEmbeddedIframe(match[2] || fallbackUrl);
    if (iframeNode) {
      nodes.push(iframeNode);
    }
  });

  const blockquoteMatches = [
    ...raw.matchAll(/<blockquote[\s\S]*?<\/blockquote>/gi)
  ];
  blockquoteMatches.forEach((match) => {
    const instagramNode = createInstagramEmbed(match[0]);
    if (instagramNode) {
      nodes.push(instagramNode);
    }
  });

  if (nodes.length > 0) {
    return nodes;
  }

  const urlMatches = [...raw.matchAll(/https?:\/\/[^\s"'<>]+/g)]
    .map((match) => match[0]);
  const uniqueUrls = [...new Set(urlMatches)];

  uniqueUrls.forEach((url) => {
    const linkedNode = createLinkedMedia(url, labelFromUrl(url));
    if (linkedNode) {
      nodes.push(linkedNode);
    }
  });

  if (nodes.length > 0) {
    return nodes;
  }

  const fallbackNode = createLinkedMedia(fallbackUrl || raw, labelFromUrl(fallbackUrl || raw));
  return fallbackNode ? [fallbackNode] : [];
}

function createEmbeddedIframe(src) {
  if (!src) {
    return null;
  }

  const frameWrap = document.createElement("div");
  frameWrap.className = "embed-frame-wrap";

  const frame = document.createElement("iframe");
  frame.className = "embed-frame";
  frame.src = src;
  frame.title = "Resenha incorporada";
  frame.loading = "lazy";
  frame.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allowFullscreen = true;
  frameWrap.appendChild(frame);
  return frameWrap;
}

function createInstagramEmbed(raw) {
  const wrapper = document.createElement("div");
  wrapper.className = "embed-instagram";

  const markup = raw.replace(/<script[\s\S]*?<\/script>/gi, "").trim();
  wrapper.innerHTML = markup;
  cleanupInstagramMarkup(wrapper);
  ensureInstagramScript();
  return wrapper;
}

function createLinkedMedia(url, label = "Conteúdo incorporado") {
  const mediaUrl = String(url || "").trim();
  if (!mediaUrl) {
    return null;
  }

  if (isYouTubeUrl(mediaUrl)) {
    return createEmbeddedIframe(toYouTubeEmbedUrl(mediaUrl));
  }

  if (isInstagramUrl(mediaUrl)) {
    return createInstagramEmbedFromUrl(mediaUrl, label);
  }

  return null;
}

function isYouTubeUrl(url) {
  return /youtu\.be|youtube\.com/i.test(url);
}

function isInstagramUrl(url) {
  return /instagram\.com/i.test(url);
}

function createInstagramEmbedFromUrl(url, label) {
  const wrapper = document.createElement("div");
  wrapper.className = "embed-instagram";
  wrapper.innerHTML = `
    <blockquote
      class="instagram-media"
      data-instgrm-permalink="${url}"
      data-instgrm-version="14"
      style="background:#FFF; border:0; margin:1px; max-width:540px; min-width:326px; padding:0; width:calc(100% - 2px);"
    >
      <a href="${url}" target="_blank" rel="noreferrer">${label}</a>
    </blockquote>
  `;
  cleanupInstagramMarkup(wrapper);
  ensureInstagramScript();
  return wrapper;
}

function cleanupInstagramMarkup(wrapper) {
  const blockquote = wrapper.querySelector(".instagram-media");
  if (!blockquote) {
    return;
  }

  blockquote.removeAttribute("data-instgrm-captioned");
  blockquote.querySelectorAll("p").forEach((paragraph) => {
    paragraph.remove();
  });
}

function labelFromUrl(url) {
  if (isYouTubeUrl(url)) {
    return "Ver vídeo";
  }
  if (isInstagramUrl(url)) {
    return "Ver post";
  }
  return "Abrir conteúdo";
}

function toYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace(/\//g, "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.pathname.includes("/embed/")) {
      return url;
    }

    const videoId = parsed.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  } catch {
    return url;
  }
}

function ensureInstagramScript() {
  if (document.querySelector('script[data-instgrm-loader="true"]')) {
    if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
    }
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.instagram.com/embed.js";
  script.dataset.instgrmLoader = "true";
  script.addEventListener("load", () => {
    if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
    }
  });
  document.body.appendChild(script);
}
