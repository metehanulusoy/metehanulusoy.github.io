/*
 * Two languages: Turkish and English.
 *
 * The Turkish text is written straight into the HTML, so every page reads
 * correctly even before JavaScript runs. Elements that change with the
 * language carry a `data-i18n` key (for their text) or `data-i18n-attr`
 * (for attributes such as aria-label or placeholder, written as
 * "attribute:key"). Switching to English fills those in from TRANSLATIONS.en;
 * switching back puts the original Turkish text back.
 *
 * Text that JavaScript creates itself (loading and error messages, form
 * errors, card labels) comes from TRANSLATIONS in both languages, through
 * translate().
 */

const LANGUAGE_KEY = "language";
const SUPPORTED_LANGUAGES = ["tr", "en"];

const TRANSLATIONS = {
  // Turkish text used by JavaScript. (Turkish page text lives in the HTML.)
  tr: {
    "menu.open": "Menüyü aç",
    "menu.close": "Menüyü kapat",

    "status.loadingProjects": "Projeler yükleniyor…",
    "status.projectsError": "Projeler yüklenemedi. Bağlantını kontrol edip tekrar dene.",
    "status.fileProtocol": "Sayfa doğrudan dosyadan açıldığı için veriler okunamıyor. Siteyi canlı adresinden (metehanulusoy.github.io) ya da yerel bir sunucuyla aç.",
    "status.retry": "Tekrar dene",

    "category.web": "Web",
    "category.services": "Servisler",
    "category.ml": "Makine öğrenmesi",
    "category.product": "Ürün",
    "category.tooling": "Araçlar",

    "projects.count.one": "{count} proje gösteriliyor",
    "projects.count.other": "{count} proje gösteriliyor",
    "projects.empty": "Bu filtrelere uyan proje yok.",
    "projects.visit": "Siteyi aç",
    "projects.source": "Kaynak kod",
    "projects.stackLabel": "Kullanılan teknolojiler",
    "favorites.label": "Favori: {title}",
    "favorites.add": "Favorilere ekle",
    "favorites.remove": "Favorilerden çıkar",

    "github.loading": "Depolar GitHub'dan çekiliyor…",
    "github.rateLimited": "GitHub'ın saatlik istek sınırına ulaşıldı. Birkaç dakika sonra tekrar dene.",
    "github.httpError": "GitHub beklenmeyen bir yanıt verdi (HTTP {status}).",
    "github.networkError": "GitHub'a ulaşılamadı. İnternet bağlantını kontrol et.",
    "github.empty": "Bu dilde depo yok.",
    "github.noDescription": "Açıklama eklenmemiş.",
    "github.stars.one": "{count} yıldız",
    "github.stars.other": "{count} yıldız",
    "github.updated": "Güncelleme: {date}",

    "form.nameRequired": "Lütfen adını yaz.",
    "form.nameShort": "Ad en az {min} karakter olmalı.",
    "form.emailRequired": "E-posta adresi gerekli.",
    "form.emailInvalid": "Geçerli bir e-posta adresi yaz (ör. ad@ornek.com).",
    "form.topicRequired": "Bir konu seç.",
    "form.messageRequired": "Mesajını yaz.",
    "form.messageShort": "Mesaj en az {min} karakter olmalı; şu an {count} karakter.",
    "form.consentRequired": "Göndermeden önce onay kutusunu işaretle.",
    "contact.copied": "Metin panoya kopyalandı.",
    "contact.copyFailed": "Kopyalanamadı; metni formdan seçip elle kopyalayabilirsin.",
  },

  // English: the page text and the text used by JavaScript.
  en: {
    // Shared by every page
    "a11y.skip": "Skip to content",
    "nav.label": "Main menu",
    "nav.homeLabel": "Metehan Ulusoy, home",
    "nav.home": "Home",
    "nav.about": "About",
    "nav.projects": "Projects",
    "nav.contact": "Contact",
    "theme.label": "Dark theme",
    "menu.open": "Open menu",
    "menu.close": "Close menu",
    "footer.built": "This site was written without frameworks or libraries, using only HTML, CSS and JavaScript.",
    "footer.email": "E-mail",

    // Home
    "meta.home.title": "Metehan Ulusoy — Software developer",
    "meta.home.description": "Computer engineering student. I work on the web, on data and on automation.",
    "hero.place": "Trabzon, Türkiye",
    "hero.role": "Software developer",
    "hero.lede": "Computer engineering student. I design it, I build it, I ship it.",
    "hero.ctaProjects": "See my projects",
    "hero.ctaContact": "Get in touch",
    "focus.eyebrow": "What I do",
    "focus.title": "I am not tied to one field; what interests me is the problem itself.",
    "focus.web.title": "Web",
    "focus.web.text": "Products for real users with Next.js and Supabase, and framework-free interfaces like this site.",
    "focus.ml.title": "Machine learning",
    "focus.ml.text": "Credit risk with XGBoost and SHAP, and image classification that runs in the browser with MobileNet.",
    "focus.services.title": "Backend services",
    "focus.services.text": "Gateway, cache and observability services with FastAPI, Redis and Docker.",
    "focus.automation.title": "Automation",
    "focus.automation.text": "n8n workflows, Telegram bots and a GitHub Action that keeps documentation up to date on its own.",
    "featured.eyebrow": "Selected work",
    "featured.title": "Featured projects",
    "featured.all": "All projects",
    "cta.eyebrow": "Contact",
    "cta.title": "Shall we build something together?",
    "cta.text": "An internship, a project idea or something from class: write to me and I will get back to you.",
    "cta.button": "Send a message",

    // About
    "meta.about.title": "About — Metehan Ulusoy",
    "meta.about.description": "Computer engineering student at RTEU: how I got here, what I work on and the tools I use.",
    "about.eyebrow": "About",
    "about.title": "Twenty projects in three months",
    "about.p1": "I study computer engineering at Recep Tayyip Erdoğan University, in my third year. I started with automation, went on through machine learning, and now write both web products and backend services.",
    "about.p2": "I am not tied to one domain. What interests me is the problem itself: risk scoring at a bank, the data model behind a social platform, or a single-file command-line tool.",
    "about.p3": "In every repository I write I look for the same three things: type safety, tests, and a README somebody can actually read.",
    "about.factsTitle": "At a glance",
    "about.fact.study": "Study",
    "about.fact.studyValue": "Computer Engineering, third year, RTEU",
    "about.fact.focus": "What I work on",
    "about.fact.focusValue": "Web, machine learning, backend services, automation",
    "about.fact.languages": "Languages",
    "about.fact.languagesValue": "Turkish, English",
    "about.fact.location": "Location",
    "about.fact.locationValue": "Trabzon, Türkiye",
    "timeline.eyebrow": "Timeline",
    "timeline.title": "How I got here",
    "timeline.lede": "Every row is a real repository, opened on a real date.",
    "timeline.reposLabel": "Repositories",
    "timeline.m1.date": "March 2026",
    "timeline.m1.title": "Automation and first models",
    "timeline.m1.body": "The fastest way to understand something is to take it apart until it breaks.",
    "timeline.m2.date": "April 2026",
    "timeline.m2.title": "Applied machine learning",
    "timeline.m2.body": "Banking problems. This is where I learned that accuracy on its own says nothing.",
    "timeline.m3.date": "May 2026",
    "timeline.m3.title": "Services",
    "timeline.m3.body": "Seven services in three weeks: gateway, cache, observability, CI gate.",
    "timeline.m4.from": "June",
    "timeline.m4.to": "July 2026",
    "timeline.m4.title": "Interfaces for real users",
    "timeline.m4.body": "A department archive, a streaming interface study and an agriculture site in three concepts.",
    "timeline.m4.figureAlt": "The Tarım Konseptleri chooser with three concept cards: Filiz, Ekinova and Harman",
    "timeline.m4.figureCaption": "Tarım Konseptleri: three agriculture sites built on one codebase.",
    "skills.eyebrow": "Toolbox",
    "skills.title": "Tools I use",
    "skills.languages": "Languages",
    "skills.web": "Web",
    "skills.backend": "Backend and data",
    "skills.ml": "Machine learning",
    "skills.automation": "Automation and tooling",

    // Projects
    "meta.projects.title": "Projects — Metehan Ulusoy",
    "meta.projects.description": "Selected projects and a live list of my open-source repositories on GitHub.",
    "projects.eyebrow": "Projects",
    "projects.title": "Things I have built",
    "projects.lede": "Projects I picked, and a live list of my open-source repositories on GitHub.",
    "projects.curatedTitle": "Selected projects",
    "projects.curatedLede": "Search by name or technology, filter by category and star the ones you like; your favourites are remembered on this device.",
    "projects.searchLabel": "Search projects",
    "projects.searchPlaceholder": "e.g. Python, RAG, Next.js",
    "projects.categoryLabel": "Category",
    "projects.favoritesOnly": "Favourites only",
    "projects.count.one": "Showing {count} project",
    "projects.count.other": "Showing {count} projects",
    "projects.empty": "No project matches these filters.",
    "projects.visit": "Open site",
    "projects.source": "Source code",
    "projects.stackLabel": "Built with",
    "favorites.label": "Favourite: {title}",
    "favorites.add": "Add to favourites",
    "favorites.remove": "Remove from favourites",
    "category.all": "All",
    "category.web": "Web",
    "category.services": "Services",
    "category.ml": "Machine learning",
    "category.product": "Product",
    "category.tooling": "Tools",
    "status.loadingProjects": "Loading projects…",
    "status.projectsError": "The projects could not be loaded. Check your connection and try again.",
    "status.fileProtocol": "The page was opened straight from a file, so the data cannot be read. Open the site at its live address (metehanulusoy.github.io) or with a local server.",
    "status.retry": "Try again",
    "github.eyebrow": "Open source",
    "github.title": "Live from GitHub",
    "github.lede": "This list comes from GitHub's public API. To stay within the request limit, it is kept in the browser for ten minutes.",
    "github.languageLabel": "Language",
    "github.allLanguages": "All languages",
    "github.loading": "Fetching repositories from GitHub…",
    "github.rateLimited": "GitHub's hourly request limit was reached. Try again in a few minutes.",
    "github.httpError": "GitHub sent an unexpected response (HTTP {status}).",
    "github.networkError": "GitHub could not be reached. Check your internet connection.",
    "github.empty": "No repositories in this language.",
    "github.noDescription": "No description yet.",
    "github.stars.one": "{count} star",
    "github.stars.other": "{count} stars",
    "github.updated": "Updated {date}",

    // Contact
    "meta.contact.title": "Contact — Metehan Ulusoy",
    "meta.contact.description": "Write to me about an internship, a project idea or something from class.",
    "contact.eyebrow": "Contact",
    "contact.title": "One message away",
    "contact.lede": "An internship, a project idea or something from class: write and I will get back to you as soon as I can.",
    "contact.channelsTitle": "Reach me directly",
    "contact.channelEmail": "E-mail",
    "contact.formTitle": "Send a message",
    "contact.formNote": "The site has no server: once the form is valid, your message opens in your e-mail app, ready to send.",
    "contact.draftRestored": "Your unsent draft was restored.",
    "contact.clearDraft": "Delete draft",
    "contact.name": "Full name",
    "contact.email": "E-mail",
    "contact.emailPlaceholder": "name@example.com",
    "contact.topic": "Topic",
    "contact.topicPlaceholder": "Choose a topic",
    "contact.topicJob": "Internship or job offer",
    "contact.topicProject": "Project idea",
    "contact.topicCourse": "Course or academic",
    "contact.topicOther": "Other",
    "contact.message": "Message",
    "contact.consent": "I agree that my details will be used only to reply to this message.",
    "contact.submit": "Send",
    "contact.successTitle": "Your message is ready",
    "contact.successText": "Open your e-mail app to send it. If this computer has no e-mail app, copy the text and send it to metmete2003@gmail.com.",
    "contact.openMail": "Open in e-mail app",
    "contact.copy": "Copy the text",
    "contact.copied": "The text was copied to the clipboard.",
    "contact.copyFailed": "Copying did not work; select the text in the form and copy it by hand.",
    "form.nameRequired": "Please enter your name.",
    "form.nameShort": "Your name needs at least {min} characters.",
    "form.emailRequired": "An e-mail address is required.",
    "form.emailInvalid": "Enter a valid e-mail address (e.g. name@example.com).",
    "form.topicRequired": "Choose a topic.",
    "form.messageRequired": "Write your message.",
    "form.messageShort": "Your message needs at least {min} characters; it has {count}.",
    "form.consentRequired": "Tick the consent box before sending.",

    // 404
    "meta.notFound.title": "Page not found — Metehan Ulusoy",
    "notFound.title": "There is no such page",
    "notFound.text": "The page may have moved, or may never have existed.",
    "notFound.back": "Back to the home page",
  },
};

