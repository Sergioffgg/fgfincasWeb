document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================================
     1. SCROLL INERCIAL CON PESO (LENIS) Y ANCLAS ENTRE PÁGINAS
     ========================================================================== */
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

    // Si llegamos desde otra página con un #hash (ej. contacto.html -> index.html#noticias)
    if (window.location.hash) {
      const targetEl = document.querySelector(window.location.hash);
      if (targetEl) {
        window.scrollTo(0, 0);
        setTimeout(() => {
          lenis.scrollTo(targetEl, { offset: -40, duration: 1.5 });
        }, 120);
      }
    }

    // Desplazamiento suave para enlaces internos dentro de la misma página
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

  /* ==========================================================================
     2. PLANTILLA HTML Y TRAZADO SVG PARA NOTICIAS E HISTORIAL
     ========================================================================== */
  const createNewsCardHTML = (item) => {
    const urgentClass = item.urgente ? " is-urgent" : "";
    const tagsHTML = (item.etiquetas || [])
      .map((tag) => `<span class="news-tag">${tag}</span>`)
      .join("");

    return `
      <article class="news-card${urgentClass}">
        <div class="news-preview">
          <span class="pdf-badge">PDF</span>
          <img src="${item.imagen}" alt="Vista previa ${item.titulo}" class="news-doc-img" loading="lazy">
          <a href="${item.pdf}" target="_blank" rel="noopener" class="news-preview-link" aria-label="Abrir ${item.titulo}"></a>
          <div class="news-actions-overlay">
            <a href="${item.pdf}" target="_blank" rel="noopener" class="action-btn btn-open">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Abrir
            </a>
            <a href="${item.pdf}" download class="action-btn btn-download">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Descargar
            </a>
          </div>
        </div>
        <div class="news-glass-body">
          <time class="news-date">${item.fecha}</time>
          <h3 class="news-title">${item.titulo}</h3>
          <div class="news-tags">${tagsHTML}</div>
        </div>
      </article>
    `;
  };

  // Dibuja la línea vertical continua con picos de 45º en news.html
    const renderDocsTimeline = () => {
      const docsTimeline = document.getElementById("docsTimeline");
      const docsTimelinePath = document.getElementById("docsTimelinePath");
      if (!docsTimeline || !docsTimelinePath) return;

      const markers = Array.from(docsTimeline.querySelectorAll(".docs-month-marker"));
      if (!markers.length) return;

      const timelineRect = docsTimeline.getBoundingClientRect();
      const totalH = docsTimeline.offsetHeight;
      const baseX = 3;
      const tipSize = 11;
      const tipSpan = 12;

      let d = `M ${baseX},0`;

      markers.forEach((marker) => {
        const mRect = marker.getBoundingClientRect();
        const centerY = (mRect.top - timelineRect.top) + mRect.height / 2;
        const topShoulder = Math.max(0, centerY - tipSpan);
        const bottomShoulder = Math.min(totalH, centerY + tipSpan);

        d += ` L ${baseX},${topShoulder} L ${baseX + tipSize},${centerY} L ${baseX},${bottomShoulder}`;
      });

      d += ` L ${baseX},${totalH}`;
      docsTimelinePath.setAttribute("d", d);
    };

  /* ==========================================================================
     3. CARGA AUTOMÁTICA DESDE noticias.json (PORTADA + HISTORIAL)
     ========================================================================== */
  const carousel = document.getElementById("newsCarousel");
  const prevBtn = document.getElementById("carouselPrev");
  const nextBtn = document.getElementById("carouselNext");

  const updateCarouselArrows = () => {
    if (!carousel || !prevBtn || !nextBtn) return;
    prevBtn.disabled = carousel.scrollLeft <= 5;
    const isEnd = Math.ceil(carousel.scrollLeft + carousel.clientWidth) >= carousel.scrollWidth - 5;
    nextBtn.disabled = isEnd;
  };

  const loadNoticiasJSON = async () => {
    const docsMonthsList = document.getElementById("docsMonthsList");
    if (!carousel && !docsMonthsList) return;

    try {
      const response = await fetch(`noticias.json?v=${Date.now()}`);
      if (!response.ok) throw new Error("No se pudo cargar noticias.json");
      const noticias = await response.json();

      // A) PORTADA (index.html): pinta las 4 últimas noticias antes del CTA final
      if (carousel) {
        carousel.querySelectorAll(".news-card").forEach((el) => el.remove());

        const endCta = document.getElementById("carouselEndCta");
        const latestFour = noticias.slice(0, 4);
        const cardsHTML = latestFour.map(createNewsCardHTML).join("");

        if (endCta) {
          endCta.insertAdjacentHTML("beforebegin", cardsHTML);
        } else {
          carousel.insertAdjacentHTML("afterbegin", cardsHTML);
        }

        // Fuerza que el carrusel empiece siempre en la primera tarjeta (izquierda)
        carousel.scrollTo({ left: 0, behavior: "instant" });
        requestAnimationFrame(() => {
          carousel.scrollLeft = 0;
          updateCarouselArrows();
        });
      }

      // B) HISTORIAL (news.html): agrupa por Año + Mes y dibuja los picos de 45º
      if (docsMonthsList) {
        const groups = [];
        const groupMap = new Map();

        noticias.forEach((item) => {
          const key = `${item.anio}-${item.mes}`;
          if (!groupMap.has(key)) {
            const group = { anio: item.anio, mes: item.mes, items: [] };
            groupMap.set(key, group);
            groups.push(group);
          }
          groupMap.get(key).items.push(item);
        });

        let lastRenderedYear = null;
        docsMonthsList.innerHTML = groups
          .map((group) => {
            const showYear = group.mes.toLowerCase() === "enero" || group.anio !== lastRenderedYear;
            lastRenderedYear = group.anio;

            const titleHTML = showYear
              ? `<span class="docs-year">${group.anio}</span><span class="docs-year-sep">|</span><span>${group.mes}</span>`
              : `<span>${group.mes}</span>`;

            return `
              <section class="docs-month-group">
                <div class="docs-month-marker">
                  <h2 class="docs-month-title">${titleHTML}</h2>
                </div>
                <div class="docs-cards-grid">
                  ${group.items.map(createNewsCardHTML).join("")}
                </div>
              </section>
            `;
          })
          .join("");

        requestAnimationFrame(renderDocsTimeline);
      }
    } catch (error) {
      console.error("Error cargando noticias.json:", error);
    }
  };

  loadNoticiasJSON();
  window.addEventListener("resize", renderDocsTimeline);
  window.addEventListener("load", renderDocsTimeline);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(renderDocsTimeline);
  }

  /* ==========================================================================
     4. INTERACCIÓN DEL CARRUSEL DE NOTICIAS (SOLO EN index.html)
     ========================================================================== */
  if (carousel) {
    const progressCircle = document.getElementById("springProgressCircle");
    const viewAllTrigger = document.getElementById("viewAllTrigger");
    const CIRCUMFERENCE = 276.46;
    const MAX_PULL = 130;
    let holdTimer = null;

    carousel.addEventListener("scroll", updateCarouselArrows, { passive: true });
    updateCarouselArrows();

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

    // Física de muelle al tirar más allá del último elemento
    const applySpringPull = (overscrollDelta) => {
      const pullDistance = Math.min(MAX_PULL, Math.pow(overscrollDelta, 0.78));
      carousel.style.transition = "none";
      carousel.style.transform = `translateX(-${pullDistance}px)`;

      const progress = Math.min(1, pullDistance / (MAX_PULL * 0.85));
      if (progressCircle) {
        progressCircle.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
      }

      if (progress >= 1 && !holdTimer && viewAllTrigger) {
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

    // Arrastre con ratón (PC)
    let isDown = false;
    let startX = 0;
    let initialScrollLeft = 0;
    let hasDragged = false;

    carousel.addEventListener("dragstart", (e) => e.preventDefault());

    carousel.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      carousel.classList.add("is-dragging");
      startX = e.pageX;
      initialScrollLeft = carousel.scrollLeft;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      const deltaX = startX - e.pageX;
      if (Math.abs(deltaX) > 5) hasDragged = true;

      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      const targetScroll = initialScrollLeft + deltaX * 1.2;

      if (targetScroll > maxScroll) {
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

    carousel.addEventListener("click", (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Arrastre táctil (Móvil / Tablet)
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
  }

document.addEventListener('click', (e) => {
  if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

  const clickedAction = e.target.closest('.action-btn');
  const clickedPreview = e.target.closest('.news-preview');
  const clickedCard = e.target.closest('.news-card');

  // 1. Si pulsa en "Abrir" o "Descargar": solo dejamos pasar si la tarjeta ya estaba abierta de antes (evita clics fantasma en el mismo toque)
  if (clickedAction) {
    const isAlreadyOpen = clickedCard && clickedCard.classList.contains('is-active');
    const openedJustNow = clickedCard && (Date.now() - Number(clickedCard.dataset.activatedAt || 0) < 350);

    if (!isAlreadyOpen || openedJustNow) {
      e.preventDefault();
      e.stopPropagation();
    }
    return;
  }

  // 2. Cierra todas las tarjetas abiertas excepto la que acabamos de tocar en su imagen
  document.querySelectorAll('.news-card.is-active').forEach((card) => {
    if (card !== clickedCard || !clickedPreview) {
      card.classList.remove('is-active');
      delete card.dataset.activatedAt;
    }
  });

  // 3. Si tocó dentro de la imagen (.news-preview) de una tarjeta cerrada, la abre
  if (clickedPreview && clickedCard && !clickedCard.classList.contains('is-active')) {
    clickedCard.classList.add('is-active');
    clickedCard.dataset.activatedAt = String(Date.now());
  }
});

  /* ==========================================================================
     5. PESTAÑAS DE CONTACTO, LÍNEA ANIMADA Y BOTONES PÍLDORA (SOLO contacto.html)
     ========================================================================== */
  const contactTabs = document.getElementById("contactTabs");
  if (contactTabs) {
    const bubbles = Array.from(contactTabs.querySelectorAll(".contact-bubble"));
    const panels = Array.from(contactTabs.querySelectorAll(".contact-tab-panel"));
    const track = contactTabs.querySelector(".contact-pointer-track");
    const pathEl = document.getElementById("contactPointerPath");

    let currentPeak = null;
    let targetPeak = null;
    let animFrameId = null;

    const isMobileLayout = () => window.innerWidth <= 768;

    const getBubbleCenter = (bubble) => {
      const trackRect = track.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();
      return isMobileLayout()
        ? (bubbleRect.left - trackRect.left) + bubbleRect.width / 2
        : (bubbleRect.top - trackRect.top) + bubbleRect.height / 2;
    };

    const drawPointerPath = (pos) => {
      const w = track.clientWidth;
      const h = track.clientHeight;
      const tipSize = 11;
      const tipSpan = 12;

      if (isMobileLayout()) {
        const baseY = 3;
        const leftShoulder = Math.max(0, pos - tipSpan);
        const rightShoulder = Math.min(w, pos + tipSpan);
        const d = `M 0,${baseY} L ${leftShoulder},${baseY} L ${pos},${baseY + tipSize} L ${rightShoulder},${baseY} L ${w},${baseY}`;
        pathEl.setAttribute("d", d);
      } else {
        const baseX = w - 3;
        const topShoulder = Math.max(0, pos - tipSpan);
        const bottomShoulder = Math.min(h, pos + tipSpan);
        const d = `M ${baseX},0 L ${baseX},${topShoulder} L ${baseX - tipSize},${pos} L ${baseX},${bottomShoulder} L ${baseX},${h}`;
        pathEl.setAttribute("d", d);
      }
    };

    const animatePointer = () => {
      if (currentPeak === null) {
        currentPeak = targetPeak;
        drawPointerPath(currentPeak);
        return;
      }

      const diff = targetPeak - currentPeak;
      if (Math.abs(diff) < 0.25) {
        currentPeak = targetPeak;
        drawPointerPath(currentPeak);
        animFrameId = null;
        return;
      }

      currentPeak += diff * 0.18;
      drawPointerPath(currentPeak);
      animFrameId = requestAnimationFrame(animatePointer);
    };

    const activateBubble = (bubble, instant = false) => {
      const targetId = bubble.getAttribute("data-tab");

      bubbles.forEach((b) => {
        const active = b === bubble;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach((panel) => {
        const match = panel.id === `panel-${targetId}`;
        if (match) {
          panel.hidden = false;
          panel.classList.remove("is-active");
          void panel.offsetWidth;
          panel.classList.add("is-active");
        } else {
          panel.hidden = true;
          panel.classList.remove("is-active");
        }
      });

      targetPeak = getBubbleCenter(bubble);
      if (instant) {
        currentPeak = targetPeak;
        drawPointerPath(currentPeak);
      } else if (!animFrameId) {
        animFrameId = requestAnimationFrame(animatePointer);
      }
    };

    bubbles.forEach((bubble) => {
      bubble.addEventListener("click", () => activateBubble(bubble, false));
    });

    const initialActive = bubbles.find((b) => b.classList.contains("is-active")) || bubbles[0];
    requestAnimationFrame(() => activateBubble(initialActive, true));

    window.addEventListener("resize", () => {
      const active = bubbles.find((b) => b.classList.contains("is-active")) || bubbles[0];
      activateBubble(active, true);
    });

    // Botón 1: Copiar al portapapeles
    contactTabs.querySelectorAll(".pill-btn[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const value = btn.getAttribute("data-copy");
        const textEl = btn.querySelector(".pill-text");
        const defaultLabel = textEl.getAttribute("data-default") || "Copiar";

        try {
          await navigator.clipboard.writeText(value);
          btn.classList.add("is-copied");
          textEl.textContent = "¡Copiado!";

          setTimeout(() => {
            btn.classList.remove("is-copied");
            textEl.textContent = defaultLabel;
          }, 1800);
        } catch (err) {
          console.error("Error al copiar:", err);
        }
      });
    });

    // Botón 2: Desplegable QR hacia arriba
    contactTabs.querySelectorAll(".pill-qr").forEach((qrBtn) => {
      qrBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !qrBtn.classList.contains("is-open");

        contactTabs.querySelectorAll(".pill-qr.is-open").forEach((other) => {
          other.classList.remove("is-open");
          other.setAttribute("aria-expanded", "false");
        });

        qrBtn.classList.toggle("is-open", willOpen);
        qrBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    });

    document.addEventListener("click", () => {
      contactTabs.querySelectorAll(".pill-qr.is-open").forEach((qrBtn) => {
        qrBtn.classList.remove("is-open");
        qrBtn.setAttribute("aria-expanded", "false");
      });
    });

    // Botón 3: Saltar a la pestaña de horarios
    contactTabs.querySelectorAll(".pill-btn[data-goto-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-goto-tab");
        const targetBubble = bubbles.find((b) => b.getAttribute("data-tab") === targetTab);
        if (targetBubble) {
          activateBubble(targetBubble, false);
        }
      });
    });
  }
});