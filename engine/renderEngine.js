/**
 * Creative AI — engine/renderEngine.js
 * Core rendering engine. Draws each frame of the creative video onto a Canvas.
 * Uses requestAnimationFrame for preview and frame-by-frame for export.
 * Responsibility: Frame composition, text rendering, overlays, progress callbacks.
 */

const RenderEngine = (() => {

  // ── State ──
  let isRendering = false;
  let previewRAF = null;
  let voiceStarted = false;
  let voiceUtterance = null;

  // ── Font stack by style ──
  const FONT_STACKS = {
    'serif-elegant': "'Georgia', 'Times New Roman', serif",
    'modern-clean': "'Inter', 'Helvetica Neue', sans-serif",
    'editorial': "'Inter', 'Arial Black', sans-serif",
    'tech-modern': "'Inter', 'Roboto', sans-serif",
    'warm-serif': "'Georgia', 'Palatino', serif",
    'bold-impact': "'Inter', 'Impact', sans-serif",
    'friendly-round': "'Inter', 'Verdana', sans-serif",
    'soft-round': "'Inter', 'Trebuchet MS', sans-serif"
  };

  // ── Get font for style ──
  function getFont(style) {
    return FONT_STACKS[style] || FONT_STACKS['modern-clean'];
  }

  // ── Build full narration (Mode B) ──
  function buildNarration(copy) {
    if (!copy) return '';

    return [
      copy.attention,
      copy.interest,
      copy.desire,
      copy.cta
    ]
      .filter(Boolean)
      .join('. ');
  }

  // ── Safe voice stop ──
  function stopVoiceSafe() {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      if (AudioEngine?.stopVoice) {
        AudioEngine.stopVoice(true);
      }
    } catch (err) {
      console.warn(
        'Voice cleanup failed:',
        err
      );
    }

    voiceStarted = false;
    voiceUtterance = null;
  }

  // ── Safe narration start ──
  function startNarration(copy) {

    const voiceEnabled =
      document.getElementById(
        'enable-voice'
      )?.checked;

    if (
      !voiceEnabled ||
      !copy ||
      voiceStarted
    ) {
      return;
    }

    const fullText =
      buildNarration(copy);

    if (!fullText?.trim()) {
      return;
    }

    voiceStarted = true;

    setTimeout(() => {

      try {

        stopVoiceSafe();

        if (
          AudioEngine?.speakCopy
        ) {

          AudioEngine.speakCopy(
            {
              attention:
                fullText
            },
            AppState.language
          );
        }

      } catch (err) {

        console.warn(
          'Narration failed:',
          err
        );

        voiceStarted = false;
      }

    }, 250);
  }

  // ── Draw text with shadow and wrapping ──
  function drawText(ctx, text, x, y, options = {}) {
    const {
      font = "'Inter', sans-serif",
      size = 48,
      color = '#ffffff',
      align = 'center',
      maxWidth = 900,
      shadow = true,
      weight = '700',
      lineHeight = 1.25,
      opacity = 1,
      scale = 1,
      glow = true,
      accent = '#D4AF37'
    } = options;

    ctx.save();
    ctx.globalAlpha = opacity;

    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);

    ctx.font =
      `${weight} ${size}px ${font}`;

    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    if (shadow) {
      ctx.shadowColor =
        'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
    }

    if (glow) {
      ctx.shadowColor =
        accent;
      ctx.shadowBlur = 24;
    }

    const words =
      text.split(' ');

    const lines = [];
    let currentLine = '';

    const textLength =
      text.length;

    let adjustedSize =
      size;

    if (textLength < 18) {
      adjustedSize *= 0.82;
    } else if (
      textLength < 30
    ) {
      adjustedSize *= 0.92;
    } else if (
      textLength > 45
    ) {
      adjustedSize *= 1.08;
    }

    ctx.font =
      `${weight} ${adjustedSize}px ${font}`;

    words.forEach(word => {

      const testLine =
        currentLine
          ? `${currentLine} ${word}`
          : word;

      const metrics =
        ctx.measureText(
          testLine
        );

      if (
        metrics.width >
          maxWidth &&
        currentLine
      ) {

        lines.push(
          currentLine
        );

        currentLine =
          word;

      } else {

        currentLine =
          testLine;
      }
    });

    lines.push(
      currentLine
    );

    const totalHeight =
      lines.length *
      adjustedSize *
      lineHeight;

    const startY =
      y -
      totalHeight / 2;

    lines.forEach(
      (line, i) => {

        ctx.fillText(
          line,
          x,
          startY +
            i *
              adjustedSize *
              lineHeight +
            adjustedSize /
              2
        );
      }
    );

    ctx.restore();
  }

  // ── Draw CTA button ──
  function drawCTA(
    ctx,
    text,
    x,
    y,
    options = {}
  ) {

    const {
      font =
        "'Inter', sans-serif",
      size = 36,
      color = '#ffffff',
      bgColor =
        'rgba(255,255,255,0.15)',
      borderColor =
        'rgba(255,255,255,0.6)',
      padding = {
        x: 40,
        y: 18
      },
      opacity = 1
    } = options;

    ctx.save();
    ctx.globalAlpha =
      opacity;

    ctx.font =
      `700 ${size}px ${font}`;

    ctx.textAlign =
      'center';

    ctx.textBaseline =
      'middle';

    const metrics =
      ctx.measureText(
        text
      );

    const btnW =
      metrics.width +
      padding.x * 2;

    const btnH =
      size +
      padding.y * 2;

    const btnX =
      x - btnW / 2;

    const btnY =
      y - btnH / 2;

    const radius =
      btnH / 2;

    ctx.beginPath();

    ctx.moveTo(
      btnX + radius,
      btnY
    );

    ctx.lineTo(
      btnX +
        btnW -
        radius,
      btnY
    );

    ctx.arcTo(
      btnX + btnW,
      btnY,
      btnX + btnW,
      btnY + btnH,
      radius
    );

    ctx.lineTo(
      btnX + btnW,
      btnY +
        btnH -
        radius
    );

    ctx.arcTo(
      btnX + btnW,
      btnY + btnH,
      btnX,
      btnY + btnH,
      radius
    );

    ctx.lineTo(
      btnX + radius,
      btnY + btnH
    );

    ctx.arcTo(
      btnX,
      btnY + btnH,
      btnX,
      btnY,
      radius
    );

    ctx.lineTo(
      btnX,
      btnY + radius
    );

    ctx.arcTo(
      btnX,
      btnY,
      btnX + btnW,
      btnY,
      radius
    );

    ctx.closePath();

    ctx.fillStyle =
      bgColor;

    ctx.fill();

    ctx.strokeStyle =
      borderColor;

    ctx.lineWidth =
      2;

    ctx.stroke();

    ctx.shadowColor =
      'rgba(0,0,0,0.5)';

    ctx.shadowBlur =
      8;

    ctx.fillStyle =
      color;

    ctx.fillText(
      text,
      x,
      y
    );

    ctx.restore();
  }

  // ── Draw urgency badge ──
  function drawUrgencyBadge(
    ctx,
    text,
    x,
    y,
    accentColor,
    opacity = 1
  ) {

    ctx.save();

    ctx.globalAlpha =
      opacity;

    ctx.font =
      "700 22px 'Inter', sans-serif";

    ctx.textAlign =
      'center';

    ctx.textBaseline =
      'middle';

    const metrics =
      ctx.measureText(
        text
      );

    const bW =
      metrics.width +
      24;

    const bH =
      36;

    const bX =
      x - bW / 2;

    const bY =
      y - bH / 2;

    ctx.fillStyle =
      accentColor;

    ctx.beginPath();

    ctx.roundRect(
      bX,
      bY,
      bW,
      bH,
      6
    );

    ctx.fill();

    ctx.fillStyle =
      '#000000';

    ctx.shadowBlur =
      0;

    ctx.fillText(
      text,
      x,
      y
    );

    ctx.restore();
  }

  // ── Draw vignette ──
  function drawVignette(
    ctx,
    w,
    h
  ) {

    const gradient =
      ctx.createRadialGradient(
        w / 2,
        h / 2,
        h * 0.3,
        w / 2,
        h / 2,
        h * 0.8
      );

    gradient.addColorStop(
      0,
      'rgba(0,0,0,0)'
    );

    gradient.addColorStop(
      1,
      'rgba(0,0,0,0.35)'
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      w,
      h
    );
  }

  // ── Determine copy phase ──
  function getCopyPhase(
    currentTimeSec,
    totalDurationSec,
    copy
  ) {

    const phases =
      [];

    if (
      copy.attention
    ) {
      phases.push(
        'attention'
      );
    }

    if (
      copy.interest
    ) {
      phases.push(
        'interest'
      );
    }

    if (
      copy.desire
    ) {
      phases.push(
        'desire'
      );
    }

    if (copy.cta) {
      phases.push(
        'cta'
      );
    }

    const phaseDuration =
      totalDurationSec /
      phases.length;

    const phaseIndex =
      Math.min(
        Math.floor(
          currentTimeSec /
            phaseDuration
        ),
        phases.length -
          1
      );

    return phases[
      phaseIndex
    ];
  }

  // ── Dynamic fade ──
  function getCopyOpacity(
    currentTimeSec,
    totalDurationSec
  ) {

    const phases =
      4;

    const phaseDuration =
      totalDurationSec /
      phases;

    const currentPhase =
      Math.floor(
        currentTimeSec /
          phaseDuration
      );

    const phaseStart =
      currentPhase *
      phaseDuration;

    const elapsed =
      currentTimeSec -
      phaseStart;

    const fadeIn =
      Math.min(
        0.4,
        phaseDuration *
          0.18
      );

    const fadeOut =
      Math.min(
        0.4,
        phaseDuration *
          0.18
      );

    if (
      elapsed < fadeIn
    ) {

      return (
        elapsed /
        fadeIn
      );
    }

    if (
      elapsed >
      phaseDuration -
        fadeOut
    ) {

      return (
        phaseDuration -
        elapsed
      ) / fadeOut;
    }

    return 1;
  }

  // ── Render a single frame ──