let currentLanguage = readSavedLanguage();

// The Turkish text and attribute values found in the HTML, kept so they can
// be put back when the visitor switches from English to Turkish.
const originalText = new WeakMap();
const originalAttributes = new WeakMap();

function readSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
  } catch (error) {
    // Storage blocked: fall back to Turkish.
  }
  return "tr";
}

/** Returns the text for a key in the current language, filling in {placeholders}. */
function translate(key, values) {
  const table = TRANSLATIONS[currentLanguage] || TRANSLATIONS.tr;
  let text = table[key] ?? TRANSLATIONS.tr[key] ?? key;

  if (values) {
    Object.entries(values).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value));
    });
  }
  return text;
}

/** Like translate(), but picks the singular or plural form for a number ("1 star", "2 stars"). */
function translateCount(baseKey, count, values) {
  const form = new Intl.PluralRules(currentLanguage).select(count) === "one" ? "one" : "other";
  return translate(`${baseKey}.${form}`, { count, ...values });
}

function translatePage() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (!originalText.has(element)) originalText.set(element, element.textContent);

    const english = TRANSLATIONS.en[element.dataset.i18n];
    element.textContent = currentLanguage === "en" && english ? english : originalText.get(element);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    const saved = originalAttributes.get(element) || {};

    element.dataset.i18nAttr.split(",").forEach((pair) => {
      const [attribute, key] = pair.split(":").map((part) => part.trim());
      if (!(attribute in saved)) saved[attribute] = element.getAttribute(attribute) || "";

      const english = TRANSLATIONS.en[key];
      element.setAttribute(attribute, currentLanguage === "en" && english ? english : saved[attribute]);
    });

    originalAttributes.set(element, saved);
  });

  updateLanguageButton();
}

/** The button always offers the other language, labelled in that language. */
function updateLanguageButton() {
  const button = document.querySelector("[data-lang-toggle]");
  if (!button) return;

  const target = currentLanguage === "tr" ? "en" : "tr";
  button.textContent = target.toUpperCase();
  button.lang = target;
  button.setAttribute("aria-label", target === "en" ? "Switch to English" : "Türkçeye geç");
}

function setLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) return;

  currentLanguage = language;
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    // The page still switches; the choice just is not remembered.
  }

  translatePage();
  // Other scripts listen for this and redraw the content they created.
  document.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
}

document.addEventListener("DOMContentLoaded", () => {
  translatePage();

  const button = document.querySelector("[data-lang-toggle]");
  if (button) {
    button.addEventListener("click", () => {
      setLanguage(currentLanguage === "tr" ? "en" : "tr");
    });
  }
});
