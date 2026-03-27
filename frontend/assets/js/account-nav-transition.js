// Smooth sidebar navigation transition for account-related pages.
document.addEventListener("DOMContentLoaded", () => {
  const links = Array.from(document.querySelectorAll(".account-sidebar a.account-sidebar-tab[href]"));
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      event.preventDefault();
      document.body.classList.add("account-page-leaving");
      window.setTimeout(() => {
        window.location.href = href;
      }, 140);
    });
  });
});
