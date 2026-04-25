import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BLOG_POSTS } from "./blog-data.js";
import { normalizeBook } from "./data.js";
import { BOOKS_DATA } from "./books-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_URL = "https://darkestante.com.br";

const books = BOOKS_DATA.map(normalizeBook).filter((book) => book.title || book.author);

const sectionPages = [
  {
    dir: "resenhas",
    title: "Resenhas | Darkestante",
    description:
      "Resenhas em vídeo do Darkestante com foco em terror, sobrenatural, opiniões longas e maratona de conteúdo no YouTube.",
    canonical: `${SITE_URL}/resenhas/`,
    bodyData: { pageTab: "resenhas" }
  },
  {
    dir: "blog",
    title: "Blog | Darkestante",
    description:
      "Blog do Darkestante com artigos sobre eventos, resenhas escritas, bastidores de projetos e textos editoriais.",
    canonical: `${SITE_URL}/blog/`,
    bodyData: { pageTab: "blog" }
  },
  {
    dir: "tribo-da-caveira",
    title: "Tribo da Caveira | Darkestante",
    description:
      "Página da Tribo da Caveira para reunir leitores interessados no clube de leitura e nas novidades do Darkestante.",
    canonical: `${SITE_URL}/tribo-da-caveira/`,
    bodyData: { pageTab: "tribo-da-caveira" }
  },
  {
    dir: "projetos/torre-negra-expansao",
    title: "Torre Negra (+Expansão) | Darkestante",
    description:
      "Projeto do Darkestante com lives e conversas sobre Stephen King, It: A Coisa, O Pistoleiro e a expansão da Torre Negra.",
    canonical: `${SITE_URL}/projetos/torre-negra-expansao/`,
    bodyData: { pageTab: "projetos", pageProject: "torre-negra" }
  },
  {
    dir: "projetos/desbravando-o-terror-nacional",
    title: "Desbravando o Terror Nacional | Darkestante",
    description:
      "Websérie do Darkestante com entrevistas exclusivas sobre terror e sobrenatural na literatura brasileira.",
    canonical: `${SITE_URL}/projetos/desbravando-o-terror-nacional/`,
    bodyData: { pageTab: "projetos", pageProject: "terror-nacional" }
  }
];

await build();

async function build() {
  const [indexTemplate, bookTemplate, blogPostTemplate, adminTemplate] = await Promise.all([
    readFile(path.join(__dirname, "index.html"), "utf8"),
    readFile(path.join(__dirname, "livro.html"), "utf8"),
    readFile(path.join(__dirname, "blog-post.html"), "utf8"),
    readFile(path.join(__dirname, "admin.html"), "utf8")
  ]);

  for (const page of sectionPages) {
    const depth = getDepth(page.dir);
    const html = rebaseHtml(
      setBodyData(setPageMeta(indexTemplate, page.title, page.description, page.canonical), page.bodyData),
      depth
    );
    await writeRouteFile(page.dir, html);
  }

  for (const book of books) {
    const route = `livros/${book.slug}`;
    const title = `${book.title} | Darkestante`;
    const description = truncate(
      book.description ||
        `Leia a ficha completa de ${book.title} no Darkestante, com detalhes editoriais, avaliação, vídeos e impressões de leitura.`,
      160
    );
    const html = rebaseHtml(
      setBodyData(
        setPageMeta(bookTemplate, title, description, `${SITE_URL}/${route}/`),
        { bookSlug: book.slug }
      ),
      2
    );
    await writeRouteFile(route, html);
  }

  for (const post of BLOG_POSTS) {
    const route = `blog/${post.slug}`;
    const description = truncate(post.excerpt || post.intro || post.title, 160);
    const html = rebaseHtml(
      setPageMeta(blogPostTemplate, `${post.title} | Blog | Darkestante`, description, `${SITE_URL}/${route}/`),
      2
    );
    await writeRouteFile(route, html);
  }

  const loginHtml = rebaseHtml(
    setPageMeta(
      adminTemplate,
      "Login Administrativo | Darkestante",
      "Área interna de administração do Darkestante.",
      `${SITE_URL}/login/`,
      "noindex, nofollow"
    ),
    1
  );
  await writeRouteFile("login", loginHtml);

  await writeFile(path.join(__dirname, "robots.txt"), buildRobots(), "utf8");
  await writeFile(path.join(__dirname, "sitemap.xml"), buildSitemap(), "utf8");
}

function setPageMeta(html, title, description, canonical, robotsContent = null) {
  let output = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );

  output = output.replace(/^\s*<meta\s+name="robots"\s+content="[^"]*"\s*\/>\n?/m, "");

  if (robotsContent) {
    output = output.replace(
      /(<meta\s+name="description"\s+content="[^"]*"\s*\/>\n)/,
      `$1    <meta name="robots" content="${robotsContent}" />\n`
    );
  }

  const canonicalTag = `    <link rel="canonical" href="${canonical}" />\n`;
  if (output.includes('rel="canonical"')) {
    output = output.replace(/<link\s+rel="canonical"[^>]*\/>\n?/, canonicalTag);
  } else {
    output = output.replace("</head>", `${canonicalTag}</head>`);
  }

  return output;
}

function setBodyData(html, data) {
  const attributes = Object.entries(data)
    .map(([key, value]) => ` data-${camelToKebab(key)}="${escapeHtml(value)}"`)
    .join("");

  return html.replace("<body>", `<body${attributes}>`);
}

function rebaseHtml(html, depth) {
  const prefix = "../".repeat(depth);
  const routeMap = new Map([
    ['href="./"', `href="${prefix}"`],
    ['href="resenhas/"', `href="${prefix}resenhas/"`],
    ['href="blog/"', `href="${prefix}blog/"`],
    ['href="tribo-da-caveira/"', `href="${prefix}tribo-da-caveira/"`],
    ['href="projetos/torre-negra-expansao/"', `href="${prefix}projetos/torre-negra-expansao/"`],
    [
      'href="projetos/desbravando-o-terror-nacional/"',
      `href="${prefix}projetos/desbravando-o-terror-nacional/"`
    ],
    ['href="login/"', `href="${prefix}login/"`],
    ['href="styles.css"', `href="${prefix}styles.css"`],
    ['src="script.js"', `src="${prefix}script.js"`],
    ['src="blog.js"', `src="${prefix}blog.js"`],
    ['src="livro.js"', `src="${prefix}livro.js"`],
    ['src="admin.js"', `src="${prefix}admin.js"`],
    ["./assets/", `${prefix}assets/`],
    ["url('./assets/", `url('${prefix}assets/`]
  ]);

  let output = html;
  for (const [searchValue, replaceValue] of routeMap.entries()) {
    output = output.split(searchValue).join(replaceValue);
  }

  return output;
}

async function writeRouteFile(route, html) {
  const directory = path.join(__dirname, route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html, "utf8");
}

function buildSitemap() {
  const urls = [
    `${SITE_URL}/`,
    ...sectionPages.map((page) => `${SITE_URL}/${page.dir}/`),
    ...books.map((book) => `${SITE_URL}/livros/${book.slug}/`),
    ...BLOG_POSTS.map((post) => `${SITE_URL}/blog/${post.slug}/`)
  ];

  const body = urls
    .map(
      (url) => `  <url>\n    <loc>${url}</loc>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

function getDepth(route) {
  return route.split("/").length;
}

function truncate(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
