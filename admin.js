import {
  BLOG_ADMIN_EMAIL,
  BLOG_ADMIN_PASSWORD,
  buildBlogPostPayload,
  estimateReadingTime,
  isBlogAdminAuthenticated,
  saveBlogPost,
  saveHeroSlides,
  setBlogAdminAuthenticated
} from "./blog-store.js";

const elements = {
  blogAdminAuth: document.querySelector("#blog-admin-auth"),
  blogAdminEmail: document.querySelector("#blog-admin-email"),
  blogAdminPassword: document.querySelector("#blog-admin-password"),
  blogAdminLogin: document.querySelector("#blog-admin-login"),
  blogAdminForm: document.querySelector("#blog-admin-form"),
  blogAdminLogout: document.querySelector("#blog-admin-logout"),
  blogAdminFeedback: document.querySelector("#blog-admin-feedback"),
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
  heroSlidesFeedback: document.querySelector("#hero-slides-feedback")
};

init();

function init() {
  bindEvents();
  syncAdminVisibility();
}

function bindEvents() {
  elements.blogAdminLogin?.addEventListener("click", handleBlogAdminLogin);
  elements.blogAdminLogout?.addEventListener("click", handleBlogAdminLogout);
  elements.blogAdminForm?.addEventListener("submit", handleBlogPublish);
  elements.heroSlidesSave?.addEventListener("click", handleHeroSlidesSave);
  elements.blogBody?.addEventListener("input", syncReadingTimeEstimate);
}

function syncAdminVisibility() {
  const isAuthenticated = isBlogAdminAuthenticated();
  elements.blogAdminAuth?.classList.toggle("hidden", isAuthenticated);
  elements.blogAdminForm?.classList.toggle("hidden", !isAuthenticated);

  if (isAuthenticated && elements.blogDate && !elements.blogDate.value) {
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

async function handleBlogPublish(event) {
  event.preventDefault();

  try {
    const coverImage = await readSelectedImage(elements.blogCoverImage);
    const post = buildBlogPostPayload({
      title: elements.blogTitle?.value,
      category: elements.blogCategory?.value,
      date: elements.blogDate?.value,
      readingTime: elements.blogReadingTime?.value,
      coverLabel: elements.blogCoverLabel?.value,
      tags: elements.blogTags?.value,
      videoUrl: elements.blogVideoUrl?.value,
      coverImage,
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
    elements.blogAdminForm?.reset();
    if (elements.blogDate) {
      elements.blogDate.value = new Date().toISOString().slice(0, 10);
    }
    syncReadingTimeEstimate();
    showBlogAdminFeedback("Artigo publicado neste navegador com sucesso.", false);
  } catch (error) {
    console.error(error);
    showBlogAdminFeedback("Não foi possível publicar o artigo agora.", true);
  }
}

async function handleHeroSlidesSave() {
  try {
    const nextSlides = [];

    for (let index = 0; index < elements.heroSlideInputs.length; index += 1) {
      const imageData = await readSelectedImage(elements.heroSlideInputs[index]);
      nextSlides[index] = imageData;
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
    showHeroSlidesFeedback("Slideshow salvo neste navegador com sucesso.", false);
  } catch (error) {
    console.error(error);
    showHeroSlidesFeedback("Não foi possível atualizar o slideshow agora.", true);
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

function syncReadingTimeEstimate() {
  if (!elements.blogReadingTime || !elements.blogBody) {
    return;
  }

  elements.blogReadingTime.value = estimateReadingTime(elements.blogBody.value);
}
