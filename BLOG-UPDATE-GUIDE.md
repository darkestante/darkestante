# Como atualizar o blog do Darkestante

Os posts do blog ficam em:

- `blog-data.js`
- ou na página interna `admin.html`

Acesso inicial do painel local:

- email: `darkestante@gmail.com`
- senha: `@Bc86022389`

Como acessar:

- no rodapé do site, clique em `login`

Observação:

- esse painel funciona no próprio navegador e salva os posts em `localStorage`
- ele é ótimo para uso local e prototipação
- para uma área logada realmente segura, multiusuário e publicada em produção, o ideal depois é integrar um CMS ou backend

Atualização do slideshow:

- no painel do blog existe uma seção para trocar as 3 imagens do topo
- dimensão recomendada: `1920 x 430 px`
- ao clicar em `Aplicar imagens no slideshow`, as artes passam a valer neste navegador

Cada artigo é um objeto dentro do array `BLOG_POSTS`.

Campos principais:

- `slug`: identificador da URL
- `title`: título do artigo
- `category`: categoria exibida no card e no topo do post
- `date`: data no formato `YYYY-MM-DD`
- `readingTime`: tempo de leitura
- `featured`: `true` para virar destaque principal
- `coverLabel`: texto da capa editorial
- `excerpt`: resumo curto
- `intro`: texto de abertura
- `body`: seções do artigo

Formato de exemplo:

```js
{
  slug: "titulo-do-post",
  title: "Título do post",
  category: "Eventos",
  date: "2026-04-24",
  readingTime: "4 min de leitura",
  featured: false,
  coverLabel: "Eventos",
  coverTone: "editorial",
  excerpt: "Resumo curto do artigo.",
  intro: "Abertura do texto.",
  body: [
    {
      heading: "Subtítulo da seção",
      paragraphs: [
        "Primeiro parágrafo.",
        "Segundo parágrafo."
      ]
    }
  ]
}
```

Se você preferir, não precisa editar manualmente: basta me mandar o título, categoria, resumo e texto do artigo que eu publico para você.
