// assets/js/account-mobile-reveal.js
(function () {
  function isMobile() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  }

  function isDedicatedAccountSubpage() {
    try {
      const path = String(window.location.pathname || "").toLowerCase();
      return (
        path.endsWith("/orders.html") ||
        path.endsWith("/change-password.html") ||
        path.endsWith("/edit-account.html") ||
        path.endsWith("orders.html") ||
        path.endsWith("change-password.html") ||
        path.endsWith("edit-account.html")
      );
    } catch {
      return false;
    }
  }

  function ensureMobileBackButton() {
    if (!isMobile() || !isDedicatedAccountSubpage()) return document.querySelector("[data-account-back]");

    const header = document.querySelector(".account-header");
    let backBtn = document.querySelector("[data-account-back]");
    let container = document.querySelector(".account-mobile-back-nav");

    if (!backBtn) {
      if (!container) {
        container = document.createElement("div");
      }
      container.className = "account-view-nav account-header-nav account-mobile-back-nav";

      backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "btn btn-outline account-back-btn";
      backBtn.setAttribute("data-account-back", "");
      backBtn.textContent = "Back to Account Menu";

      container.innerHTML = "";
      container.appendChild(backBtn);
    } else if (!container) {
      container = backBtn.closest(".account-view-nav") || backBtn.parentElement;
    }

    if (container) {
      container.classList.add("account-view-nav", "account-header-nav", "account-mobile-back-nav");
      container.style.display = "flex";
      container.style.marginTop = "0.45rem";
      container.style.marginBottom = "0.7rem";
      container.style.position = "relative";
      container.style.zIndex = "2";

      if (header && header.nextElementSibling !== container) {
        header.insertAdjacentElement("afterend", container);
      }
    }

    backBtn.style.display = "inline-flex";
    backBtn.style.visibility = "visible";
    backBtn.style.opacity = "1";

    return backBtn;
  }

  function init() {
    const sidebar = document.querySelector(".account-layout .account-sidebar");
    const content = document.querySelector(".account-layout .account-content");
    if (!sidebar || !content) return;

    const openCurrentBtn = document.querySelector("[data-account-open-current]");
    let backBtn = document.querySelector("[data-account-back]");

    if (isDedicatedAccountSubpage()) {
      backBtn = ensureMobileBackButton() || backBtn;
    }

    const showMenu = () => {
      if (isDedicatedAccountSubpage()) {
        window.location.href = "account.html";
        return;
      }

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

      el.addEventListener(
        "touchend",
        (event) => {
          touchHandled = true;
          event.preventDefault();
          event.stopPropagation();
          handler();
          setTimeout(() => {
            touchHandled = false;
          }, 350);
        },
        { passive: false }
      );

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
      } else if (isDedicatedAccountSubpage()) {
        ensureMobileBackButton();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
