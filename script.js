document.addEventListener("DOMContentLoaded", () => {
  // --- 0. SCROLL INERCIAL CON PESO (LENIS) ---
  if (typeof Lenis !== "undefined") {
    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.85,
      smoothWheel: true,
      syncTouch: false 
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const targetId = anchor.getAttribute("href");
        if (targetId === "#") {
          e.preventDefault();
          lenis.scrollTo(0, { duration: 1.4 });
          return;
        }
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          lenis.scrollTo(targetEl, { offset: -40, duration: 1.4 });
        }
      });
    });
  }

  const carousel = document.getElementById("newsCarousel");
  const prevBtn = document.getElementById("carouselPrev");
  const nextBtn = document.getElementById("carouselNext");
  const progressCircle = document.getElementById("springProgressCircle");
  const viewAllTrigger = document.getElementById("viewAllTrigger");

  if (!carousel) return;

  const CIRCUMFERENCE = 276.46;
  const MAX_PULL = 130;
  let holdTimer = null;

  // 1. ACTUALIZAR ESTADO DE FLECHAS (Activa/Desactiva según posición)
  const updateArrows = () => {
    if (!prevBtn || !nextBtn) return;
    prevBtn.disabled = carousel.scrollLeft <= 5;
    const isEnd = Math.ceil(carousel.scrollLeft + carousel.clientWidth) >= carousel.scrollWidth - 5;
    nextBtn.disabled = isEnd;
  };

  carousel.addEventListener("scroll", updateArrows, { passive: true });
  updateArrows();

  const getScrollStep = () => {
    const card = carousel.querySelector(".news-card");
    return card ? card.offsetWidth + 32 : 360;
  };

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      carousel.scrollBy({ left: -getScrollStep(), behavior: "smooth" });
    });

    nextBtn.addEventListener("click", () => {
      carousel.scrollBy({ left: getScrollStep(), behavior: "smooth" });
    });
  }

  // 2. LÓGICA DE MUELLE COMPARTIDA (TÁCTIL + RATÓN AL LLEGAR AL FINAL)
  const applySpringPull = (overscrollDelta) => {
    const pullDistance = Math.min(MAX_PULL, Math.pow(overscrollDelta, 0.78));
    carousel.style.transition = "none";
    carousel.style.transform = `translateX(-${pullDistance}px)`;

    const progress = Math.min(1, pullDistance / (MAX_PULL * 0.85));
    if (progressCircle) {
      progressCircle.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    }

    if (progress >= 1 && !holdTimer) {
      holdTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(25);
        window.location.href = viewAllTrigger.getAttribute("href");
      }, 650);
    } else if (progress < 1 && holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  const resetSpring = () => {
    carousel.style.transition = "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
    carousel.style.transform = "translateX(0px)";
    if (progressCircle) progressCircle.style.strokeDashoffset = "";
    clearTimeout(holdTimer);
    holdTimer = null;
  };

  // 3. ARRASTRE CON RATÓN EN PC (Sin selección ni clics accidentales)
  let isDown = false;
  let startX = 0;
  let initialScrollLeft = 0;
  let hasDragged = false;

  carousel.addEventListener("dragstart", (e) => e.preventDefault());

  carousel.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // Solo clic izquierdo
    isDown = true;
    hasDragged = false;
    carousel.classList.add("is-dragging");
    startX = e.pageX;
    initialScrollLeft = carousel.scrollLeft;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    const deltaX = startX - e.pageX;

    if (Math.abs(deltaX) > 5) {
      hasDragged = true;
    }

    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const targetScroll = initialScrollLeft + deltaX * 1.2;

    if (targetScroll > maxScroll) {
      // Si intenta arrastrar más allá del final en PC, activa el muelle
      carousel.scrollLeft = maxScroll;
      applySpringPull(targetScroll - maxScroll);
    } else {
      carousel.style.transform = "translateX(0px)";
      if (progressCircle) progressCircle.style.strokeDashoffset = "";
      carousel.scrollLeft = targetScroll;
    }
  });

  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    carousel.classList.remove("is-dragging");
    resetSpring();
  });

  // Bloquea el clic en botones/enlaces si el usuario estaba arrastrando el carrusel
  carousel.addEventListener("click", (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // 4. ARRASTRE TÁCTIL EN MÓVIL
  let touchStartX = 0;
  let isPullingTouch = false;

  carousel.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    isPullingTouch = false;
  }, { passive: true });

  carousel.addEventListener("touchmove", (e) => {
    const deltaX = touchStartX - e.touches[0].clientX;
    const isAtRightEnd = Math.ceil(carousel.scrollLeft + carousel.clientWidth) >= carousel.scrollWidth - 4;

    if (isAtRightEnd && deltaX > 0) {
      isPullingTouch = true;
      applySpringPull(deltaX);
    }
  }, { passive: true });

  carousel.addEventListener("touchend", () => {
    if (isPullingTouch) {
      resetSpring();
      isPullingTouch = false;
    }
  });
});