const fs = require('fs');

const basePath = 'c:/Users/jcarl/.gemini/antigravity/scratch/Linguadigato';

// 1. MODIFICAR page_bridge.js
let bridgeJs = fs.readFileSync(`${basePath}/page_bridge.js`, 'utf8');
if (!bridgeJs.includes('LG_PLAYER_TOGGLE')) {
  const target = 'if (e.data.type === "LG_PLAYER_PLAY") {';
  const replacement = `if (e.data.type === "LG_PLAYER_TOGGLE") {
      try {
        const player = getNetflixPlayer();
        if (player) {
          const paused = typeof player.isPaused === "function" ? player.isPaused() : (player.isPlaying ? !player.isPlaying() : false);
          if (paused) {
            if (player.play) player.play();
          } else {
            if (player.pause) player.pause();
          }
        }
      } catch (err) {}
    }

    if (e.data.type === "LG_PLAYER_PLAY") {`;
  bridgeJs = bridgeJs.replace(target, replacement);
  fs.writeFileSync(`${basePath}/page_bridge.js`, bridgeJs, 'utf8');
  console.log('✓ page_bridge.js actualizado con LG_PLAYER_TOGGLE');
} else {
  console.log('• page_bridge.js ya contenía LG_PLAYER_TOGGLE');
}

// 2. MODIFICAR content.css
let contentCss = fs.readFileSync(`${basePath}/content.css`, 'utf8');
const cssRuleMarker = '/* FORZAR VISIBILIDAD PERMANENTE DEL CURSOR DEL MOUSE */';
if (!contentCss.includes(cssRuleMarker)) {
  const cssAdditions = `

/* =========================================================================
   FORZAR VISIBILIDAD PERMANENTE DEL CURSOR DEL MOUSE SOBRE EL VIDEO EN NETFLIX
   Evita que Netflix oculte el cursor (cursor: none) por inactividad o al reproducir
   ========================================================================= */
${cssRuleMarker}
body.lg-enabled,
body.lg-enabled *,
body.lg-enabled .watch-video,
body.lg-enabled .watch-video *,
body.lg-enabled .watch-video--player-view,
body.lg-enabled .watch-video--player-view *,
body.lg-enabled video,
body.lg-enabled .PlayerControlsNeo__layout,
body.lg-enabled .watch-video--bottom-controls-container,
body.lg-enabled .watch-video--hide-cursor,
body.lg-enabled [class*="hide-cursor"],
body.lg-enabled [data-uia*="video-canvas"] {
  cursor: default !important;
}

/* Mantener el cursor pointer (mano) en elementos clickeables / interactivos */
body.lg-enabled button,
body.lg-enabled a,
body.lg-enabled select,
body.lg-enabled input,
body.lg-enabled .lg-word,
body.lg-enabled .lg-nav-btn,
body.lg-enabled .lg-icon-btn,
body.lg-enabled .lg-chip,
body.lg-enabled .lg-badge-btn,
body.lg-enabled .lg-save-btn,
body.lg-enabled .lg-audio-btn,
body.lg-enabled .lg-popup-close,
body.lg-enabled [role="button"],
body.lg-enabled [cursor-pointer] {
  cursor: pointer !important;
}
`;
  contentCss += cssAdditions;
  fs.writeFileSync(`${basePath}/content.css`, contentCss, 'utf8');
  console.log('✓ content.css actualizado con reglas de visibilidad del cursor');
} else {
  console.log('• content.css ya contenía reglas de cursor');
}

// 3. MODIFICAR content.js
let contentJs = fs.readFileSync(`${basePath}/content.js`, 'utf8');

// A. Reemplazar listener restrictivo viejo de container.addEventListener("click")
const oldContainerClick = `      // Pausar al hacer clic en el área de subtítulos
      container.addEventListener("click", (e) => {
        if (!e.target.classList.contains("lg-nav-btn") && !e.target.closest(".lg-ap-wrap")) {
          if (activeVideoElement && !activeVideoElement.paused) {
            activeVideoElement.pause();
          }
        }
      });`;

const newContainerComment = `      // (Pausar y despausar desde cualquier parte de la pantalla es gestionado globalmente)`;

if (contentJs.includes(oldContainerClick)) {
  contentJs = contentJs.replace(oldContainerClick, newContainerComment);
  console.log('✓ Listener restrictivo viejo de container reemplazado');
}

