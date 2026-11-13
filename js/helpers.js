/*
 * Small helpers shared by the home page and the projects page: building
 * elements safely, and showing loading, error and empty states.
 *
 * Uses translate() from i18n.js, so it is loaded after that file.
 */

/** Creates an element with an optional class and text. The text is set with textContent, never parsed as HTML. */
function buildElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** A link that opens in a new tab without giving the new page access to this one. */
function createExternalLink(url, label, className) {
  const link = buildElement("a", className || "text-link", label);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

/**
 * Puts small pieces of text side by side (category, date, ...). Between them
 * goes a comma that only screen readers hear, so "Web" and "Jul 2026" are not
 * read out as one word.
 */
function appendWithSeparators(container, parts) {
  parts.forEach((part, index) => {
    if (index > 0) container.append(buildElement("span", "visually-hidden", ", "));
    container.append(part);
  });
}

/**
 * Shows a "loading", "error" or "empty" message in a status box; no state
 * clears the box. If the keyboard focus was inside the box (for example on
 * "Try again"), it stays in the box instead of jumping to the top of the page.
 */
function showStatus(box, state, message, onRetry) {
  const focusWasInside = box.contains(document.activeElement);

  box.replaceChildren();
  box.dataset.state = state || "";

  if (state === "loading") {
    const spinner = buildElement("span", "spinner");
    spinner.setAttribute("aria-hidden", "true");
    box.append(spinner);
  }

  if (state) box.append(buildElement("p", "status-text", message));

  let retryButton = null;
  if (state === "error" && onRetry) {
    retryButton = buildElement("button", "button button-ghost", translate("status.retry"));
    retryButton.type = "button";
    retryButton.addEventListener("click", onRetry);
    box.append(retryButton);
  }

  if (focusWasInside) {
    if (retryButton) {
      retryButton.focus();
    } else {
      box.tabIndex = -1;
      box.focus();
    }
  }
}

/** Fills a list with grey placeholder blocks that shimmer while the real content loads. */
function showSkeletons(list, count, tagName = "div", extraClass = "") {
  const placeholders = [];
  for (let i = 0; i < count; i += 1) {
    const placeholder = buildElement(tagName, `skeleton ${extraClass}`.trim());
    placeholder.setAttribute("aria-hidden", "true");
    placeholders.push(placeholder);
  }
  list.replaceChildren(...placeholders);
}

/** True when the page was opened straight from a file, where browsers block fetch(). */
function isOpenedFromFile() {
  return window.location.protocol === "file:";
}
