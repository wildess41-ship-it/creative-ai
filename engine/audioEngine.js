/**
 * Creative AI — engine/audioEngine.js
 * Manages music selection and audio mixing for creatives.
 * Responsibility: Music category selection, audio loading, fade in/out, mixing.
 *
 * NOTE: Since this is a 100% static/browser project with no server,
 * audio files are referenced from /assets/music/. Users can add their own
 * royalty-free MP3 files to that folder. The engine also generates a
 * procedural tone-based fallback when no audio files are present.
 */

const AudioEngine = (() => {

  // ── Music library manifest ──
  // Each entry maps a category to a list of filenames in /assets/music/
  // Users should place royalty-free MP3 files here.
  const MUSIC_LIBRARY = {
    luxury:    ['luxury-01.mp3', 'luxury-02.mp3'],
    emotional: ['emotional-01.mp3', 'emotional-02.mp3'],
    premium:   ['premium-01.mp3', 'premium-02.mp3'],
    energetic: ['energetic-01.mp3', 'energetic-02.mp3'],
    viral:     ['viral-01.mp3', 'viral-02.mp3'],
    ugc:       ['ugc-01.mp3', 'ugc-02.mp3']
  };

  // ── Niche → music category map ──
  const NICHE_MUSIC_MAP = {
    jewelry:  'luxury',
    beauty:   'premium',
    fashion:  'viral',
    gadgets:  'energetic',
    home:     'emotional',
    fitness:  'energetic',
    pets:     'emotional',
    baby:     'emotional'
  };

  // ── State ──
  let audioContext = null;
  let currentSource = null;
  let gainNode = null;
  let loadedBuffer = null;

  // ── Get AudioContext (lazy init) ──
  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  // ── Resolve music category ──
  function resolveCategory(nicheId, override) {
    if (override && override !== 'auto') return override;
    return NICHE_MUSIC_MAP[nicheId] || 'emotional';
  }

  // ── Pick random track from category ──
  function pickTrack(category) {
    const tracks = MUSIC_LIBRARY[category] || MUSIC_LIBRARY.emotional;
    return tracks[Math.floor(Math.random() * tracks.length)];
  }

  // ── Try to load audio file ──
  async function loadAudioFile(category, nicheId) {
    const cat   = resolveCategory(nicheId, category);
    const track = pickTrack(cat);
    const url   = `assets/music/${track}`;

    try {
      const ctx = getAudioContext();
      const response = await fetch(url);
      if (!response.ok) throw new Error('File not found');
      const arrayBuffer = await response.arrayBuffer();
      loadedBuffer = await ctx.decodeAudioData(arrayBuffer);
      return { success: true, buffer: loadedBuffer, track, category: cat };
    } catch (e) {
      console.warn(`[AudioEngine] Could not load ${url}. Using procedural fallback.`);
      loadedBuffer = null;
      return { success: false, track, category: cat };
    }
  }

  // ── Generate procedural ambient tone (fallback) ──
  function generateProceduralTone(durationSeconds, category) {
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const numSamples = Math.ceil(sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(2, numSamples, sampleRate);

    // Category-based frequency profiles
    const profiles = {
      luxury:    { base: 220, harmonics: [1, 2, 3],    attack: 0.5, decay: 0.3 },
      emotional: { base: 196, harmonics: [1, 1.5, 2],  attack: 0.8, decay: 0.5 },
      premium:   { base: 261, harmonics: [1, 2, 4],    attack: 0.4, decay: 0.3 },
      energetic: { base: 440, harmonics: [1, 2, 3, 4], attack: 0.1, decay: 0.1 },
      viral:     { base: 330, harmonics: [1, 2, 3],    attack: 0.2, decay: 0.2 },
      ugc:       { base: 293, harmonics: [1, 1.5, 2],  attack: 0.3, decay: 0.4 }
    };

    const profile = profiles[category] || profiles.emotional;

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        // Sum harmonics
        profile.harmonics.forEach((h, idx) => {
          const amp = 1 / (idx + 1);
          sample += amp * Math.sin(2 * Math.PI * profile.base * h * t);
        });

        // Envelope
        const attackSamples = profile.attack * sampleRate;
        const decaySamples  = profile.decay  * sampleRate;
        const releaseSamples = 0.5 * sampleRate;
        let env = 1;
        if (i < attackSamples) env = i / attackSamples;
        else if (i > numSamples - releaseSamples) env = (numSamples - i) / releaseSamples;

        data[i] = sample * env * 0.12; // Low volume
      }
    }

    return buffer;
  }

  // ── Play audio for preview ──
  function playPreview(buffer, volume = 0.6) {
    stopPreview();
    const ctx = getAudioContext();
    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.5);
    gainNode.connect(ctx.destination);

    currentSource = ctx.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.loop = true;
    currentSource.connect(gainNode);
    currentSource.start();
  }

  // ── Stop preview ──
  function stopPreview() {
    if (currentSource) {
      try {
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
        currentSource.stop(audioContext.currentTime + 0.3);
      } catch (e) {}
      currentSource = null;
      gainNode = null;
    }
  }

  // ── Mix audio into video frames (returns AudioBuffer for export) ──
  async function prepareForExport(nicheId, musicCategory, durationSeconds) {
    const result = await loadAudioFile(musicCategory, nicheId);

    let buffer;

if (result.success && result.buffer) {

  buffer = result.buffer;

} else {

  // No fallback sound
  // Keep video silent
  buffer = null;
}

    return {
      buffer,
      category: result.category,
      hasMusicFile: result.success
    };
  }

  // ── Render audio to PCM Float32 array (for FFmpeg mixing) ──
  function bufferToFloat32(audioBuffer, targetSampleRate, durationSeconds) {
    const ctx = getAudioContext();
    const targetSamples = Math.ceil(targetSampleRate * durationSeconds);

    // Use OfflineAudioContext to resample
    return new Promise((resolve) => {
      const offline = new OfflineAudioContext(1, targetSamples, targetSampleRate);
      const source = offline.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;

      const gain = offline.createGain();
      gain.gain.setValueAtTime(0, 0);
      gain.gain.linearRampToValueAtTime(0.7, 0.5);
      gain.gain.setValueAtTime(0.7, durationSeconds - 0.8);
      gain.gain.linearRampToValueAtTime(0, durationSeconds);

      source.connect(gain);
      gain.connect(offline.destination);
      source.start(0);

      offline.startRendering().then(rendered => {
        resolve(rendered.getChannelData(0));
      }).catch(() => {
        // Fallback: return silence
        resolve(new Float32Array(targetSamples));
      });
    });
  }

   // ── Voice narration (Web Speech API) ──
