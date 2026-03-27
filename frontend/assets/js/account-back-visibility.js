// assets/js/account-back-visibility.js
(function () {
  function applyBackVisibility() {
    const nav = document.querySelector('.account-mobile-back-nav');
    if (!nav) return;

    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;

    if (isMobile) {
      nav.classList.remove('account-hidden');
      nav.style.setProperty('display', 'flex', 'important');
      nav.style.setProperty('visibility', 'visible', 'important');
      nav.style.setProperty('opacity', '1', 'important');
      nav.style.setProperty('position', 'relative', 'important');
      nav.style.setProperty('z-index', '5', 'important');

      const control = nav.querySelector('[data-account-back]');
      if (control) {
        control.classList.remove('account-hidden');
        control.style.setProperty('display', 'inline-flex', 'important');
        control.style.setProperty('visibility', 'visible', 'important');
        control.style.setProperty('opacity', '1', 'important');
      }
    } else {
      nav.style.setProperty('display', 'none', 'important');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBackVisibility);
  } else {
    applyBackVisibility();
  }

  window.addEventListener('resize', applyBackVisibility);
})();
