/*
 * Contact form: validation in JavaScript with the error shown next to each
 * field, a draft kept in localStorage, and a confirmation once the message
 * is ready. Uses translate() from i18n.js.
 *
 * The site is static, so there is no server to receive the message. A valid
 * message is handed to the visitor's e-mail app through a mailto: link, and
 * can be copied instead when the computer has no e-mail app.
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  // JavaScript takes over the validation, so the browser's own error bubbles
  // are switched off here rather than in the HTML.
  form.noValidate = true;

  const DRAFT_KEY = "contact-draft";
  const DRAFT_LIFETIME_HOURS = 24;
  const RECIPIENT = "metmete2003@gmail.com";
  // type="email" alone accepts "name@host"; this also asks for a dot and a domain ending.
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const nameField = form.elements.name;
  const emailField = form.elements.email;
  const topicField = form.elements.topic;
  const messageField = form.elements.message;
  const consentField = form.elements.consent;
  const fields = [nameField, emailField, topicField, messageField, consentField];

  const charCount = form.querySelector("[data-char-count]");
  const draftNote = form.querySelector("[data-draft-note]");
  const clearDraftButton = form.querySelector("[data-clear-draft]");
  const successBox = form.querySelector("[data-form-success]");
  const successName = form.querySelector("[data-success-name]");
  const mailLink = form.querySelector("[data-mailto]");
  const copyButton = form.querySelector("[data-copy-message]");
  const copyStatus = form.querySelector("[data-copy-status]");

  /* ---------- Validation ---------- */

  /** Returns the key of the error message for a field, or "" when the field is valid. */
  function findError(field) {
    const value = field.type === "checkbox" ? field.checked : field.value.trim();

    switch (field.name) {
      case "name":
        if (!value) return "form.nameRequired";
        if (value.length < field.minLength) return "form.nameShort";
        return "";
      case "email":
        if (!value) return "form.emailRequired";
        if (field.validity.typeMismatch || !EMAIL_PATTERN.test(value)) return "form.emailInvalid";
        return "";
      case "topic":
        return value ? "" : "form.topicRequired";
      case "message":
        if (!value) return "form.messageRequired";
        if (value.length < field.minLength) return "form.messageShort";
        return "";
      case "consent":
        return value ? "" : "form.consentRequired";
      default:
        return "";
    }
  }

  /** Writes (or clears) the message under a field and marks the field for screen readers. */
  function showFieldError(field, errorKey) {
    const errorElement = document.getElementById(`${field.id}-error`);
    errorElement.textContent = errorKey
      ? translate(errorKey, { min: field.minLength, count: field.value.trim().length })
      : "";

    field.setAttribute("aria-invalid", String(Boolean(errorKey)));
    field.closest(".field").classList.toggle("has-error", Boolean(errorKey));
  }

  function validateField(field) {
    const errorKey = findError(field);
    showFieldError(field, errorKey);
    return errorKey === "";
  }

  /** Counts the same way as the validation: spaces at the start and end do not count. */
  function updateCharCount() {
    charCount.textContent = String(messageField.value.trim().length);
  }

  /* ---------- Draft in localStorage ---------- */

  function saveDraft() {
    const draft = {
      name: nameField.value,
      email: emailField.value,
      topic: topicField.value,
      message: messageField.value,
    };
    const isEmpty = Object.values(draft).every((value) => value.trim() === "");

    try {
      if (isEmpty) {
        localStorage.removeItem(DRAFT_KEY);
      } else {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
      }
    } catch (error) {
      // Without storage the form still works; the draft is just not kept.
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      // Nothing to clear.
    }
    draftNote.hidden = true;
  }

  function restoreDraft() {
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    } catch (error) {
      draft = null;
    }
    if (!draft) return;

    // A draft is personal data: on a shared computer it should not wait for the next person.
    const ageInHours = (Date.now() - (draft.savedAt || 0)) / (1000 * 60 * 60);
    if (ageInHours > DRAFT_LIFETIME_HOURS) {
      clearDraft();
      return;
    }

    nameField.value = draft.name || "";
    emailField.value = draft.email || "";
    messageField.value = draft.message || "";

    const topicExists = Array.from(topicField.options).some((option) => option.value === draft.topic);
    if (topicExists) topicField.value = draft.topic;

    draftNote.hidden = false;
  }

  function resetForm() {
    form.reset();
    fields.forEach((field) => {
      showFieldError(field, "");
      delete field.dataset.touched;
    });
    updateCharCount();
    clearDraft();
  }

  /* ---------- Submit ---------- */

  function buildMessage() {
    const topicLabel = topicField.options[topicField.selectedIndex].textContent;
    const name = nameField.value.trim();
    return {
      subject: `${topicLabel}: ${name}`,
      body: `${messageField.value.trim()}\n\n${name}\n${emailField.value.trim()}`,
    };
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const invalidFields = fields.filter((field) => !validateField(field));
    if (invalidFields.length > 0) {
      successBox.hidden = true;
      invalidFields[0].focus();
      return;
    }

    // The form is not cleared here: the message has not been sent yet, and
    // the visitor may still need the text if no e-mail app opens.
    const { subject, body } = buildMessage();
    // The name comes from the visitor, so it goes in with textContent and is never parsed as HTML.
    successName.textContent = nameField.value.trim();
    mailLink.href = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    copyStatus.textContent = "";
    successBox.hidden = false;
    successBox.focus();
  });

  // Opening the e-mail app counts as sending, so the saved draft is no longer needed.
  mailLink.addEventListener("click", () => {
    clearDraft();
  });

  // No e-mail app on this computer? The message can be copied instead.
  copyButton.addEventListener("click", async () => {
    const { subject, body } = buildMessage();
    try {
      await navigator.clipboard.writeText(`${RECIPIENT}\n${subject}\n\n${body}`);
      copyStatus.textContent = translate("contact.copied");
    } catch (error) {
      copyStatus.textContent = translate("contact.copyFailed");
    }
  });

  /* ---------- Feedback while typing ---------- */

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      field.dataset.touched = "true";
      successBox.hidden = true;

      // An error disappears as soon as the field becomes valid.
      if (field.getAttribute("aria-invalid") === "true") validateField(field);
      saveDraft();
    });

    // A field is checked when the visitor leaves it, but only once they have typed in it.
    field.addEventListener("blur", () => {
      if (field.dataset.touched === "true") validateField(field);
    });
  });

  messageField.addEventListener("input", updateCharCount);

  clearDraftButton.addEventListener("click", () => {
    resetForm();
    nameField.focus();
  });

  // Errors already on screen are rewritten in the new language.
  document.addEventListener("languagechange", () => {
    fields.forEach((field) => {
      if (field.getAttribute("aria-invalid") === "true") validateField(field);
    });
  });

  restoreDraft();
  updateCharCount();
});
