/*
 * Projects page:
 *  1. curated projects from data/projects.json, with search, a category
 *     filter and favourites;
 *  2. a live list of public repositories from the GitHub REST API.
 *
 * Uses project-cards.js and helpers.js.
 */

const GITHUB_USER = "metehanulusoy";
const GITHUB_REPOS_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`;
const REPO_CACHE_KEY = "github-repos";
const REPO_CACHE_MINUTES = 10;
// Left out of the live list (forks are skipped separately): the profile
// README repository and a project I do not show on this site.
const HIDDEN_REPOS = new Set([GITHUB_USER, "claude-recipes"]);

document.addEventListener("DOMContentLoaded", () => {
  setUpCuratedProjects();
  setUpGitHubRepos();
});

/* ---------- 1. Curated projects ---------- */

function setUpCuratedProjects() {
  const list = document.querySelector("[data-projects-list]");
  const status = document.querySelector("[data-projects-status]");
  const resultCount = document.querySelector("[data-result-count]");
  const searchInput = document.getElementById("project-search");
  const filterButtons = document.querySelectorAll(".chip[data-filter]");
  const favoritesOnlyBox = document.querySelector("[data-favorites-only]");
  if (!list || !status || !resultCount || !searchInput || !favoritesOnlyBox) return;

  // Start from what the controls show: some browsers keep a typed search or a
  // ticked box after a reload.
  const pressedFilter = document.querySelector('.chip[data-filter][aria-pressed="true"]');
  const filters = {
    query: normalizeForSearch(searchInput.value.trim()),
    category: pressedFilter ? pressedFilter.dataset.filter : "all",
    favoritesOnly: favoritesOnlyBox.checked,
  };
  let projects = [];
  let loadState = "loading"; // "loading", "ready" or "error"

  async function loadProjects() {
    loadState = "loading";
    resultCount.textContent = "";
    showSkeletons(list, 6);
    showStatus(status, "loading", translate("status.loadingProjects"));

    try {
      projects = await fetchProjects();
      loadState = "ready";
      renderProjects(true);
    } catch (error) {
      loadState = "error";
      list.replaceChildren();
      showStatus(status, "error", projectsErrorMessage(), loadProjects);
    }
  }

  function matchesFilters(project) {
    if (filters.category !== "all" && project.category !== filters.category) return false;
    if (filters.favoritesOnly && !isFavorite(project.id)) return false;
    if (!filters.query) return true;

    // Both languages are searched, so "arşiv" and "archive" both find CENG Arşiv.
    const searchable = [
      project.title.tr,
      project.title.en,
      project.summary.tr,
      project.summary.en,
      project.stack.join(" "),
    ].join(" ");
    return normalizeForSearch(searchable).includes(filters.query);
  }

  function renderProjects(animate) {
    // While loading, or after an error, the filters are only remembered; they
    // are applied as soon as the data arrives. This keeps the error message
    // and its "Try again" button on screen.
    if (loadState !== "ready") return;

    const visible = projects.filter(matchesFilters);

    list.classList.toggle("is-entering", animate);
    list.replaceChildren(...visible.map(createProjectCard));
    resultCount.textContent = translateCount("projects.count", visible.length);

    if (visible.length === 0) {
      showStatus(status, "empty", translate("projects.empty"));
    } else {
      showStatus(status, "");
    }
  }

  searchInput.addEventListener("input", () => {
    filters.query = normalizeForSearch(searchInput.value.trim());
    renderProjects(false);
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filters.category = button.dataset.filter;
      filterButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      renderProjects(false);
    });
  });

  favoritesOnlyBox.addEventListener("change", () => {
    filters.favoritesOnly = favoritesOnlyBox.checked;
    renderProjects(false);
  });

  // With "favourites only" switched on, removing a star hides that card at
  // once. The focus then moves to the next card's star (or to the result
  // count) instead of being lost.
  listenForFavoriteClicks(list, () => projects, (card) => {
    if (!filters.favoritesOnly) return;

    const position = Array.from(list.querySelectorAll(".project-card")).indexOf(card);
    renderProjects(false);

    const stars = list.querySelectorAll(".favorite-button");
    if (stars.length > 0) {
      stars[Math.min(position, stars.length - 1)].focus();
    } else {
      resultCount.tabIndex = -1;
      resultCount.focus();
    }
  });

  document.addEventListener("languagechange", () => {
    if (loadState === "error") {
      showStatus(status, "error", projectsErrorMessage(), loadProjects);
    } else if (loadState === "loading") {
      showStatus(status, "loading", translate("status.loadingProjects"));
    } else {
      renderProjects(false);
    }
  });

  loadProjects();
}

/** Lower-cases text and strips accents, so "Arşiv", "arsiv" and "ARŞİV" all match. */
function normalizeForSearch(text) {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD") // splits a letter like "ş" into "s" plus a separate accent mark...
    .replace(/\p{M}/gu, ""); // ...and this removes the accent marks
}

/* ---------- 2. Live repositories from GitHub ---------- */

function setUpGitHubRepos() {
  const list = document.querySelector("[data-repos-list]");
  const status = document.querySelector("[data-repos-status]");
  const languageSelect = document.getElementById("repo-language");
  if (!list || !status || !languageSelect) return;

  let repos = [];
  let lastError = null;
  let loadState = "loading"; // "loading", "ready" or "error"

  async function loadRepos() {
    loadState = "loading";
    lastError = null;
    showSkeletons(list, 6, "li", "skeleton-repo");
    showStatus(status, "loading", translate("github.loading"));

    try {
      repos = await fetchRepos();
      loadState = "ready";
      fillLanguageOptions();
      renderRepos();
    } catch (error) {
      loadState = "error";
      lastError = error;
      list.replaceChildren();
      showStatus(status, "error", describeRepoError(error), loadRepos);
    }
  }

  /** The language filter is built from the languages that actually appear in the data. */
  function fillLanguageOptions() {
    const languages = [...new Set(repos.map((repo) => repo.language).filter(Boolean))].sort();
    const selected = languageSelect.value;

    languageSelect.querySelectorAll("option:not([value='all'])").forEach((option) => option.remove());
    languages.forEach((language) => {
      const option = buildElement("option", "", language);
      option.value = language;
      languageSelect.append(option);
    });

    languageSelect.value = languages.includes(selected) ? selected : "all";
  }

  function renderRepos() {
    // Same rule as the projects list: an error message is never replaced by "no results".
    if (loadState !== "ready") return;

    const language = languageSelect.value;
    const visible = repos.filter((repo) => language === "all" || repo.language === language);

    list.replaceChildren(...visible.map(createRepoItem));

    if (visible.length === 0) {
      showStatus(status, "empty", translate("github.empty"));
    } else {
      showStatus(status, "");
    }
  }

  languageSelect.addEventListener("change", renderRepos);

  document.addEventListener("languagechange", () => {
    if (loadState === "error") {
      showStatus(status, "error", describeRepoError(lastError), loadRepos);
    } else if (loadState === "loading") {
      showStatus(status, "loading", translate("github.loading"));
    } else {
      renderRepos();
    }
  });

  loadRepos();
}

async function fetchRepos() {
  const cached = readRepoCache();
  if (cached) return cached;

  const response = await fetch(GITHUB_REPOS_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    const error = new Error(`GitHub API responded with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const repos = data
    .filter((repo) => !repo.fork && !HIDDEN_REPOS.has(repo.name))
    .map((repo) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      pushedAt: repo.pushed_at,
      url: repo.html_url,
    }));

  writeRepoCache(repos);
  return repos;
}

