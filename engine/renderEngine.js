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
  let voiceStarted = false;

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
      font      = "'Inter', sans-serif",
      size      = 48,
      color     = '#ffffff',
      align     = 'center',
      maxWidth  = 900,
      shadow    = true,
      weight    = '700',
      lineHeight = 1.25,
      opacity   = 1
    } = options;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur  = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Word wrap
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

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

    const totalHeight = lines.length * size * lineHeight;
    const startY = y - totalHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, x, startY + i * size * lineHeight + size / 2);
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
      hook:    Math.round(base * 0.075),
      body:    Math.round(base * 0.048),
      cta:     Math.round(base * 0.055),
      urgency: Math.round(base * 0.032)
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

    // ── 3. Draw current image with animation ──
    if (images[currentImageIndex]) {
      const anim = template.animations[currentImageIndex % template.animations.length];
      const preset = config.animations.find(a => a.id === anim)?.preset;
      AnimationEngine.applyImageAnimation(
        ctx, images[currentImageIndex].img,
        canvasW, canvasH, anim, imageProgress, preset, time
      );
    }

    // ── 4. Transition overlay (cross-fade to next image) ──
    if (transitionProgress > 0 && images[nextImageIndex]) {
      const nextAnim = template.animations[nextImageIndex % template.animations.length];
      const nextPreset = config.animations.find(a => a.id === nextAnim)?.preset;
      ctx.save();
      ctx.globalAlpha = transitionProgress;
      AnimationEngine.applyImageAnimation(
        ctx, images[nextImageIndex].img,
        canvasW, canvasH, nextAnim, 0, nextPreset, time
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

const textX = resolveTextX(
  position,
  canvasW
);

const textY = resolveTextY(
  position,
  canvasH
);

const safeMaxW =
  canvasW * 0.85;

if (
  copy.scenes &&
  copy.scenes.length > 0
) {

  const totalScenes =
    copy.scenes.length;

  const sceneDuration =
    config.duration.totalSeconds /
    totalScenes;

  const currentTimeSec =
  (time % (
    config.duration.totalSeconds *
    1000
  )) / 1000;

const currentScene =
  Math.min(
    Math.floor(
      currentTimeSec /
      sceneDuration
    ),
    totalScenes - 1
  );

  const sceneText =
    copy.scenes[
      currentScene
    ];

  const isLastScene =
    currentScene ===
    totalScenes - 1;

  if (
    isLastScene
  ) {

    const ctaY =
      canvasH * 0.82;

    drawCTA(
      ctx,
      sceneText,
      canvasW / 2,
      ctaY,
      {
        font: fontStack,
        size: sizes.cta,
        color: '#ffffff',
        bgColor:
          colors.accent + 'cc',
        borderColor:
          colors.accent,
        opacity:
          copyOpacity
      }
    );

  } else {

    drawText(
      ctx,
      sceneText,
      textX,
      textY,
      {
        font:
          fontStack,

        size:
          currentScene === 0
            ? sizes.hook
            : sizes.body,

        color:
          currentScene >=
          totalScenes - 2
            ? colors.accent
            : colors.text,

        align:
          position.align,

        maxWidth:
          safeMaxW,

        opacity:
          copyOpacity,

        weight:
          currentScene === 0
            ? '800'
            : '600'
      }
    );
  }

} else {

  // fallback antigo AIDA

  if (
    copyPhase ===
      'attention' &&
    copy.attention
  ) {

    drawText(
      ctx,
      copy.attention,
      textX,
      textY,
      {
        font: fontStack,
        size: sizes.hook,
        color: colors.text,
        align:
          position.align,
        maxWidth:
          safeMaxW,
        opacity:
          copyOpacity,
        weight: '800'
      }
    );

  } else if (
    copyPhase ===
      'interest' &&
    copy.interest
  ) {

    drawText(
      ctx,
      copy.interest,
      textX,
      textY,
      {
        font: fontStack,
        size: sizes.body,
        color: colors.text,
        align:
          position.align,
        maxWidth:
          safeMaxW,
        opacity:
          copyOpacity,
        weight: '600'
      }
    );

  } else if (
    copyPhase ===
      'desire' &&
    copy.desire
  ) {

    drawText(
      ctx,
      copy.desire,
      textX,
      textY,
      {
        font: fontStack,
        size: sizes.body,
        color:
          colors.accent,
        align:
          position.align,
        maxWidth:
          safeMaxW,
        opacity:
          copyOpacity,
        weight: '700'
      }
    );

  } else if (
    copyPhase ===
      'cta' &&
    copy.cta
  ) {

    const ctaY =
      canvasH * 0.82;

    drawCTA(
      ctx,
      copy.cta,
      canvasW / 2,
      ctaY,
      {
        font:
          fontStack,
        size:
          sizes.cta,
        color:
          '#ffffff',
        bgColor:
          colors.accent + 'cc',
        borderColor:
          colors.accent,
        opacity:
          copyOpacity
      }
    );
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
  totalSeconds = 15
) {

  const attentionEnd =
    totalSeconds * 0.18;

  const interestEnd =
    totalSeconds * 0.42;

  const desireEnd =
    totalSeconds * 0.72;

  if (
    currentTimeSec <
    attentionEnd
  ) {
    return 'attention';
  }

  if (
    currentTimeSec <
    interestEnd
  ) {
    return 'interest';
  }

  if (
    currentTimeSec <
    desireEnd
  ) {
    return 'desire';
  }

  return 'cta';
}

  // ── Calculate copy opacity (fade in/out) ──
  function getCopyOpacity(
  currentTimeSec,
  totalSeconds = 15
) {

  const phases = [

    {
      start: 0,
      end:
        totalSeconds * 0.18
    },

    {
      start:
        totalSeconds * 0.18,

      end:
        totalSeconds * 0.42
    },

    {
      start:
        totalSeconds * 0.42,

      end:
        totalSeconds * 0.72
    },

    {
      start:
        totalSeconds * 0.72,

      end:
        totalSeconds
    }
  ];

  for (
    const phase
    of phases
  ) {

    if (
      currentTimeSec >=
      phase.start &&

      currentTimeSec <
      phase.end
    ) {

      const duration =
        phase.end -
        phase.start;

      const elapsed =
        currentTimeSec -
        phase.start;

      const fadeIn = 0.4;
      const fadeOut = 0.4;

      if (
        elapsed <
        fadeIn
      ) {
        return (
          elapsed /
          fadeIn
        );
      }

      if (
        elapsed >
        duration -
        fadeOut
      ) {

        return (
          duration -
          elapsed
        ) / fadeOut;
      }

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

    function loop(timestamp) {
      if (!isRendering) return;
      if (!startTime) {
  startTime = timestamp;

  const voiceEnabled =
    document.getElementById(
      'enable-voice'
    )?.checked;

  if (
    voiceEnabled &&
    !voiceStarted &&
    copy
  ) {

    voiceStarted =
      true;

    const narration = [
      copy.attention,
      copy.interest,
      copy.desire,
      copy.cta
    ]
      .filter(Boolean)
      .join('. ');

    setTimeout(() => {

      try {

        AudioEngine.stopVoice?.();

        AudioEngine.speakCopy?.(
          {
            attention:
              narration
          },
          AppState.language
        );

      } catch (err) {

        console.warn(
          'Voice error:',
          err
        );
      }

    }, 300);
  }
}

      const elapsed = (timestamp - startTime) % totalMs;
      const currentSec = elapsed / 1000;

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
        copyPhase: getCopyPhase(currentSec, durationConf.totalSeconds),
        copyOpacity: getCopyOpacity(currentSec, durationConf.totalSeconds),
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
    cancelAnimationFrame(
      previewRAF
    );

    previewRAF = null;
  }

  try {

    window
      .speechSynthesis
      ?.cancel?.();

    AudioEngine
      ?.stopVoice?.();
    
    voiceStarted = false;

  } catch (err) {

    console.warn(
      'Voice stop failed:',
      err
    );
  }

  } // ── Render all frames to array (for export) ──
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
        copyPhase: getCopyPhase(currentSec, durationConf.totalSeconds),
        copyOpacity: getCopyOpacity(currentSec, durationConf.totalSeconds),
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
