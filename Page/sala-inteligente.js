function route() {
  const sections = Array.from(document.querySelectorAll("main > .view"));
  if (sections.length === 0) return;

  const availableIds = sections.map((section) => section.id);
  let hash = (location.hash || "").slice(1);
  if (!availableIds.includes(hash)) hash = availableIds[0];

  sections.forEach((section) => {
    section.classList.toggle("on", section.id === hash);
  });
  document.querySelectorAll("#nav a").forEach((link) => {
    const hasView = availableIds.includes(link.dataset.v);
    link.hidden = !hasView;
    link.classList.toggle("on", link.dataset.v === hash);
  });
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
document.querySelectorAll(".sw").forEach((button) => {
  button.addEventListener("click", () => button.classList.toggle("on"));
});