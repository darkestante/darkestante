import { isBlogAdminAuthenticated, setBlogAdminAuthenticated } from "./blog-store.js";

export function syncSiteAuthUi() {
  syncAuthLinks();
  syncHomeLinks();
  syncAdminLinks();
}

function syncAuthLinks() {
  const isAuthenticated = isBlogAdminAuthenticated();
  const authLinks = document.querySelectorAll("[data-auth-link]");

  authLinks.forEach((link) => {
    const loginHref = link.getAttribute("data-login-href") || link.getAttribute("href") || "/login/";

    if (isAuthenticated) {
      link.textContent = "deslogar";
      link.setAttribute("href", "#");
      link.onclick = (event) => {
        event.preventDefault();
        setBlogAdminAuthenticated(false);
        window.location.reload();
      };
      return;
    }

    link.textContent = "login";
    link.setAttribute("href", loginHref);
    link.onclick = null;
  });
}

function syncHomeLinks() {
  const homeLinks = document.querySelectorAll("[data-home-link]");
  const isLocalFile = window.location.protocol === "file:";

  homeLinks.forEach((link) => {
    const fallback = link.getAttribute("data-home-fallback") || link.getAttribute("href") || "index.html";
    link.setAttribute("href", isLocalFile ? fallback : "/");
  });
}

function syncAdminLinks() {
  const adminLinks = document.querySelectorAll("[data-admin-link]");
  const isAuthenticated = isBlogAdminAuthenticated();
  const isLocalFile = window.location.protocol === "file:";

  adminLinks.forEach((link) => {
    const fallback = link.getAttribute("data-admin-fallback") || "login/index.html";
    link.setAttribute("href", isLocalFile ? fallback : "/login/");
    link.classList.toggle("hidden", !isAuthenticated);
  });
}
