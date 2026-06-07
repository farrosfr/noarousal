const deck = document.querySelector(".quote-deck");
const slides = Array.from(document.querySelectorAll("[data-quote-slide]"));
const nextButton = document.querySelector("[data-quote-next]");
const shuffleButton = document.querySelector("[data-quote-shuffle]");
const fullscreenButton = document.querySelector("[data-quote-fullscreen]");
const currentCount = document.querySelector("[data-quote-current]");
let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));

if (activeIndex < 0) activeIndex = 0;

function renderQuote(index) {
  if (!slides.length) return;
  activeIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === activeIndex);
  });
  if (currentCount) currentCount.textContent = String(activeIndex + 1);
}

function nextQuote() {
  renderQuote(activeIndex + 1);
}

function shuffleQuote() {
  if (slides.length < 2) return;
  let nextIndex = activeIndex;
  while (nextIndex === activeIndex) {
    nextIndex = Math.floor(Math.random() * slides.length);
  }
  renderQuote(nextIndex);
}

async function toggleFullscreen() {
  if (!deck || !document.fullscreenEnabled) return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await deck.requestFullscreen();
}

nextButton?.addEventListener("click", nextQuote);
shuffleButton?.addEventListener("click", shuffleQuote);
fullscreenButton?.addEventListener("click", toggleFullscreen);

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = document.fullscreenElement === deck;
  fullscreenButton?.setAttribute("aria-pressed", String(isFullscreen));
  if (fullscreenButton) fullscreenButton.textContent = isFullscreen ? "Exit fullscreen" : "Fullscreen";
});

document.addEventListener("keydown", (event) => {
  if (!deck) return;
  if (event.key === "ArrowRight") nextQuote();
  if (event.key.toLowerCase() === "r") shuffleQuote();
  if (event.key.toLowerCase() === "f") toggleFullscreen();
});

renderQuote(activeIndex);
