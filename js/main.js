/*
 * Behaviour shared by every page: the fade-in of sections, the mobile menu,
 * the header border that appears on scroll and the year in the footer.
 * Uses translate() from i18n.js.
 */

document.addEventListener("DOMContentLoaded", () => {
  // The fade-in is set up first: if anything after it fails, the sections still become visible.
  setUpRevealOnScroll();
  setUpMobileMenu();
  setUpHeaderOnScroll();
  setFooterYear();
});

function setUpRevealOnScroll() {
  const sections = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No animation wanted (or no browser support): show everything at once.
  if (reduceMotion || !("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

function setUpMobileMenu() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!header || !toggle || !nav) return;

  function isMenuOpen() {
    return nav.classList.contains("is-open");
  }

  function setMenuOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", translate(open ? "menu.close" : "menu.open"));
  }

  setMenuOpen(false);

  toggle.addEventListener("click", () => {
    const open = !isMenuOpen();
    setMenuOpen(open);
    // The links come before the button in the page, so without this the next
    // Tab would skip the menu and go on to the content.
    if (open) nav.querySelector("a").focus();
  });

  // Escape closes the menu and gives the focus back to the button.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen()) {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  // Picking a link closes the menu.
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  // Tabbing out of the header closes the menu as well.
  header.addEventListener("focusout", (event) => {
    if (isMenuOpen() && event.relatedTarget && !header.contains(event.relatedTarget)) {
      setMenuOpen(false);
    }
  });

  // From 48rem up the links are always visible, so the menu is reset.
  const wideScreen = window.matchMedia("(min-width: 48rem)");
  const handleWidthChange = (event) => {
    if (event.matches) setMenuOpen(false);
  };
  if (wideScreen.addEventListener) {
    wideScreen.addEventListener("change", handleWidthChange);
  } else {
    wideScreen.addListener(handleWidthChange); // older Safari
  }

  // Keep the button's label in the current language.
  document.addEventListener("languagechange", () => {
    setMenuOpen(isMenuOpen());
  });
}

function setUpHeaderOnScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

function setFooterYear() {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
}
