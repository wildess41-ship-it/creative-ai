/**
 * Creative AI — engine/audioEngine.js
 * Stable audio + voice narration engine
 */

const AudioEngine = (() => {

  // ─────────────────────────────────────
  // Music library
  // ─────────────────────────────────────
  const MUSIC_LIBRARY = {
    luxury: ['luxury-01.mp3', 'luxury-02.mp3'],
    emotional: ['emotional-01.mp3', 'emotional-02.mp3'],
    premium: ['premium-01.mp3', 'premium-02.mp3'],
    energetic: ['energetic-01.mp3', 'energetic-02.mp3'],
    viral: ['viral-01.mp3', 'viral-02.mp3'],
    ugc: ['ugc-01.mp3', 'ugc-02.mp3']
  };

  // ─────────────────────────────────────
  // Niche → category
  // ─────────────────────────────────────
  const NICHE_MUSIC_MAP = {
    jewelry: 'luxury',
    beauty: 'premium',
    fashion: 'viral',
    gadgets: 'energetic',
    home: 'emotional',
    fitness: 'energetic',
    pets: 'emotional',
    baby: 'emotional'
  };

  // ─────────────────────────────────────
  // State
  // ─────────────────────────────────────
  let audioContext = null;
  let currentSource = null;
  let gainNode = null;
  let loadedBuffer = null;

  // Voice stability
  let isSpeaking = false;
  let currentUtterance = null;
  let lastSpokenText = '';

  // ─────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────
  function getAudioContext() {

    if (!audioContext) {

      audioContext =
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();
    }

    return audioContext;
  }

  // ─────────────────────────────────────
  // Music category
  // ─────────────────────────────────────
  function resolveCategory(
    nicheId,
    override
  ) {

    if (
      override &&
      override !== 'auto'
    ) {
      return override;
    }

    return (
      NICHE_MUSIC_MAP[nicheId] ||
      'emotional'
    );
  }

  // ─────────────────────────────────────
  // Pick track
  // ─────────────────────────────────────
  function pickTrack(category) {

    const tracks =
      MUSIC_LIBRARY[category] ||
      MUSIC_LIBRARY.emotional;

    return tracks[
      Math.floor(
        Math.random() *
        tracks.length
      )
    ];
  }

  // ─────────────────────────────────────
  // Load audio file
  // ─────────────────────────────────────
  async function loadAudioFile(
    category,
    nicheId
  ) {

    const cat =
      resolveCategory(
        nicheId,
        category
      );

    const track =
      pickTrack(cat);

    const url =
      `assets/music/${track}`;

    try {

      const ctx =
        getAudioContext();

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          'File not found'
        );
      }

      const arrayBuffer =
        await response.arrayBuffer();

      loadedBuffer =
        await ctx.decodeAudioData(
          arrayBuffer
        );

      return {
        success: true,
        buffer: loadedBuffer,
        track,
        category: cat
      };

    } catch (e) {

      console.warn(
        `[AudioEngine] Failed loading ${url}`
      );

      loadedBuffer = null;

      return {
        success: false,
        track,
        category: cat
      };
    }
  }

  // ─────────────────────────────────────
  // Preview music
  // ─────────────────────────────────────
  function playPreview(
    buffer,
    volume = 0.6
  ) {

    stopPreview();

    if (!buffer) return;

    const ctx =
      getAudioContext();

    gainNode =
      ctx.createGain();

    gainNode.gain.setValueAtTime(
      0,
      ctx.currentTime
    );

    gainNode.gain.linearRampToValueAtTime(
      volume,
      ctx.currentTime + 0.5
    );

    gainNode.connect(
      ctx.destination
    );

    currentSource =
      ctx.createBufferSource();

    currentSource.buffer =
      buffer;

    currentSource.loop = true;

    currentSource.connect(
      gainNode
    );

    currentSource.start();
  }

  // ─────────────────────────────────────
  // Stop preview
  // ─────────────────────────────────────
  function stopPreview() {

    if (
      !currentSource ||
      !audioContext
    ) return;

    try {

      gainNode?.gain
        ?.linearRampToValueAtTime(
          0,
          audioContext.currentTime + 0.3
        );

      currentSource.stop(
        audioContext.currentTime + 0.3
      );

    } catch (_) {}

    currentSource = null;
    gainNode = null;
  }

  // ─────────────────────────────────────
  // Export
  // ─────────────────────────────────────
  async function prepareForExport(
    nicheId,
    musicCategory
  ) {

    const result =
      await loadAudioFile(
        musicCategory,
        nicheId
      );

    return {
      buffer:
        result.success
          ? result.buffer
          : null,

      category:
        result.category,

      hasMusicFile:
        result.success
    };
  }

  // ─────────────────────────────────────
  // Float32 export
  // ─────────────────────────────────────
  function bufferToFloat32(
    audioBuffer,
    targetSampleRate,
    durationSeconds
  ) {

    const targetSamples =
      Math.ceil(
        targetSampleRate *
        durationSeconds
      );

    return new Promise(
      (resolve) => {

        const offline =
          new OfflineAudioContext(
            1,
            targetSamples,
            targetSampleRate
          );

        const source =
          offline
            .createBufferSource();

        source.buffer =
          audioBuffer;

        source.loop = true;

        const gain =
          offline.createGain();

        gain.gain.setValueAtTime(
          0,
          0
        );

        gain.gain.linearRampToValueAtTime(
          0.7,
          0.5
        );

        gain.gain.setValueAtTime(
          0.7,
          durationSeconds - 0.8
        );

        gain.gain.linearRampToValueAtTime(
          0,
          durationSeconds
        );

        source.connect(gain);
        gain.connect(
          offline.destination
        );

        source.start(0);

        offline
          .startRendering()
          .then(rendered => {

            resolve(
              rendered.getChannelData(0)
            );

          })
          .catch(() => {

            resolve(
              new Float32Array(
                targetSamples
              )
            );
          });
      }
    );
  }

  // ─────────────────────────────────────
  // Wait voices (Chrome fix)
  // ─────────────────────────────────────
  function getVoicesSafe() {

    return new Promise(resolve => {

      const voices =
        speechSynthesis.getVoices();

      if (voices.length) {
        resolve(voices);
        return;
      }

      speechSynthesis.onvoiceschanged =
        () => {

          resolve(
            speechSynthesis.getVoices()
          );
        };
    });
  }

  // ─────────────────────────────────────
  // Speak copy
  // ─────────────────────────────────────
  async function speakCopy(
    copy,
    language = 'en-UK'
  ) {

    if (
      !(
        'speechSynthesis'
        in window
      )
    ) {
      console.warn(
        '[AudioEngine] Speech API unsupported'
      );
      return;
    }

    const text = [
      copy?.attention,
      copy?.interest,
      copy?.desire,
      copy?.cta
    ]
      .filter(Boolean)
      .join('. ');

    if (!text.trim()) return;

    // avoid replay spam
    if (
      isSpeaking &&
      lastSpokenText === text
    ) {
      return;
    }

    lastSpokenText = text;

    const langMap = {
      'en-UK': 'en-GB',
      'en-US': 'en-US',
      'pt-BR': 'pt-BR',
      'fr-FR': 'fr-FR',
      'es-ES': 'es-ES',
      'es-MX': 'es-MX',
      'de-DE': 'de-DE'
    };

    const targetLang =
      langMap[language] ||
      'en-GB';

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    utterance.lang =
      targetLang;

    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices =
      await getVoicesSafe();

    // Better voice preference
    const preferred =
      voices.find(v =>
        v.lang === targetLang &&
        /google|female|natural/i
          .test(v.name)
      ) ||

      voices.find(v =>
        v.lang === targetLang
      );

    if (preferred) {
      utterance.voice =
        preferred;
    }

    utterance.onstart =
      () => {

        isSpeaking = true;
      };

    utterance.onend =
      () => {

        isSpeaking = false;
        currentUtterance = null;
      };

    utterance.onerror =
      () => {

        isSpeaking = false;
        currentUtterance = null;
      };

    currentUtterance =
      utterance;

    speechSynthesis.speak(
      utterance
    );
  }

  // ─────────────────────────────────────
  // Stop voice
  // ─────────────────────────────────────
  function stopVoice(
    force = false
  ) {

    if (
      !(
        'speechSynthesis'
        in window
      )
    ) return;

    // only force stop
    if (force) {

      speechSynthesis.cancel();

      isSpeaking = false;

      currentUtterance =
        null;

      lastSpokenText = '';
    }
  }

  // ─────────────────────────────────────
  // Public API
  // ─────────────────────────────────────
  return {

    resolveCategory,
    pickTrack,
    loadAudioFile,

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
