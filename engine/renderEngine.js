/**
 * Creative AI — engine/renderEngine.js
 * Core rendering engine. Draws each frame of the creative video onto a Canvas.
 * Uses requestAnimationFrame for preview and frame-by-frame for export.
 * Responsibility: Frame composition, text rendering, overlays, progress callbacks.
 */

const RenderEngine = (() => {

  // ── State ──
  let isRendering = false;
  let previewRAF  = null;

  // ── Font stack by style ──
  const FONT_STACKS = {
    'serif-elegant':  "'Georgia', 'Times New Roman', serif",
    'modern-clean':   "'Inter', 'Helvetica Neue', sans-serif",
    'editorial':      "'Inter', 'Arial Black', sans-serif",
    'tech-modern':    "'Inter', 'Roboto', sans-serif",
    'warm-serif':     "'Georgia', 'Palatino', serif",
    'bold-impact':    "'Inter', 'Impact', sans-serif",
    'friendly-round': "'Inter', 'Verdana', sans-serif",
    'soft-round':     "'Inter', 'Trebuchet MS', sans-serif"
  };

  // ── Get font for style ──
  function getFont(style) {
    return FONT_STACKS[style] || FONT_STACKS['modern-clean'];
  }

  // ── Draw text with shadow and wrapping ──
  function drawText(ctx, text, x, y, options = {}) {
    const {
      font       = "'Inter', sans-serif",
      size       = 48,
      color      = '#ffffff',
      align      = 'center',
      maxWidth   = 900,
      shadow     = true,
      weight     = '700',
      lineHeight = 1.25,
      opacity    = 1,
      scale      = 1,
      glow       = true,
      accent     = '#D4AF37'
    } = options;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Smooth kinetic scale
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);

    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

   if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
}

   if (glow) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
}

    // Word wrap
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

   // Smart font balancing
   const textLength = text.length;

   let adjustedSize = size;

 if (textLength < 18) {
  adjustedSize *= 0.82;
} else if (textLength < 30) {
  adjustedSize *= 0.92;
} else if (textLength > 45) {
  adjustedSize *= 1.08;
}

