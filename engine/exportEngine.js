/**
 * Creative AI — engine/exportEngine.js
 * Exports the rendered canvas animation as an MP4 video file.
 * Uses MediaRecorder API (browser-native, no server required).
 * Responsibility: Video capture, audio mixing, file download.
 *
 * Strategy:
 *   1. Use canvas.captureStream() to get a video track
 *   2. Use AudioContext to create an audio track from the music buffer
 *   3. Combine both into a MediaStream
 *   4. Record with MediaRecorder → WebM (most compatible)
 *   5. Offer download as .webm (widely supported) or attempt MP4 rename
 *
 * Note: True MP4 encoding in the browser requires FFmpeg.wasm which is
 * very heavy (~30MB). This engine uses the native MediaRecorder for
 * maximum portability and zero dependencies, then labels the output
 * as .mp4 for user convenience (most modern players accept WebM in .mp4).
 * For true MP4 re-encoding, users can run the output through HandBrake.
 */

const ExportEngine = (() => {

  // ── Check MediaRecorder support ──
  function isSupported() {
    return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement !== 'undefined';
  }

  // ── Get best supported MIME type ──
  function getBestMimeType() {
    const candidates = [
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      'video/mp4',
      'video/webm; codecs="vp9, opus"',
      'video/webm; codecs="vp8, opus"',
      'video/webm; codecs="vp9"',
      'video/webm; codecs="vp8"',
      'video/webm'
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'video/webm';
  }

  // ── Get file extension from MIME ──
  function getExtension(mimeType) {
    if (mimeType.startsWith('video/mp4')) return 'mp4';
    return 'mp4'; // Label as mp4 for user convenience
  }

  // ── Create audio source node from buffer ──
  function createAudioStream(audioBuffer, audioContext) {
    if (!audioBuffer) return null;
    try {
      const destination = audioContext.createMediaStreamDestination();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;

      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0, audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.5);

      source.connect(gain);
      gain.connect(destination);
      source.start();

      return { stream: destination.stream, source, gain };
    } catch (e) {
      console.warn('[ExportEngine] Could not create audio stream:', e);
      return null;
    }
  }

  // ── Fade out audio ──
  function fadeOutAudio(audioNodes, audioContext, duration = 0.8) {
    if (!audioNodes) return;
    try {
      audioNodes.gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
      setTimeout(() => {
        try { audioNodes.source.stop(); } catch (e) {}
      }, duration * 1000 + 100);
    } catch (e) {}
  }

  // ── Main export function ──
  async function exportVideo(canvas, audioBuffer, config, productName, onProgress) {
    return new Promise(async (resolve, reject) => {
      if (!isSupported()) {
        reject(new Error('MediaRecorder not supported in this browser.'));
        return;
      }

      const mimeType  = getBestMimeType();
      const extension = getExtension(mimeType);
      const fps       = config.duration.framesPerSecond || 30;
      const totalSecs = config.duration.totalSeconds || 10;
      const bitrate   = 4_000_000; // 4 Mbps — high quality

      if (onProgress) onProgress(0.02, 'Initializing export…');

      // ── Setup canvas stream ──
      let canvasStream;
      try {
        canvasStream = canvas.captureStream(fps);
      } catch (e) {
        reject(new Error('Could not capture canvas stream: ' + e.message));
        return;
      }

      // ── Setup audio stream ──
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioNodes = audioBuffer ? createAudioStream(audioBuffer, audioCtx) : null;

      // ── Combine streams ──
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
      if (audioNodes) {
        audioNodes.stream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }

      // ── Setup MediaRecorder ──
      let recorder;
      try {
        recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: bitrate
        });
      } catch (e) {
        // Fallback without options
        try {
          recorder = new MediaRecorder(combinedStream);
        } catch (e2) {
          reject(new Error('MediaRecorder creation failed: ' + e2.message));
          return;
        }
      }

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        if (onProgress) onProgress(0.95, 'Finalizing file…');

        const blob = new Blob(chunks, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const filename = sanitizeFilename(productName || 'creative') + `.${extension}`;

        if (onProgress) onProgress(1.0, 'Export complete!');
        resolve({ blob, url, filename, mimeType, extension });

        // Cleanup
        try { audioCtx.close(); } catch (e) {}
      };

      recorder.onerror = (e) => {
        reject(new Error('Recording error: ' + e.error?.message || 'Unknown'));
      };

      // ── Start recording ──
      recorder.start(100); // Collect data every 100ms
      if (onProgress) onProgress(0.05, 'Recording started…');

      // ── Progress tracking ──
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed  = (Date.now() - startTime) / 1000;
        const progress = Math.min(0.9, 0.05 + (elapsed / totalSecs) * 0.85);
        if (onProgress) onProgress(progress, `Recording… ${Math.round(elapsed)}s / ${totalSecs}s`);
      }, 500);

      // ── Stop after duration ──
      setTimeout(() => {
        clearInterval(progressInterval);
        if (audioNodes) fadeOutAudio(audioNodes, audioCtx, 0.8);
        setTimeout(() => {
          try { recorder.stop(); } catch (e) {}
        }, 900);
      }, totalSecs * 1000);
    });
  }

  // ── Trigger file download ──
  function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // ── Sanitize filename ──
  function sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) || 'creative';
  }

  // ── Generate filename ──
  function generateFilename(productName, niche, ratio) {
    const parts = [
      sanitizeFilename(productName || 'product'),
      niche || 'creative',
      ratio.replace(':', 'x'),
      new Date().toISOString().slice(0, 10)
    ];
    return parts.join('-');
  }

  // ── Public API ──
  return {
    isSupported,
    getBestMimeType,
    getExtension,
    exportVideo,
    downloadFile,
    sanitizeFilename,
    generateFilename
  };

})();
