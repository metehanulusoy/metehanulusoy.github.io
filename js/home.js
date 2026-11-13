/*
 * Home page: the projects marked as "featured" in data/projects.json.
 * Uses project-cards.js and helpers.js.
 */

document.addEventListener("DOMContentLoaded", () => {
  const list = document.querySelector("[data-featured-list]");
  const status = document.querySelector("[data-featured-status]");
  if (!list || !status) return;

  let featured = [];
  let loadState = "loading"; // "loading", "ready" or "error"

  async function loadFeatured() {
    loadState = "loading";
    showSkeletons(list, 3);
    showStatus(status, "loading", translate("status.loadingProjects"));

    try {
      const projects = await fetchProjects();
      featured = projects.filter((project) => project.featured);
      loadState = "ready";
      showStatus(status, "");
      renderCards(true);
    } catch (error) {
      loadState = "error";
      list.replaceChildren();
      showStatus(status, "error", projectsErrorMessage(), loadFeatured);
    }
  }

  function renderCards(animate) {
    list.classList.toggle("is-entering", animate);
    list.replaceChildren(...featured.map(createProjectCard));
  }

  listenForFavoriteClicks(list, () => featured);

  // Redraw the cards (or the error message) in the new language.
  document.addEventListener("languagechange", () => {
    if (loadState === "error") {
      showStatus(status, "error", projectsErrorMessage(), loadFeatured);
    } else if (loadState === "ready") {
      renderCards(false);
    }
  });

  loadFeatured();
});
