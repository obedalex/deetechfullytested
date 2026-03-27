// assets/js/account-mobile-reveal.js
(function () {
  function isMobile() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  }

  function isDedicatedAccountSubpage() {
    try {
      const path = String(window.location.pathname || "").toLowerCase();
      return path.endsWith("/orders.html") || path.endsWith("/change-password.html") || path.endsWith("orders.html") || path.endsWith("change-password.html");
    } catch {
      return false;
    }
  }

  function init() {
    const sidebar = document.querySelector(".account-layout .account-sidebar");
    const content = document.querySelector(".account-layout .account-content");
    if (!sidebar || !content) return;

    const openCurrentBtn = document.querySelector("[data-account-open-current]");
    const backBtn = document.querySelector("[data-account-back]");

    const showMenu = () => {
      if (!isMobile()) {
        sidebar.classList.remove("account-hidden");
        content.classList.remove("account-hidden");
        return;
      }
      content.classList.add("account-hidden");
      sidebar.classList.remove("account-hidden");
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    const openContent = () => {
      content.classList.remove("account-hidden");
      if (isMobile()) {
        sidebar.classList.add("account-hidden");
      } else {
        sidebar.classList.remove("account-hidden");
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    const bindActivate = (el, handler) => {
      if (!el) return;
      let touchHandled = false;

      el.addEventListener("touchend", (event) => {
        touchHandled = true;
        event.preventDefault();
        event.stopPropagation();
        handler();
        setTimeout(() => {
          touchHandled = false;
        }, 350);
      }, { passive: false });

      el.addEventListener("click", (event) => {
        if (touchHandled) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        handler();
      });
    };

    bindActivate(openCurrentBtn, openContent);
    bindActivate(backBtn, showMenu);

    if (isMobile()) {
      if (isDedicatedAccountSubpage()) {
        openContent();
      } else {
        showMenu();
      }
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    } else {
      openContent();
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }

    window.addEventListener("resize", () => {
      if (!isMobile()) {
        sidebar.classList.remove("account-hidden");
        content.classList.remove("account-hidden");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();