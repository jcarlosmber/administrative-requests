const fs = require('fs');

const basePath = 'c:/Users/jcarl/.gemini/antigravity/scratch/Linguadigato';

// 1. ACTUALIZAR content.css CON ANIMACIÓN DE SUBTÍTULO REVELADO
let css = fs.readFileSync(`${basePath}/content.css`, 'utf8');
if (!css.includes('lg-revealed-momentary')) {
  css += `

/* =========================================================================
   REVELADO MOMENTÁNEO DE SUBTÍTULO AL SELECCIONAR PALABRA
   ========================================================================= */
.lg-sub-secondary.lg-revealed-momentary {
  animation: lgFadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
  color: #fbbf24 !important;
  text-shadow: 0 0 12px rgba(251, 191, 36, 0.5) !important;
}

@keyframes lgFadeInSlide {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
  fs.writeFileSync(`${basePath}/content.css`, css, 'utf8');
  console.log('✓ content.css actualizado con estilos de revelado momentáneo');
}

// 2. ACTUALIZAR content.js
let js = fs.readFileSync(`${basePath}/content.js`, 'utf8');

// Añadir momentaryPauseTimeout en variables de encabezado si no existe
if (!js.includes('let momentaryPauseTimeout = null;')) {
  js = js.replace('let hoverHideTimeout = null;', 'let hoverHideTimeout = null;\n  let momentaryPauseTimeout = null;');
  console.log('✓ Variable momentaryPauseTimeout agregada');
}

// Añadir revealSecondarySubtitle y hideRevealedSecondarySubtitle
if (!js.includes('function revealSecondarySubtitle()')) {
  const subtitleRevealHelpers = `  // Revelar subtítulo traducido momentáneamente al seleccionar una palabra
  function revealSecondarySubtitle() {
    const secSub = document.getElementById("lg-sub-secondary");
    const divSub = document.getElementById("lgSubDivider");
    if (secSub) {
      secSub.style.display = "block";
      secSub.classList.add("lg-revealed-momentary");
    }
    if (divSub) divSub.style.display = "block";
  }

  function hideRevealedSecondarySubtitle() {
    const secSub = document.getElementById("lg-sub-secondary");
    const divSub = document.getElementById("lgSubDivider");
    if (settings.dualSubtitles === false) {
      if (secSub) {
        secSub.style.display = "none";
        secSub.classList.remove("lg-revealed-momentary");
      }
      if (divSub) divSub.style.display = "none";
    } else {
      if (secSub) secSub.classList.remove("lg-revealed-momentary");
    }
  }
`;
  js = js.replace('function hideFloatingPopupAndResume() {', `${subtitleRevealHelpers}\n  function hideFloatingPopupAndResume() {`);
  console.log('✓ Funciones revealSecondarySubtitle y hideRevealedSecondarySubtitle añadidas');
}

// Actualizar hideFloatingPopupAndResume para limpiar momentaryPauseTimeout y ocultar subtítulo revelado
const oldHidePopup = `  function hideFloatingPopupAndResume() {
    clearTimeout(hoverHideTimeout);
    const popup = document.getElementById("lg-floating-popup");
    if (popup) popup.style.display = "none";
    isPopupPinned = false;
    isHoveringWordOrPopup = false;

    // Si el video fue pausado por hover, reanudar fluidamente
    if (wasPlayingBeforeHover) {
      wasPlayingBeforeHover = false;
      if (activeVideoElement) {
        activeVideoElement.play();
      }
      window.postMessage({ type: "LG_PLAYER_PLAY" }, "*");
    }
  }`;

const newHidePopup = `  function hideFloatingPopupAndResume() {
    clearTimeout(hoverHideTimeout);
    clearTimeout(momentaryPauseTimeout);
    const popup = document.getElementById("lg-floating-popup");
    if (popup) popup.style.display = "none";
    isPopupPinned = false;
    isHoveringWordOrPopup = false;
    hideRevealedSecondarySubtitle();

    // Si el video fue pausado por hover o selección de palabra, reanudar fluidamente
    if (wasPlayingBeforeHover) {
      wasPlayingBeforeHover = false;
      if (activeVideoElement) {
        activeVideoElement.play().catch(() => {});
      }
      window.postMessage({ type: "LG_PLAYER_PLAY" }, "*");
    }
  }`;

if (js.includes(oldHidePopup)) {
  js = js.replace(oldHidePopup, newHidePopup);
  console.log('✓ hideFloatingPopupAndResume actualizado');
} else {
  // En caso de leves diferencias de formato
  js = js.replace(/function hideFloatingPopupAndResume\(\) \{[\s\S]*?window\.postMessage\(\{ type: "LG_PLAYER_PLAY" \}, "\*"\);\s*\}/, newHidePopup.trim());
  console.log('✓ hideFloatingPopupAndResume actualizado con regex');
}

// Actualizar eventos de span (.lg-word) para pausar momentáneamente y revelar subtítulo
const oldWordListeners = `        // 1. Pasar mouse sobre palabra: PAUSA EL VIDEO y muestra la traducción instantáneamente sin clic
        span.addEventListener("mouseenter", () => {
          clearTimeout(hoverHideTimeout);
          isHoveringWordOrPopup = true;

          // Si el video está reproduciéndose, pausarlo y registrar que fue por hover
          if (activeVideoElement && !activeVideoElement.paused) {
            wasPlayingBeforeHover = true;
            activeVideoElement.pause();
            window.postMessage({ type: "LG_PLAYER_PAUSE" }, "*");
          }

          const rect = span.getBoundingClientRect();
          showFloatingPopup(token, rect, currentSentence, false);
        });

        // 2. Quitar mouse de la palabra: oculta la traducción y despausa el video automáticamente
        span.addEventListener("mouseleave", () => {
          isHoveringWordOrPopup = false;
          if (!isPopupPinned) {
            clearTimeout(hoverHideTimeout);
            hoverHideTimeout = setTimeout(() => {
              if (!isHoveringWordOrPopup && !isPopupPinned) {
                hideFloatingPopupAndResume();
              }
            }, 160);
          }
        });

        // 3. Clic opcional en palabra: fija el popup y pronuncia en voz alta
        span.addEventListener("click", (e) => {
          e.stopPropagation();
          isPopupPinned = true;
          clearTimeout(hoverHideTimeout);
          if (activeVideoElement && !activeVideoElement.paused) {
            wasPlayingBeforeHover = false;
            activeVideoElement.pause();
            window.postMessage({ type: "LG_PLAYER_PAUSE" }, "*");
          }
          const rect = span.getBoundingClientRect();
          showFloatingPopup(token, rect, currentSentence, true);
        });`;

const newWordListeners = `        // 1. Pasar mouse sobre palabra: PAUSA MOMENTÁNEA y muestra el subtítulo y traducción
        span.addEventListener("mouseenter", () => {
          clearTimeout(hoverHideTimeout);
          clearTimeout(momentaryPauseTimeout);
          isHoveringWordOrPopup = true;

          // Si el video está reproduciéndose, pausarlo momentáneamente
          if (activeVideoElement && !activeVideoElement.paused) {
            wasPlayingBeforeHover = true;
            activeVideoElement.pause();
            window.postMessage({ type: "LG_PLAYER_PAUSE" }, "*");
          }

          revealSecondarySubtitle();
          const rect = span.getBoundingClientRect();
          showFloatingPopup(token, rect, currentSentence, false);
        });

        // 2. Quitar mouse de la palabra: oculta la traducción y despausa el video automáticamente
        span.addEventListener("mouseleave", () => {
          isHoveringWordOrPopup = false;
          clearTimeout(hoverHideTimeout);
          hoverHideTimeout = setTimeout(() => {
            if (!isHoveringWordOrPopup) {
              hideFloatingPopupAndResume();
            }
          }, 280);
        });

        // 3. Clic o selección en palabra: pausa momentánea, muestra subtítulo y reproduce pronunciación
        span.addEventListener("click", (e) => {
          e.stopPropagation();
          clearTimeout(hoverHideTimeout);
          clearTimeout(momentaryPauseTimeout);
          isHoveringWordOrPopup = true;

          if (activeVideoElement && !activeVideoElement.paused) {
            wasPlayingBeforeHover = true;
            activeVideoElement.pause();
            window.postMessage({ type: "LG_PLAYER_PAUSE" }, "*");
          }

          revealSecondarySubtitle();
          const rect = span.getBoundingClientRect();
          showFloatingPopup(token, rect, currentSentence, true);

          // Pausa momentánea: reanudar automáticamente si el usuario deja de interactuar
          momentaryPauseTimeout = setTimeout(() => {
            const popup = document.getElementById("lg-floating-popup");
            const isHovering = popup && popup.matches(":hover");
            if (!isHovering && !span.matches(":hover")) {
              hideFloatingPopupAndResume();
            }
          }, 3500);
        });`;

if (js.includes(oldWordListeners)) {
  js = js.replace(oldWordListeners, newWordListeners);
  console.log('✓ Eventos de .lg-word actualizados para pausa momentánea');
} else {
  console.warn('⚠️ No se encontró el bloque exacto de listeners de palabra; buscando con reemplazo específico');
  js = js.replace(
    /\/\/ 1\. Pasar mouse sobre palabra:[\s\S]*?showFloatingPopup\(token, rect, currentSentence, true\);\s*\}\);/,
    newWordListeners
  );
  console.log('✓ Eventos de .lg-word reemplazados');
}

// Actualizar mouseenter y mouseleave del popup flotante para que respete la pausa momentánea
const oldPopupHover = `      popup.addEventListener("mouseenter", () => {
        clearTimeout(hoverHideTimeout);
        isHoveringWordOrPopup = true;
      });

      popup.addEventListener("mouseleave", () => {
        isHoveringWordOrPopup = false;
        if (!isPopupPinned) {
          clearTimeout(hoverHideTimeout);
          hoverHideTimeout = setTimeout(() => {
            if (!isHoveringWordOrPopup && !isPopupPinned) {
              hideFloatingPopupAndResume();
            }
          }, 160);
        }
      });`;

const newPopupHover = `      popup.addEventListener("mouseenter", () => {
        clearTimeout(hoverHideTimeout);
        clearTimeout(momentaryPauseTimeout);
        isHoveringWordOrPopup = true;
      });

      popup.addEventListener("mouseleave", () => {
        isHoveringWordOrPopup = false;
        clearTimeout(hoverHideTimeout);
        hoverHideTimeout = setTimeout(() => {
          if (!isHoveringWordOrPopup) {
            hideFloatingPopupAndResume();
          }
        }, 250);
      });`;

if (js.includes(oldPopupHover)) {
  js = js.replace(oldPopupHover, newPopupHover);
  console.log('✓ Listeners del popup actualizados para despausar al retirar mouse');
}

// Añadir detección de selección de texto con ratón (drag to select)
if (!js.includes('// 9. Detección de selección de texto libre con el ratón')) {
  const selectionListener = `
  // 9. Detección de selección de texto libre con el ratón
  document.addEventListener("mouseup", (e) => {
    if (!settings.enabled) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const selectedText = sel.toString().trim();
    if (!selectedText || selectedText.length > 80) return;

    const subBox = document.getElementById("lgSubBox");
    const videoView = document.querySelector(".watch-video") || document.body;
    if ((subBox && subBox.contains(sel.anchorNode)) || (videoView && videoView.contains(sel.anchorNode))) {
      clearTimeout(hoverHideTimeout);
      clearTimeout(momentaryPauseTimeout);
      isHoveringWordOrPopup = true;

      if (activeVideoElement && !activeVideoElement.paused) {
        wasPlayingBeforeHover = true;
        activeVideoElement.pause();
        window.postMessage({ type: "LG_PLAYER_PAUSE" }, "*");
      }

      revealSecondarySubtitle();
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showFloatingPopup(selectedText, rect, currentSentence, false);
      } catch (err) {}
    }
  });
`;
  js = js.replace('function escapeHTML(str) {', `${selectionListener}\n  function escapeHTML(str) {`);
  console.log('✓ Listener de selección de texto libre agregado');
}

fs.writeFileSync(`${basePath}/content.js`, js, 'utf8');
console.log('✓ content.js guardado exitosamente');