// B. Agregar togglePlayPause y asegurar cursor visible en el loop de watchNetflixSubtitles
if (!contentJs.includes('function togglePlayPause()')) {
  const togglePlayPauseFunc = `  // Alternar reproducción / pausa de manera universal en Netflix
  function togglePlayPause() {
    if (activeVideoElement) {
      if (activeVideoElement.paused) {
        activeVideoElement.play().catch(() => {});
        window.postMessage({ type: "LG_PLAYER_PLAY" }, "*");
      } else {
        activeVideoElement.pause();
        window.postMessage({ type: "LG_PLAYER_PAUSE" }, "*");
      }
    } else {
      window.postMessage({ type: "LG_PLAYER_TOGGLE" }, "*");
    }
  }
`;
  // Insertar antes de initDOM
  contentJs = contentJs.replace('function initDOM() {', `${togglePlayPauseFunc}\n  function initDOM() {`);
  console.log('✓ togglePlayPause() agregado a content.js');
}

// C. Asegurar remoción de clases de ocultamiento de cursor en el loop continuo
const loopTarget = 'if (settings.hideNetflixControls) {\n        suppressNetflixControlsAndFlag();\n      }';
const loopReplacement = `if (settings.hideNetflixControls) {
        suppressNetflixControlsAndFlag();
      }

      // Mantener cursor de mouse visible sobre el video
      const hiddenCursorEls = document.querySelectorAll(".watch-video--hide-cursor, [class*='hide-cursor']");
      if (hiddenCursorEls.length > 0) {
        hiddenCursorEls.forEach(el => {
          el.classList.remove("watch-video--hide-cursor");
          el.style.setProperty("cursor", "default", "important");
        });
      }`;

if (contentJs.includes(loopTarget) && !contentJs.includes('hiddenCursorEls')) {
  contentJs = contentJs.replace(loopTarget, loopReplacement);
  console.log('✓ Limpieza continua de watch-video--hide-cursor agregada al loop');
}

// D. Agregar listener global de clic para pausar/despausar desde cualquier parte de la pantalla
const globalClickListener = `
  // =========================================================================
  // 8. PAUSAR O DESPAUSAR DESDE CUALQUIER PARTE LIBRE DE LA PANTALLA
  // =========================================================================
  function isInteractiveClickTarget(target) {
    if (!target) return false;
    if (typeof target.closest === "function") {
      // 1. Clic en palabras individuales de subtítulo (para traducir y pausar)
      if (target.closest(".lg-word")) return true;

      // 2. Elementos interactivos propios de Linguadigatto
      if (target.closest("button, input, select, textarea, a")) return true;
      if (target.closest(".lg-nav-btn, .lg-icon-btn, .lg-chip, .lg-save-btn, .lg-audio-btn, .lg-popup-close")) return true;
      if (target.closest("#lg-floating-popup, #lg-transcript-drawer, #lg-quick-menu, #lgNetflixBadgeGroup, #lg-lang-modal, .lg-toast")) return true;
      if (target.closest(".lg-modal-backdrop, .lg-modal-content")) return true;
      if (target.closest(".lg-nav-group-left, .lg-nav-group-right")) return true;

      // 3. Controles nativos de Netflix si el usuario hace clic en volumen, scrubber o menú de audio
      if (target.closest("[role='slider'], .slider-container, [data-uia*='control'], [data-uia*='timeline'], [data-uia*='scrubber'], .button-nfplayer, [data-uia*='audio-subtitle'], [data-uia*='episodes']")) {
        return true;
      }
    }
    return false;
  }

  // Interceptar clics en pantalla libre para alternar Play / Pause
  document.addEventListener("click", (e) => {
    if (!settings.enabled) return;

    // Solo si estamos en una página de reproducción con video
    if (!activeVideoElement && !document.querySelector("video")) return;

    // Si el clic fue en un elemento interactivo, permitir su comportamiento nativo
    if (isInteractiveClickTarget(e.target)) return;

    // Clic en cualquier área libre del video o pantalla: alternar pausa / reproducción
    e.stopPropagation();
    togglePlayPause();
  }, true);
`;

if (!contentJs.includes('isInteractiveClickTarget')) {
  // Insertar antes del cierre de la IIFE
  contentJs = contentJs.replace('function escapeHTML(str) {', `${globalClickListener}\n  function escapeHTML(str) {`);
  console.log('✓ Listener global de click en pantalla libre agregado');
}

fs.writeFileSync(`${basePath}/content.js`, contentJs, 'utf8');
console.log('✓ content.js guardado exitosamente');
