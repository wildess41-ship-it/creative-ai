/**
 * Creative AI — engine/animationEngine.js
 * Applies motion design animations to canvas frames.
 * Responsibility: Ken Burns, parallax, zoom, pan, glow, sparkle, transitions.
 * IMPORTANT: Never deforms the product. Only motion design.
 */

const AnimationEngine = (() => {

  // ── Easing functions ──
  const easings = {
    'linear':       t => t,
    'ease-in':      t => t * t,
    'ease-out':     t => t * (2 - t),
    'ease-in-out':  t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    'ease-out-back': t => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };

  function ease(type, t) {
    return (easings[type] || easings['ease-in-out'])(Math.max(0, Math.min(1, t)));
  }

  // ── Particle system for sparkle ──
  class ParticleSystem {
    constructor(canvasW, canvasH, color = ['#ffffff', '#ffe066', '#c9a84c']) {
      this.particles = [];
      this.w = canvasW;
      this.h = canvasH;
      this.colors = color;
      this.init();
    }

    init() {
      for (let i = 0; i < 25; i++) {
        this.particles.push({
          x:     Math.random() * this.w,
          y:     Math.random() * this.h,
          size:  Math.random() * 3 + 1,
          speed: Math.random() * 0.8 + 0.2,
          angle: Math.random() * Math.PI * 2,
          alpha: Math.random(),
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    draw(ctx, time) {
      this.particles.forEach(p => {
        const a = (Math.sin(time * 0.003 * p.speed + p.phase) + 1) / 2;
        ctx.save();
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(
          p.x + Math.sin(time * 0.001 * p.speed + p.phase) * 15,
          p.y + Math.cos(time * 0.001 * p.speed + p.phase) * 10,
          p.size, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      });
    }
  }

  // ── Draw image with Ken Burns effect ──
  function drawKenBurns(ctx, img, canvasW, canvasH, progress, preset) {
    const startScale = preset?.startScale || 1.05;
    const endScale   = preset?.endScale   || 1.2;
    const startX     = preset?.startX     || 0;
    const endX       = preset?.endX       || -20;
    const startY     = preset?.startY     || 0;
    const endY       = preset?.endY       || -10;

    const t = ease(preset?.easing || 'linear', progress);
    const scale = startScale + (endScale - startScale) * t;
    const offsetX = startX + (endX - startX) * t;
    const offsetY = startY + (endY - startY) * t;

    drawImageCover(ctx, img, canvasW, canvasH, scale, offsetX, offsetY);
  }

  // ── Draw image with cinematic zoom ──
  function drawCinematicZoom(ctx, img, canvasW, canvasH, progress, preset) {
    const startScale = preset?.startScale || 1.08;
    const endScale   = preset?.endScale   || 1.28;
    const t = ease(preset?.easing || 'ease-out', progress);
    const scale = startScale + (endScale - startScale) * t;
    drawImageCover(ctx, img, canvasW, canvasH, scale, 0, 0);
  }

  // ── Draw image with pan ──
  function drawPan(ctx, img, canvasW, canvasH, progress, preset) {
    const direction = preset?.direction || 'right';
    const distance  = preset?.distance  || 85;
    const t = ease(preset?.easing || 'ease-in-out', progress);

    let offsetX = 0, offsetY = 0;
    if (direction === 'right') offsetX = -distance * t;
    if (direction === 'left')  offsetX =  distance * t;
    if (direction === 'up')    offsetY =  distance * t;
    if (direction === 'down')  offsetY = -distance * t;

    drawImageCover(ctx, img, canvasW, canvasH, 1.08, offsetX, offsetY);
  }

  // ── Draw image with parallax (fake depth) ──
  function drawParallax(ctx, img, canvasW, canvasH, progress, preset) {
    const depth = preset?.depth || 0.75;
    const t = ease(preset?.easing || 'ease-in-out', progress);
    const offsetX = Math.sin(t * Math.PI * 2) * depth * 20;
    const offsetY = Math.cos(t * Math.PI) * depth * 10;
    drawImageCover(ctx, img, canvasW, canvasH, 1.1, offsetX, offsetY);
  }

  // ── Core: draw image cover (object-fit: cover) ──
  function drawImageCover(ctx, img, canvasW, canvasH, scale = 1, offsetX = 0, offsetY = 0) {
    const imgAspect    = img.width / img.height;
    const canvasAspect = canvasW / canvasH;

    let drawW, drawH;
    if (imgAspect > canvasAspect) {
      drawH = canvasH * scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = canvasW * scale;
      drawH = drawW / imgAspect;
    }

    const x = (canvasW - drawW) / 2 + offsetX;
    const y = (canvasH - drawH) / 2 + offsetY;

    ctx.drawImage(img, x, y, drawW, drawH);
  }

  // ── Apply blur filter ──
  function applyBlurReveal(ctx, canvasW, canvasH, progress, preset) {
    const startBlur = preset?.startBlur || 8;
    const endBlur   = preset?.endBlur   || 0;
    const t = ease(preset?.easing || 'ease-out', progress);
    const blur = startBlur + (endBlur - startBlur) * t;
    ctx.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : 'none';
  }

  // ── Draw glow overlay ──
  function drawGlowOverlay(ctx, canvasW, canvasH, time, accentColor) {
    const pulse = (Math.sin(time * 0.002) + 1) / 2;
    const gradient = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 0,
      canvasW / 2, canvasH / 2, canvasW * 0.7
    );
    gradient.addColorStop(0, `rgba(255,255,255,${0.05 * pulse})`);
    gradient.addColorStop(0.5, `rgba(255,255,255,${0.02 * pulse})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Draw dark overlay ──
  function drawOverlay(ctx, canvasW, canvasH, opacity, color = '#000000') {
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.globalAlpha = 1;
  }

  // ── Draw gradient overlay (bottom fade) ──
  function drawGradientOverlay(ctx, canvasW, canvasH, color = '#000000', strength = 0.7) {
    const gradient = ctx.createLinearGradient(0, canvasH * 0.4, 0, canvasH);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Transition: cross-fade between two images ──
  function drawCrossFade(ctx, imgA, imgB, canvasW, canvasH, progress) {
    ctx.globalAlpha = 1;
    drawImageCover(ctx, imgA, canvasW, canvasH);
    ctx.globalAlpha = progress;
    drawImageCover(ctx, imgB, canvasW, canvasH);
    ctx.globalAlpha = 1;
  }

  // ── Transition: slide ──
  function drawSlide(ctx, imgA, imgB, canvasW, canvasH, progress, direction = 'left') {
    const t = ease('ease-in-out', progress);
    let xA = 0, xB = 0, yA = 0, yB = 0;

    if (direction === 'left') {
      xA = -canvasW * t;
      xB = canvasW * (1 - t);
    } else if (direction === 'right') {
      xA = canvasW * t;
      xB = -canvasW * (1 - t);
    } else if (direction === 'up') {
      yA = -canvasH * t;
      yB = canvasH * (1 - t);
    }

    ctx.save();
    ctx.translate(xA, yA);
    drawImageCover(ctx, imgA, canvasW, canvasH);
    ctx.restore();

    ctx.save();
    ctx.translate(xB, yB);
    drawImageCover(ctx, imgB, canvasW, canvasH);
    ctx.restore();
  }

  // ── Apply animation frame for a given image ──
  function applyImageAnimation(ctx, img, canvasW, canvasH, animationType, progress, preset, time) {
    ctx.save();
    ctx.filter = 'none';

    switch (animationType) {
      case 'ken-burns':
        drawKenBurns(ctx, img, canvasW, canvasH, progress, preset);
        break;
      case 'cinematic-zoom':
        drawCinematicZoom(ctx, img, canvasW, canvasH, progress, preset);
        break;
      case 'pan':
        drawPan(ctx, img, canvasW, canvasH, progress, preset);
        break;
      case 'parallax':
        drawParallax(ctx, img, canvasW, canvasH, progress, preset);
        break;
      case 'blur-reveal':
        applyBlurReveal(ctx, canvasW, canvasH, progress, preset);
        drawImageCover(ctx, img, canvasW, canvasH);
        break;
      case 'zoom-punch': {
        const punch = 1 + Math.sin(progress * Math.PI) * 0.16;
        drawImageCover(ctx, img, canvasW, canvasH, punch, 0, 0);
        break;
      }
      default:
        drawImageCover(ctx, img, canvasW, canvasH);
    }

    ctx.restore();
    ctx.filter = 'none';
  }

  // ── Public API ──
  return {
    drawImageCover,
    drawKenBurns,
    drawCinematicZoom,
    drawPan,
    drawParallax,
    drawGlowOverlay,
    drawOverlay,
    drawGradientOverlay,
    drawCrossFade,
    drawSlide,
    applyImageAnimation,
    applyBlurReveal,
    ParticleSystem,
    ease
  };

})();
