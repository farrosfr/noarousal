import { gsap } from "gsap";

const OLD_PRIVATE_STORAGE_KEY = "noarousal-state-v1";

localStorage.removeItem(OLD_PRIVATE_STORAGE_KEY);

const startDate = new Date(document.body.dataset.start);
const elements = {
  days: document.querySelector("#streakDays"),
  hours: document.querySelector("#streakHours"),
  minutes: document.querySelector("#streakMinutes"),
  seconds: document.querySelector("#streakSeconds")
};
const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primaryNav");
const siteHeader = document.querySelector(".site-header");
let lastScrollY = window.scrollY;
let isHeaderHidden = false;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function render() {
  if (!elements.days || !elements.hours || !elements.minutes || !elements.seconds || Number.isNaN(startDate.getTime())) return;
  const elapsed = formatDuration(Date.now() - startDate.getTime());
  elements.days.textContent = `${elapsed.days} day${elapsed.days === 1 ? "" : "s"}`;
  elements.hours.textContent = String(elapsed.hours).padStart(2, "0");
  elements.minutes.textContent = String(elapsed.minutes).padStart(2, "0");
  elements.seconds.textContent = String(elapsed.seconds).padStart(2, "0");
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-revealed");
  });
});

document.querySelectorAll(".reveal-on-scroll").forEach((element) => observer.observe(element));

function setMenuState(isOpen) {
  const isDesktop = window.matchMedia("(min-width: 761px)").matches;
  document.body.classList.toggle("menu-open", isOpen);
  menuToggle?.setAttribute("aria-expanded", String(isOpen));
  menuToggle?.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  if (isDesktop) {
    gsap.set(primaryNav, { clearProps: "all" });
    return;
  }
  if (isOpen) {
    gsap.set(siteHeader, { yPercent: 0, autoAlpha: 1, clearProps: "transform" });
    isHeaderHidden = false;
    gsap.to(primaryNav, { autoAlpha: 1, scale: 1, duration: 0.28, ease: "power3.out" });
    gsap.fromTo(".nav-links a", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.34, stagger: 0.045, ease: "power3.out" });
  } else {
    gsap.to(primaryNav, { autoAlpha: 0, scale: 0.98, duration: 0.2, ease: "power2.out" });
  }
}

menuToggle?.addEventListener("click", () => {
  setMenuState(!document.body.classList.contains("menu-open"));
});

primaryNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuState(false);
});

window.addEventListener("resize", () => {
  if (window.matchMedia("(min-width: 761px)").matches) setMenuState(false);
});

window.addEventListener("scroll", () => {
  if (!siteHeader || document.body.classList.contains("menu-open")) return;
  const currentScrollY = window.scrollY;
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  if (!isMobile) {
    if (isHeaderHidden) {
      gsap.to(siteHeader, { yPercent: 0, autoAlpha: 1, duration: 0.24, ease: "power2.out", onComplete: () => gsap.set(siteHeader, { clearProps: "transform" }) });
      isHeaderHidden = false;
    }
    lastScrollY = currentScrollY;
    return;
  }
  if (currentScrollY > lastScrollY && currentScrollY > 90 && !isHeaderHidden) {
    gsap.to(siteHeader, { yPercent: -120, autoAlpha: 0, duration: 0.26, ease: "power2.out" });
    isHeaderHidden = true;
  }
  if (currentScrollY < lastScrollY - 6 && isHeaderHidden) {
    gsap.to(siteHeader, { yPercent: 0, autoAlpha: 1, duration: 0.28, ease: "power2.out", onComplete: () => gsap.set(siteHeader, { clearProps: "transform" }) });
    isHeaderHidden = false;
  }
  lastScrollY = Math.max(0, currentScrollY);
}, { passive: true });

if (elements.days && elements.hours && elements.minutes && elements.seconds && !Number.isNaN(startDate.getTime())) {
  setInterval(render, 1000);
  render();
}
