/*
 * Colour theme (light / dark).
 *
 * This file is loaded in <head> without `defer`, so it runs before the page
 * is painted: someone who picked the dark theme never sees a flash of the
 * light one. The toggle button is wired up once the page has loaded.
 */
(function () {
  const STORAGE_KEY = "theme";
  const THEME_COLORS = { light: "#f6f1e9", dark: "#0b0a09" };
  const root = document.documentElement;

  // Tells the CSS that JavaScript is running. The mobile menu and the scroll
  // animations depend on it, so without JavaScript nothing stays hidden.
  root.classList.add("js");

  function readSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null; // storage can be blocked, e.g. in some private windows
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // The theme still changes, it just will not be remembered next time.
    }
  }

  function updateThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = root.classList.contains("dark") ? THEME_COLORS.dark : THEME_COLORS.light;
  }

  function updateButton(button) {
    button.setAttribute("aria-pressed", String(root.classList.contains("dark")));
  }

  // With no saved choice, follow the operating system setting.
  const savedTheme = readSavedTheme();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (savedTheme === null && prefersDark)) {
    root.classList.add("dark");
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateThemeColor();

    const button = document.querySelector("[data-theme-toggle]");
    if (!button) return;

    updateButton(button);
    button.addEventListener("click", () => {
      const isDark = root.classList.toggle("dark");
      saveTheme(isDark ? "dark" : "light");
      updateButton(button);
      updateThemeColor();
    });
  });
})();