// Without a key the API allows 60 requests an hour, so the answer is kept for
// ten minutes in sessionStorage instead of asking again on every page load.
function readRepoCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(REPO_CACHE_KEY));
    if (cached && Date.now() - cached.savedAt < REPO_CACHE_MINUTES * 60 * 1000) {
      return cached.repos;
    }
  } catch (error) {
    // A broken or blocked cache is ignored; GitHub is asked again.
  }
  return null;
}

function writeRepoCache(repos) {
  try {
    sessionStorage.setItem(REPO_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), repos }));
  } catch (error) {
    // The cache is only an optimisation.
  }
}

function describeRepoError(error) {
  if (error.status === 403 || error.status === 429) return translate("github.rateLimited");
  if (error.status) return translate("github.httpError", { status: error.status });
  return translate("github.networkError");
}

function createRepoItem(repo) {
  const item = buildElement("li", "repo-item");
  if (repo.language) item.dataset.language = repo.language;

  // Only ever link to github.com, whatever the API sent back.
  const url = String(repo.url).startsWith("https://github.com/") ? repo.url : `https://github.com/${GITHUB_USER}`;
  const name = createExternalLink(url, repo.name, "text-link repo-name");

  const description = buildElement("p", "repo-description", repo.description || translate("github.noDescription"));

  const updated = buildElement("time", "repo-updated", translate("github.updated", { date: formatDay(repo.pushedAt) }));
  updated.dateTime = repo.pushedAt;

  const meta = buildElement("p", "repo-meta");
  const metaParts = [buildElement("span", "repo-stars", translateCount("github.stars", repo.stars)), updated];
  if (repo.language) metaParts.unshift(buildElement("span", "repo-language", repo.language));
  appendWithSeparators(meta, metaParts);

  item.append(name, description, meta);
  return item;
}

function formatDay(isoDate) {
  const locale = currentLanguage === "tr" ? "tr-TR" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(isoDate));
}