function renderFrame(ctx, frameData) {

  const {
    canvasW,
    canvasH,
    images,
    currentImageIndex,
    nextImageIndex,
    transitionProgress,
    imageProgress,
    copy,
    copyPhase,
    copyOpacity,
    config,
    time,
    particles
  } = frameData;

  const template =
    config.template;

  const colors =
    config.colors;

  const position =
    config.textPosition;

  const fontStack =
    getFont(
      config.niche?.fontStyle ||
      'modern-clean'
    );

  const sizes =
    calcTextSizes(
      canvasW,
      canvasH
    );

  // ── Clear canvas ──
  ctx.clearRect(
    0,
    0,
    canvasW,
    canvasH
  );

  // ── Background ──
  ctx.fillStyle =
    colors.bg;

  ctx.fillRect(
    0,
    0,
    canvasW,
    canvasH
  );

  // ── Current image ──
  if (
    images[
      currentImageIndex
    ]
  ) {

    const smartAnimation =
      config.animations[
        currentImageIndex %
        config.animations.length
      ];

    const anim =
      smartAnimation?.id ||
      'cinematic-zoom';

    const preset =
      smartAnimation?.preset ||
      null;

    AnimationEngine.applyImageAnimation(
      ctx,
      images[
        currentImageIndex
      ].img,
      canvasW,
      canvasH,
      anim,
      imageProgress,
      preset,
      time
    );
  }

  // ── Transition ──
  if (
    transitionProgress > 0 &&
    images[nextImageIndex]
  ) {

    const smartNext =
      config.animations[
        nextImageIndex %
        config.animations.length
      ];

    const nextAnim =
      smartNext?.id ||
      'cinematic-zoom';

    const nextPreset =
      smartNext?.preset ||
      null;

    ctx.save();

    ctx.globalAlpha =
      transitionProgress *
      0.9;

    AnimationEngine.applyImageAnimation(
      ctx,
      images[
        nextImageIndex
      ].img,
      canvasW,
      canvasH,
      nextAnim,
      0,
      nextPreset,
      time
    );

    ctx.restore();
  }

  // ── Overlay ──
  AnimationEngine.drawGradientOverlay(
    ctx,
    canvasW,
    canvasH,
    colors.bg,
    template.overlayOpacity +
      0.3
  );

  // ── Glow ──
  if (
    template.animations.includes(
      'glow'
    )
  ) {

    AnimationEngine.drawGlowOverlay(
      ctx,
      canvasW,
      canvasH,
      time,
      colors.accent
    );
  }

  // ── Sparkle ──
  if (
    template.animations.includes(
      'sparkle'
    ) &&
    particles
  ) {

    particles.draw(
      ctx,
      time
    );
  }

  // ── Copy ──
  const textX =
    resolveTextX(
      position,
      canvasW
    );

  const textY =
    canvasH * 0.58;

  const safeMaxW =
    canvasW * 0.85;

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
        font:
          fontStack,
        size:
          sizes.hook,
        color:
          '#FFFFFF',
        align:
          position.align,
        maxWidth:
          safeMaxW,
        opacity:
          copyOpacity,
        weight:
          '900',
        scale:
          0.88 +
          (
            copyOpacity *
            0.18
          ),
        glow: true,
        accent:
          '#D4AF37'
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
        font:
          fontStack,
        size:
          sizes.body,
        color:
          '#F5F5F5',
        align:
          position.align,
        maxWidth:
          safeMaxW,
        opacity:
          copyOpacity,
        weight:
          '700',
        glow: false
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
        font:
          fontStack,
        size:
          sizes.body,
        color:
          '#F5D061',
        align:
          position.align,
        maxWidth:
          safeMaxW,
        opacity:
          copyOpacity,
        weight:
          '800',
        glow: true,
        accent:
          '#D4AF37'
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
          colors.accent +
          'cc',
        borderColor:
          colors.accent,
        opacity:
          copyOpacity
      }
    );

    if (
      copy.urgency
    ) {

      drawUrgencyBadge(
        ctx,
        copy.urgency,
        canvasW / 2,
        ctaY -
          sizes.cta * 2.2,
        colors.accent,
        copyOpacity
      );
    }
  }

  // ── Vignette ──
  drawVignette(
    ctx,
    canvasW,
    canvasH
  );
}

  // ── Live preview loop ──
  function startPreview(
    canvas,
    images,
    copy,
    config,
    onFrame
  ) {

    stopPreview();

    isRendering = true;

    const ctx =
      canvas.getContext(
        '2d'
      );

    const W =
      canvas.width;

    const H =
      canvas.height;

    const durationConf =
      config.duration;

    const totalMs =
      durationConf.totalSeconds *
      1000;

    const transitionMs =
      durationConf.transitionTime;

    const particles =
      config.template.animations.includes(
        'sparkle'
      )
        ? new AnimationEngine.ParticleSystem(
            W,
            H,
            config.niche
              ?.colorPalette || [
              '#fff'
            ]
          )
        : null;

    let startTime =
      null;

    function loop(
      timestamp
    ) {

      if (
        !isRendering
      ) {
        return;
      }

      if (
        !startTime
      ) {

        startTime =
          timestamp;

        // ── Start narration once ──
        startNarration(
          copy
        );
      }

      const elapsed =
        (
          timestamp -
          startTime
        ) %
        totalMs;

      const currentSec =
        elapsed / 1000;

      const totalImages =
        images.length;

      const imageSlotMs =
        (
          totalMs -
          transitionMs
        ) /
        totalImages;

      const imageIndex =
        Math.floor(
          elapsed /
            imageSlotMs
        ) %
        totalImages;

      const nextIndex =
        (
          imageIndex +
          1
        ) %
        totalImages;

      const slotElapsed =
        elapsed %
        imageSlotMs;

      const imageProgress =
        slotElapsed /
        imageSlotMs;

      const transitionStart =
        imageSlotMs -
        transitionMs;

      const transitionProgress =
        slotElapsed >
        transitionStart
          ? (
              slotElapsed -
              transitionStart
            ) /
            transitionMs
          : 0;

      renderFrame(
        ctx,
        {
          canvasW:
            W,

          canvasH:
            H,

          images,

          currentImageIndex:
            imageIndex,

          nextImageIndex:
            nextIndex,

          transitionProgress,

          imageProgress,

          copy,

          copyPhase:
            getCopyPhase(
              currentSec,
              totalMs /
                1000,
              copy
            ),

          copyOpacity:
            getCopyOpacity(
              currentSec,
              totalMs /
                1000
            ),

          config,

          time:
            timestamp,

          particles
        }
      );

      if (
        onFrame
      ) {

        onFrame(
          currentSec,
          totalMs /
            1000
        );
      }

      previewRAF =
        requestAnimationFrame(
          loop
        );
    }

    previewRAF =
      requestAnimationFrame(
        loop
      );
  }

  // ── Stop preview ──
  function stopPreview() {

    isRendering =
      false;

    if (
      previewRAF
    ) {

      cancelAnimationFrame(
        previewRAF
      );

      previewRAF =
        null;
    }

    stopVoiceSafe();
  }

  // ── Render all frames ──
  async function renderAllFrames(
    canvas,
    images,
    copy,
    config,
    onProgress
  ) {

    const ctx =
      canvas.getContext(
        '2d'
      );

    const W =
      canvas.width;

    const H =
      canvas.height;

    const durationConf =
      config.duration;

    const fps =
      durationConf.framesPerSecond;

    const totalFrames =
      durationConf.totalFrames;

    const totalMs =
      durationConf.totalSeconds *
      1000;

    const transitionMs =
      durationConf.transitionTime;

    const particles =
      config.template.animations.includes(
        'sparkle'
      )
        ? new AnimationEngine.ParticleSystem(
            W,
            H,
            config.niche
              ?.colorPalette || [
              '#fff'
            ]
          )
        : null;

    const frames =
      [];

    for (
      let f = 0;
      f <
      totalFrames;
      f++
    ) {

      const elapsed =
        (f / fps) *
        1000;

      const currentSec =
        f / fps;

      const totalImages =
        images.length;

      const imageSlotMs =
        (
          totalMs -
          transitionMs
        ) /
        totalImages;

      const imageIndex =
        Math.floor(
          elapsed /
            imageSlotMs
        ) %
        totalImages;

      const nextIndex =
        (
          imageIndex +
          1
        ) %
        totalImages;

      const slotElapsed =
        elapsed %
        imageSlotMs;

      const imageProgress =
        slotElapsed /
        imageSlotMs;

      const transitionStart =
        imageSlotMs -
        transitionMs;

      const transitionProgress =
        slotElapsed >
        transitionStart
          ? (
              slotElapsed -
              transitionStart
            ) /
            transitionMs
          : 0;

      renderFrame(
        ctx,
        {
          canvasW:
            W,

          canvasH:
            H,

          images,

          currentImageIndex:
            imageIndex,

          nextImageIndex:
            nextIndex,

          transitionProgress,

          imageProgress,

          copy,

          copyPhase:
            getCopyPhase(
              currentSec,
              totalMs /
                1000,
              copy
            ),

          copyOpacity:
            getCopyOpacity(
              currentSec,
              totalMs /
                1000
            ),

          config,

          time:
            elapsed,

          particles
        }
      );

      frames.push(
        ctx.getImageData(
          0,
          0,
          W,
          H
        )
      );

      if (
        f % 10 ===
          0 &&
        onProgress
      ) {

        onProgress(
          f /
            totalFrames,
          `Rendering frame ${
            f + 1
          } / ${totalFrames}`
        );

        await new Promise(
          r =>
            setTimeout(
              r,
              0
            )
        );
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
