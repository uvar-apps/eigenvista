/* Progressive enhancement: every document and download works without this file. */
(() => {
  const root = document.documentElement;
  const siteBase = new URL("../", document.currentScript.src);
  const themeButton = document.querySelector("[data-theme-toggle]");
  const preferredDark = () =>
    matchMedia("(prefers-color-scheme: dark)").matches;
  const currentTheme = () =>
    root.dataset.theme || (preferredDark() ? "dark" : "light");
  const updateThemeButton = () => {
    if (!themeButton) return;
    const dark = currentTheme() === "dark";
    themeButton.textContent = dark ? "Light" : "Dark";
    themeButton.setAttribute(
      "aria-label",
      dark ? "Switch to light color theme" : "Switch to dark color theme",
    );
  };
  try {
    const saved = localStorage.getItem("eigenvista-site-theme");
    if (["light", "dark"].includes(saved)) root.dataset.theme = saved;
  } catch {
    /* Theme preference is optional when storage is unavailable. */
  }
  if (themeButton) {
    themeButton.hidden = false;
    updateThemeButton();
    themeButton.addEventListener("click", () => {
      root.dataset.theme = currentTheme() === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("eigenvista-site-theme", root.dataset.theme);
      } catch {
        /* Session-only fallback. */
      }
      updateThemeButton();
    });
  }

  for (const figure of document.querySelectorAll("[data-comparison]")) {
    const input = figure.querySelector('input[type="range"]');
    const after = figure.querySelector(".comparison-after");
    const output = figure.querySelector("output");
    const control = figure.querySelector(".comparison-control");
    if (!input || !after || !output || !control) continue;
    const reveal = () => {
      const value = Math.max(0, Math.min(100, Number(input.value)));
      after.style.clipPath = `inset(0 0 0 ${100 - value}%)`;
      figure.style.setProperty("--reveal-edge", `${100 - value}%`);
      output.value = `${value}%`;
      input.setAttribute(
        "aria-valuetext",
        `${value}% ambient occlusion view revealed`,
      );
    };
    figure.classList.add("is-ready");
    control.hidden = false;
    input.addEventListener("input", reveal);
    reveal();
  }

  const filters = document.querySelector("[data-gallery-filters]");
  if (filters) {
    filters.hidden = false;
    const items = [...document.querySelectorAll("[data-gallery-item]")];
    const buttons = [...filters.querySelectorAll("[data-filter]")];
    const status = filters.querySelector("[data-gallery-status]");
    const filter = (selected) => {
      let count = 0;
      for (const item of items) {
        item.hidden = selected !== "all" && item.dataset.category !== selected;
        if (!item.hidden) count++;
      }
      for (const button of buttons)
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.filter === selected),
        );
      if (status)
        status.textContent = `${count} ${count === 1 ? "view" : "views"}`;
    };
    for (const button of buttons)
      button.addEventListener("click", () => filter(button.dataset.filter));
    filter("all");
  }

  const dialog = document.querySelector("[data-search-dialog]");
  const openButton = document.querySelector("[data-search-open]");
  if (!dialog || !openButton || typeof dialog.showModal !== "function") return;
  const input = dialog.querySelector('input[type="search"]');
  const results = dialog.querySelector("[data-search-results]");
  const status = dialog.querySelector("[data-search-status]");
  let index;
  let pending;
  let lastFocus;
  const load = () => {
    if (!pending)
      pending = fetch(new URL("search-index.json", siteBase))
        .then((response) => {
          if (!response.ok) throw Error("Search index unavailable");
          return response.json();
        })
        .then((value) => {
          index = value;
        })
        .catch(() => {
          pending = undefined;
          status.textContent =
            "Search is unavailable. Use the Manual or Tutorials links to browse.";
        });
    return pending;
  };
  const search = () => {
    results.replaceChildren();
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      status.textContent = "Type to search.";
      return;
    }
    if (!index) return;
    const matches = index
      .filter((page) =>
        words.every((word) =>
          `${page.title} ${page.description} ${page.text}`
            .toLowerCase()
            .includes(word),
        ),
      )
      .sort(
        (a, b) =>
          Number(words.every((word) => b.title.toLowerCase().includes(word))) -
          Number(words.every((word) => a.title.toLowerCase().includes(word))),
      )
      .slice(0, 12);
    status.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? "topic" : "topics"} found.`
      : "No matching topics. Try a shorter term, or browse the manual.";
    for (const page of matches) {
      const row = document.createElement("li");
      const link = document.createElement("a");
      link.href = new URL(page.url, siteBase).href;
      const title = document.createElement("strong");
      title.textContent = page.title;
      const description = document.createElement("p");
      description.textContent = page.description;
      link.append(title, description);
      row.append(link);
      results.append(row);
    }
  };
  const open = async (event) => {
    if (dialog.open) return;
    lastFocus =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : document.activeElement;
    dialog.showModal();
    input.focus();
    await load();
    if (index) search();
  };
  openButton.hidden = false;
  openButton.addEventListener("click", open);
  dialog
    .querySelector("[data-search-close]")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => lastFocus?.focus());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !event.isComposing) {
      event.preventDefault();
      dialog.close();
    }
  });
  input.addEventListener("input", search);
  document.addEventListener("keydown", (event) => {
    const editing =
      event.target instanceof HTMLElement &&
      (event.target.matches("input,textarea,select") ||
        event.target.isContentEditable);
    if (
      event.key === "/" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !editing &&
      !dialog.open
    ) {
      event.preventDefault();
      open();
    }
  });
})();