function speakCopy(copy, language = 'en-UK') {

  if (!('speechSynthesis' in window)) {
    console.warn('[AudioEngine] Speech API not supported');
    return;
  }

  speechSynthesis.cancel();

  const text = [
    copy.attention,
    copy.interest,
    copy.desire,
    copy.cta
  ]
  .filter(Boolean)
  .join('. ');

  const utterance =
    new SpeechSynthesisUtterance(text);

  // Language map
  const langMap = {
    'en-UK': 'en-GB',
    'en-US': 'en-US',
    'pt-BR': 'pt-BR',
    'fr-FR': 'fr-FR',
    'es-ES': 'es-ES',
    'es-MX': 'es-MX',
    'de-DE': 'de-DE'
  };

  utterance.lang =
    langMap[language] || 'en-GB';

  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Try premium voices
  const voices =
    speechSynthesis.getVoices();

  const preferred =
    voices.find(v =>
      v.lang.includes(
        utterance.lang
      )
    );

  if (preferred) {
    utterance.voice =
      preferred;
  }

  speechSynthesis.speak(
    utterance
  );
}

// ── Stop voice narration ──
function stopVoice() {
  if (
    'speechSynthesis' in window
  ) {
    speechSynthesis.cancel();
  }
}

  // ── Public API ──
  return {
    resolveCategory,
    pickTrack,
    loadAudioFile,
    generateProceduralTone,
    playPreview,
    stopPreview,
    prepareForExport,
    bufferToFloat32,

  // Voice
  speakCopy,
  stopVoice,

  NICHE_MUSIC_MAP,
  MUSIC_LIBRARY
};

})();
