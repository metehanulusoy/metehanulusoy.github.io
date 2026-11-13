/*
 * Curated projects from data/projects.json: loading them, turning each one
 * into a card, and remembering favourites. Used by the home page (featured
 * projects) and the projects page.
 *
 * Uses translate() and currentLanguage from i18n.js and the helpers in
 * helpers.js, so it is loaded after both.
 */

const PROJECTS_URL = "data/projects.json";
const FAVORITES_KEY = "favorite-projects";
const SVG_NS = "http://www.w3.org/2000/svg";

/* ---------- Data ---------- */

async function fetchProjects() {
  const response = await fetch(PROJECTS_URL);
  if (!response.ok) {
    throw new Error(`Could not load ${PROJECTS_URL} (HTTP ${response.status})`);
  }
  return response.json();
}

/** The message for a failed load. Opening the page from a file gets its own explanation. */
function projectsErrorMessage() {
  return translate(isOpenedFromFile() ? "status.fileProtocol" : "status.projectsError");
}

/** Picks the current language out of a { tr, en } pair. */
function localize(value) {
  if (value && typeof value === "object") return value[currentLanguage] || value.tr || "";
  return value || "";
}

function formatMonth(isoMonth) {
  const locale = currentLanguage === "tr" ? "tr-TR" : "en-GB";
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(`${isoMonth}-01T12:00:00`));
}

/* ---------- Favourites ---------- */

// Favourites are kept in memory too, so they keep working during the visit
// even when the browser blocks localStorage.
let favoriteIds = readFavorites();

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  } catch (error) {
    // They still work during this visit; they are just not remembered next time.
  }
}

function isFavorite(id) {
  return favoriteIds.includes(id);
}

// Favourites may have changed on another page while this one waited in the
// browser's back/forward cache.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) favoriteIds = readFavorites();
});

/** Adds the project to the favourites or removes it; returns true if it is now a favourite. */
function toggleFavorite(id) {
  if (isFavorite(id)) {
    favoriteIds = favoriteIds.filter((favoriteId) => favoriteId !== id);
  } else {
    favoriteIds = [...favoriteIds, id];
  }
  saveFavorites();
  return isFavorite(id);
}

/* ---------- Cards ---------- */

function createProjectCard(project) {
  const card = buildElement("article", "project-card");
  card.dataset.id = project.id;
  card.append(createProjectMedia(project), createProjectBody(project), createFavoriteButton(project));
  return card;
}

function createProjectMedia(project) {
  const media = buildElement("div", "project-media");

  if (project.image) {
    const image = document.createElement("img");
    image.src = project.image;
    image.alt = localize(project.imageAlt);
    image.width = 1200;
    image.height = 750;
    image.loading = "lazy";
    image.decoding = "async";
    media.append(image);
  } else {
    // No screenshot: a typographic cover with the project's initials.
    const cover = buildElement("div", "project-cover");
    cover.dataset.category = project.category;
    cover.setAttribute("aria-hidden", "true");
    cover.append(buildElement("span", "project-cover-initials", getInitials(localize(project.title))));
    media.append(cover);
  }

  return media;
}

/** "LLM Cost Autopilot" -> "LC". Words that do not start with a letter or digit are skipped. */
function getInitials(title) {
  return title
    .split(/[\s—–-]+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word))
    .slice(0, 2)
    .map((word) => word[0].toLocaleUpperCase(currentLanguage))
    .join("");
}

function createProjectBody(project) {
  const body = buildElement("div", "project-body");

  const meta = buildElement("p", "project-meta");
  appendWithSeparators(meta, [
    buildElement("span", "project-category", translate(`category.${project.category}`)),
    buildElement("span", "project-date", formatMonth(project.date)),
  ]);

  const title = buildElement("h3", "project-title", localize(project.title));
  const summary = buildElement("p", "project-summary", localize(project.summary));

  const stack = buildElement("ul", "tag-list");
  stack.setAttribute("aria-label", translate("projects.stackLabel"));
  project.stack.forEach((name) => stack.append(buildElement("li", "", name)));

  const links = buildElement("div", "project-links");
  if (project.live) links.append(createExternalLink(project.live, translate("projects.visit")));
  if (project.repo) links.append(createExternalLink(project.repo, translate("projects.source")));

  body.append(meta, title, summary, stack, links);
  return body;
}

function createFavoriteButton(project) {
  const button = buildElement("button", "favorite-button");
  button.type = "button";
  button.append(createStarIcon());
  setFavoriteButtonState(button, project, isFavorite(project.id));
  return button;
}

/**
 * The button's name stays the same and aria-pressed says whether it is on,
 * which is how toggle buttons are announced. The tooltip says what a click does.
 */
function setFavoriteButtonState(button, project, active) {
  button.setAttribute("aria-label", translate("favorites.label", { title: localize(project.title) }));
  button.setAttribute("aria-pressed", String(active));
  button.title = translate(active ? "favorites.remove" : "favorites.add");
}

function createStarIcon() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z");
  svg.append(path);
  return svg;
}

/**
 * One click listener on the whole list handles every star button inside it
 * (event delegation), so cards that are created later need no listener.
 * afterToggle, if given, receives the card that was clicked.
 */
function listenForFavoriteClicks(list, getProjects, afterToggle) {
  list.addEventListener("click", (event) => {
    const button = event.target.closest(".favorite-button");
    if (!button) return;

    const card = button.closest(".project-card");
    const project = getProjects().find((item) => item.id === card.dataset.id);
    if (!project) return;

    const active = toggleFavorite(project.id);
    setFavoriteButtonState(button, project, active);

    button.classList.add("is-popping");
    button.addEventListener("animationend", () => button.classList.remove("is-popping"), { once: true });

    if (afterToggle) afterToggle(card);
  });
}
