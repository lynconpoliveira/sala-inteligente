const ids = ["painel", "horarios", "ambiente", "projetos", "sobre"];

function route() {
  let hash = (location.hash || "").slice(1);
  if (!ids.includes(hash)) hash = "painel";

  ids.forEach((id) => {
    document.getElementById(id).classList.toggle("on", id === hash);
  });
  document.querySelectorAll("#nav a").forEach((link) => {
    link.classList.toggle("on", link.dataset.v === hash);
  });
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
document.querySelectorAll(".sw").forEach((button) => {
  button.addEventListener("click", () => button.classList.toggle("on"));
});
