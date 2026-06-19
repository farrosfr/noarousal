const tabBar = document.querySelector("[data-tab-bar]");
if (tabBar) {
  const triggers = tabBar.querySelectorAll("[data-tab-trigger]");
  const panels = document.querySelectorAll("[data-tab-panel]");

  const activate = (id) => {
    triggers.forEach((trigger) => {
      const isActive = trigger.getAttribute("data-tab-trigger") === id;
      trigger.classList.toggle("is-active", isActive);
      trigger.setAttribute("aria-selected", String(isActive));
    });
    panels.forEach((panel) => {
      const isActive = panel.getAttribute("data-tab-panel") === id;
      panel.classList.toggle("is-active", isActive);
      if (isActive) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    });
    if (history.replaceState) {
      history.replaceState(null, "", `#${id}`);
    }
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      activate(trigger.getAttribute("data-tab-trigger"));
    });
  });

  const hash = window.location.hash.replace("#", "");
  if (hash && Array.from(panels).some((p) => p.getAttribute("data-tab-panel") === hash)) {
    activate(hash);
  }
}