ctx.font = `${weight} ${adjustedSize}px ${font}`;

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics  = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    lines.push(currentLine);

    const totalHeight = lines.length * adjustedSize * lineHeight;
    const startY = y - totalHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, x, startY + i * adjustedSize * lineHeight + adjustedSize / 2);
    });

    ctx.restore();
  }

  // ── Draw CTA button ──
  function drawCTA(ctx, text, x, y, options = {}) {
    const {
      font    = "'Inter', sans-serif",
      size    = 36,
      color   = '#ffffff',
      bgColor = 'rgba(255,255,255,0.15)',
      borderColor = 'rgba(255,255,255,0.6)',
      padding = { x: 40, y: 18 },
      opacity = 1
    } = options;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `700 ${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(text);
    const btnW = metrics.width + padding.x * 2;
    const btnH = size + padding.y * 2;
    const btnX = x - btnW / 2;
    const btnY = y - btnH / 2;
    const radius = btnH / 2;

    // Button background
    ctx.beginPath();
    ctx.moveTo(btnX + radius, btnY);
    ctx.lineTo(btnX + btnW - radius, btnY);
    ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + btnH, radius);
    ctx.lineTo(btnX + btnW, btnY + btnH - radius);
    ctx.arcTo(btnX + btnW, btnY + btnH, btnX, btnY + btnH, radius);
    ctx.lineTo(btnX + radius, btnY + btnH);
    ctx.arcTo(btnX, btnY + btnH, btnX, btnY, radius);
    ctx.lineTo(btnX, btnY + radius);
    ctx.arcTo(btnX, btnY, btnX + btnW, btnY, radius);
    ctx.closePath();

    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  // ── Draw urgency badge ──
  function drawUrgencyBadge(ctx, text, x, y, accentColor, opacity = 1) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = "700 22px 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(text);
    const bW = metrics.width + 24;
    const bH = 36;
    const bX = x - bW / 2;
    const bY = y - bH / 2;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(bX, bY, bW, bH, 6);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.shadowBlur = 0;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ── Calculate text sizes based on canvas dimensions ──
  function calcTextSizes(canvasW, canvasH) {
    const base = Math.min(canvasW, canvasH);
    return {
      hook:    Math.round(base * 0.095),
      body:    Math.round(base * 0.062),
      cta:     Math.round(base * 0.065),
      urgency: Math.round(base * 0.034)
    };
  }

  // ── Resolve text X position ──
  function resolveTextX(position, canvasW) {
    const pct = parseFloat(position.x) / 100;
    return canvasW * pct;
  }

  // ── Resolve text Y position ──
  function resolveTextY(position, canvasH) {
    const pct = parseFloat(position.y) / 100;
    return canvasH * pct;
  }

  // ── Render a single frame ──
  function renderFrame(ctx, frameData) {
    const {
      canvasW, canvasH,
      images, currentImageIndex, nextImageIndex,
      transitionProgress, imageProgress,
      copy, copyPhase, copyOpacity,
      config, time, particles
    } = frameData;

    const template = config.template;
    const colors   = config.colors;
    const position = config.textPosition;
    const fontStack = getFont(config.niche?.fontStyle || 'modern-clean');
    const sizes = calcTextSizes(canvasW, canvasH);

    // ── 1. Clear canvas ──
    ctx.clearRect(0, 0, canvasW, canvasH);

    // ── 2. Background color ──
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // ── 3. Draw current image with smart animation ──
    if (images[currentImageIndex]) {

    const smartAnimation =
      config.animations[
        currentImageIndex % config.animations.length
     ];

  const anim = 
    smartAnimation?.id || 'cinematic-zoom';

  const preset = 
    smartAnimation?.preset || null;

  AnimationEngine.applyImageAnimation(
    ctx,
    images[currentImageIndex].img,
    canvasW,
    canvasH,
    anim,
    imageProgress,
    preset,
    time
  );
}

    // ── 4. Smart transition overlay ──
if (transitionProgress > 0 && images[nextImageIndex]) {

  const smartNext =
    config.animations[
      nextImageIndex % config.animations.length
    ];

  const nextAnim =
    smartNext?.id || 'cinematic-zoom';

  const nextPreset =
    smartNext?.preset || null;

  ctx.save();

  ctx.globalAlpha =
    transitionProgress * 0.9;

  AnimationEngine.applyImageAnimation(
    ctx,
    images[nextImageIndex].img,
    canvasW,
    canvasH,
    nextAnim,
    0,
    nextPreset,
    time
  );

  ctx.restore();
}

    // ── 5. Dark gradient overlay ──
    AnimationEngine.drawGradientOverlay(ctx, canvasW, canvasH, colors.bg, template.overlayOpacity + 0.3);

    // ── 6. Glow effect ──
    if (template.animations.includes('glow')) {
      AnimationEngine.drawGlowOverlay(ctx, canvasW, canvasH, time, colors.accent);
    }

    // ── 7. Sparkle particles ──
    if (template.animations.includes('sparkle') && particles) {
      particles.draw(ctx, time);
    }

    // ── 8. Copy text ──
    const textX = resolveTextX(position, canvasW);
    const textY = canvasH * 0.58;
    const safeMaxW = canvasW * 0.85;

    if (copyPhase === 'attention' && copy.attention) {
      drawText(ctx, copy.attention, textX, textY, {
        font: fontStack,
        size: sizes.hook,
        color: '#FFFFFF',
        align: position.align,
        maxWidth: safeMaxW,
        opacity: copyOpacity,
        weight: '900',
        scale: 0.88 + (copyOpacity * 0.18) + (Math.sin(time * 0.002) * 0.015),
        glow: true,
        accent: '#D4AF37'
      });
    } else if (copyPhase === 'interest' && copy.interest) {
      drawText(ctx, copy.interest, textX, textY, {
        font: fontStack,
        size: sizes.body,
        color: '#F5F5F5',
        align: position.align,
        maxWidth: safeMaxW,
        opacity: copyOpacity,
        weight: '700',
        scale: 0.94 + (copyOpacity * 0.10) + (Math.sin(time * 0.0015) * 0.01),
        glow: false
      });
    } else if (copyPhase === 'desire' && copy.desire) {
      drawText(ctx, copy.desire, textX, textY, {
        font: fontStack,
        size: sizes.body,
        color: '#F5D061',
        align: position.align,
        maxWidth: safeMaxW,
        opacity: copyOpacity,
        weight: '800',
        scale: 0.92 + (copyOpacity * 0.14) + (Math.sin(time * 0.0022) * 0.012),
        glow: true,
        accent: '#D4AF37'
      });
    } else if (copyPhase === 'cta' && copy.cta) {
      // CTA button
      const ctaY = canvasH * 0.82;
      drawCTA(ctx, copy.cta, canvasW / 2, ctaY, {
        font: fontStack, size: sizes.cta, color: '#ffffff',
        bgColor: colors.accent + 'cc', borderColor: colors.accent,
        opacity: copyOpacity
      });
      // Urgency text above CTA
      if (copy.urgency) {
        drawUrgencyBadge(ctx, copy.urgency, canvasW / 2, ctaY - sizes.cta * 2.2, colors.accent, copyOpacity);
      }
    }

    // ── 9. Subtle vignette ──
    drawVignette(ctx, canvasW, canvasH);
  }

  // ── Draw vignette ──
  function drawVignette(ctx, w, h) {
    const gradient = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.8);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  // ── Determine copy phase from time ──
  function getCopyPhase(
  currentTimeSec,
  totalDurationSec,
  copy
) {

  const phases = [];

  if (copy.attention)
    phases.push('attention');

  if (copy.interest)
    phases.push('interest');

  if (copy.desire)
    phases.push('desire');

  if (copy.cta)
    phases.push('cta');

  const phaseDuration =
    totalDurationSec / phases.length;

  const phaseIndex =
    Math.min(
      Math.floor(
        currentTimeSec /
        phaseDuration
      ),
      phases.length - 1
    );

  return phases[phaseIndex];
}

  // ── Calculate copy opacity (fade in/out) ──
  function getCopyOpacity(currentTimeSec) {
    const phases = [
      { start: 0,  end: 2  },
      { start: 2,  end: 5  },
      { start: 5,  end: 8  },
      { start: 8,  end: 12 }
    ];
    for (const phase of phases) {
      if (currentTimeSec >= phase.start && currentTimeSec < phase.end) {
        const duration = phase.end - phase.start;
        const elapsed  = currentTimeSec - phase.start;
        const fadeIn   = 0.3;
        const fadeOut  = 0.3;
        if (elapsed < fadeIn) return elapsed / fadeIn;
        if (elapsed > duration - fadeOut) return (duration - elapsed) / fadeOut;
        return 1;
      }
    }
    return 1;
  }

  // ── Live preview loop ──
  function startPreview(canvas, images, copy, config, onFrame) {
    stopPreview();
    isRendering = true;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const durationConf = config.duration;
    const totalMs = durationConf.totalSeconds * 1000;
    const imageDisplayMs = durationConf.imageDisplayTime;
    const transitionMs   = durationConf.transitionTime;

    const particles = config.template.animations.includes('sparkle')
      ? new AnimationEngine.ParticleSystem(W, H, config.niche?.colorPalette || ['#fff'])
      : null;

    let startTime = null;
    let lastCopyPhase = null;

    function loop(timestamp) {
      if (!isRendering) return;
      if (!startTime) startTime = timestamp;

      const elapsed = (timestamp - startTime) % totalMs;
      const currentSec = elapsed / 1000;

      // ── Sync narration by phase ──
const voiceEnabled =
  document.getElementById(
    'enable-voice'
  )?.checked;

if (voiceEnabled && copy) {

  const currentPhase =
    getCopyPhase(
      currentSec,
      totalMs / 1000,
      copy
    );

  if (
    currentPhase &&
    currentPhase !==
      lastCopyPhase
  ) {

    lastCopyPhase =
      currentPhase;

    AudioEngine.stopVoice();

    const phrase =
      copy[currentPhase];

    if (phrase) {

      AudioEngine.speakCopy(
  {
    attention:
      phrase
  },
  AppState.language
);
    }
  }
}

      // Which image is showing
      const totalImages = images.length;
      const imageSlotMs = (totalMs - transitionMs) / totalImages;
      const imageIndex  = Math.floor(elapsed / imageSlotMs) % totalImages;
      const nextIndex   = (imageIndex + 1) % totalImages;
      const slotElapsed = elapsed % imageSlotMs;
      const imageProgress = slotElapsed / imageSlotMs;
      const transitionStart = imageSlotMs - transitionMs;
      const transitionProgress = slotElapsed > transitionStart
        ? (slotElapsed - transitionStart) / transitionMs
        : 0;

      renderFrame(ctx, {
        canvasW: W, canvasH: H,
        images,
        currentImageIndex: imageIndex,
        nextImageIndex: nextIndex,
        transitionProgress,
        imageProgress,
        copy,
        copyPhase: getCopyPhase(currentSec, totalMs / 1000, copy),
        copyOpacity: getCopyOpacity(currentSec),
        config,
        time: timestamp,
        particles
      });

      if (onFrame) onFrame(currentSec, totalMs / 1000);
      previewRAF = requestAnimationFrame(loop);
    }

    previewRAF = requestAnimationFrame(loop);
  }

  // ── Stop preview ──
  function stopPreview() {
    isRendering = false;
    if (previewRAF) {
      cancelAnimationFrame(previewRAF);
      previewRAF = null;
    }
  }

  // ── Render all frames to array (for export) ──
  async function renderAllFrames(canvas, images, copy, config, onProgress) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const durationConf = config.duration;
    const fps = durationConf.framesPerSecond;
    const totalFrames = durationConf.totalFrames;
    const totalMs = durationConf.totalSeconds * 1000;
    const imageDisplayMs = durationConf.imageDisplayTime;
    const transitionMs   = durationConf.transitionTime;

    const particles = config.template.animations.includes('sparkle')
      ? new AnimationEngine.ParticleSystem(W, H, config.niche?.colorPalette || ['#fff'])
      : null;

    const frames = [];

    for (let f = 0; f < totalFrames; f++) {
      const elapsed    = (f / fps) * 1000;
      const currentSec = f / fps;
      const totalImages = images.length;
      const imageSlotMs = (totalMs - transitionMs) / totalImages;
      const imageIndex  = Math.floor(elapsed / imageSlotMs) % totalImages;
      const nextIndex   = (imageIndex + 1) % totalImages;
      const slotElapsed = elapsed % imageSlotMs;
      const imageProgress = slotElapsed / imageSlotMs;
      const transitionStart = imageSlotMs - transitionMs;
      const transitionProgress = slotElapsed > transitionStart
        ? (slotElapsed - transitionStart) / transitionMs
        : 0;

      renderFrame(ctx, {
        canvasW: W, canvasH: H,
        images,
        currentImageIndex: imageIndex,
        nextImageIndex: nextIndex,
        transitionProgress,
        imageProgress,
        copy,
        copyPhase: getCopyPhase(currentSec, totalMs / 1000, copy),
        copyOpacity: getCopyOpacity(currentSec),
        config,
        time: elapsed,
        particles
      });

      // Capture frame as ImageData
      frames.push(ctx.getImageData(0, 0, W, H));

      // Report progress every 10 frames
      if (f % 10 === 0 && onProgress) {
        onProgress(f / totalFrames, `Rendering frame ${f + 1} / ${totalFrames}`);
        // Yield to browser
        await new Promise(r => setTimeout(r, 0));
      }
    }

    return frames;
  }

  // ── Public API ──
  return {
    renderFrame,
    renderAllFrames,
    startPreview,
    stopPreview,
    getCopyPhase,
    getCopyOpacity,
    drawText,
    drawCTA,
    getFont
  };

})();
