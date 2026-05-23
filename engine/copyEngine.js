/**
 * Creative AI — engine/copyEngine.js
 * Generates AIDA copywriting from the localization library.
 * Responsibility: Load locale data, pick copy by niche, build AIDA structure.
 */

const CopyEngine = (() => {

  // ── Cache ──
  const localeCache = {};

  // ── Country → default locale map ──
  const countryLocaleMap = {
    BR: 'pt-BR',
    US: 'en-US',
    UK: 'en-UK',
    ES: 'es-ES',
    MX: 'es-MX',
    FR: 'fr-FR',
    CA: 'en-US',
    DE: 'de-DE'
  };

  // ── Load locale JSON ──
  async function loadLocale(localeCode) {
    if (localeCache[localeCode]) return localeCache[localeCode];
    try {
      const res = await fetch(`localization/${localeCode}.json`);
      if (!res.ok) throw new Error(`Locale not found: ${localeCode}`);
      const data = await res.json();
      localeCache[localeCode] = data;
      return data;
    } catch (e) {
      console.warn(`[CopyEngine] Could not load ${localeCode}, falling back to en-US`);
      if (localeCode !== 'en-US') return loadLocale('en-US');
      return null;
    }
  }

  // ── Get locale from country or explicit code ──
  function resolveLocale(country, language) {
    if (language && language !== 'auto') return language;
    return countryLocaleMap[country] || 'en-US';
  }

  // ── Pick random item from array ──
  function pick(arr) {
    if (!arr || !arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

// ── Smart emotional copy by niche + country ──
function getSmartCopyProfile(nicheId, country) {

  const profiles = {

    jewelry: {
      UK: 'luxury',
      US: 'confidence',
      BR: 'romantic',
      FR: 'elegant',
      DE: 'premium'
    },

    beauty: {
      UK: 'confidence',
      US: 'transformation',
      BR: 'beauty'
    },

    fashion: {
      UK: 'style',
      US: 'confidence',
      BR: 'viral'
    }
  };

  return profiles[nicheId]?.[country] || 'premium';
}

  // ── Generate AIDA copy for a niche ──
  async function generateAIDA(nicheId, country, language, productName) {
    const localeCode = resolveLocale(country, language);
    const locale = await loadLocale(localeCode);

    if (!locale) {
      return {
        attention: 'Discover something amazing',
        interest:  'Premium quality you can trust',
        desire:    'The upgrade you deserve',
        cta:       'Shop now',
        urgency:   'Limited time offer',
        locale:    localeCode
      };
    }

    // Get niche-specific copy, fallback to 'jewelry' if niche not found
    const niche = nicheId in (locale.hooks || {}) ? nicheId : Object.keys(locale.hooks || {})[0] || 'jewelry';

    const hooks    = locale.hooks?.[niche]    || locale.hooks?.jewelry    || [];
    const interest = locale.interest?.[niche] || locale.interest?.jewelry || [];
    const desire   = locale.desire?.[niche]   || locale.desire?.jewelry   || [];
    const cta      = locale.cta?.[niche]      || locale.cta?.jewelry      || [];
    const urgency  = locale.urgency           || [];

    // Build AIDA copy
    const profile =
  getSmartCopyProfile(
    nicheId,
    country
  );

let attention = pick(hooks);
let interestText = pick(interest);
let desireText = pick(desire);
let ctaText = pick(cta);

// Jewelry UK premium override
if (
  nicheId === 'jewelry' &&
  profile === 'luxury'
) {

  const premiumHooks = [
    "She won't stop wearing it.",
    "A gift she'll never forget.",
    "Everyone keeps asking about it.",
    "The detail changes everything."
  ];

  const premiumInterest = [
    "Elegant enough for every moment.",
    "Luxury without the luxury price.",
    "Crafted to stand out beautifully."
  ];

  const premiumDesire = [
    "Elegant. Premium. Unforgettable.",
    "Made to be noticed.",
    "Luxury you can actually wear daily."
  ];

  const premiumCTA = [
    "Get yours today",
    "Shop now",
    "Limited stock"
  ];

  attention = pick(premiumHooks);
  interestText = pick(premiumInterest);
  desireText = pick(premiumDesire);
  ctaText = pick(premiumCTA);
}
    // Inject product name if provided
    if (productName) {
      // Optionally append product name to desire text
      if (desireText && !desireText.includes(productName)) {
        // Keep it clean — don't force name if it doesn't fit
      }
    }

    return {
      attention:   attention   || 'Discover something amazing',
      interest:    interestText || 'Premium quality you can trust',
      desire:      desireText   || 'The upgrade you deserve',
      cta:         ctaText      || 'Shop now',
      urgency:     pick(urgency) || 'Limited time offer',
      locale:      localeCode
    };
  }

  // ── Generate multiple copy variations ──
  async function generateVariations(nicheId, country, language, count = 3) {
    const variations = [];
    for (let i = 0; i < count; i++) {
      const copy = await generateAIDA(nicheId, country, language);
      variations.push(copy);
    }
    return variations;
  }

  // ── Validate copy lengths (AIDA limits) ──
  function validateCopyLengths(copy) {
    const wordCount = (str) => str.trim().split(/\s+/).length;
    return {
      attention: { text: copy.attention, words: wordCount(copy.attention), limit: 7,  ok: wordCount(copy.attention) <= 7 },
      interest:  { text: copy.interest,  words: wordCount(copy.interest),  limit: 10, ok: wordCount(copy.interest)  <= 10 },
      desire:    { text: copy.desire,    words: wordCount(copy.desire),    limit: 8,  ok: wordCount(copy.desire)    <= 8 },
      cta:       { text: copy.cta,       words: wordCount(copy.cta),       limit: 4,  ok: wordCount(copy.cta)       <= 4 }
    };
  }

  // ── Format copy for canvas rendering ──
  function formatForCanvas(copy, template) {
    return [
      {
        phase:    'attention',
        text:     copy.attention,
        startSec: 0,
        endSec:   2,
        style:    'hook'
      },
      {
        phase:    'interest',
        text:     copy.interest,
        startSec: 2,
        endSec:   5,
        style:    'body'
      },
      {
        phase:    'desire',
        text:     copy.desire,
        startSec: 5,
        endSec:   8,
        style:    'body'
      },
      {
        phase:    'cta',
        text:     copy.cta,
        startSec: 8,
        endSec:   12,
        style:    'cta'
      }
    ];
  }

  // ── Public API ──
  return {
    loadLocale,
    resolveLocale,
    generateAIDA,
    generateVariations,
    validateCopyLengths,
    formatForCanvas,
    countryLocaleMap
  };

})();
