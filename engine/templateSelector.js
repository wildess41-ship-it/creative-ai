/**
 * Creative AI — engine/templateSelector.js
 * Selects the best template for a given niche, country, and style preference.
 * Responsibility: Template resolution, niche data loading, UI population.
 */

const TemplateSelector = (() => {

  // ── Cached data ──
  let nichesData = null;
  let templatesData = null;

  // ── Load JSON data ──
  async function loadData() {
    if (nichesData && templatesData) return;
    try {
      const [nichesRes, templatesRes] = await Promise.all([
        fetch('niches/niches.json'),
        fetch('templates/templates.json')
      ]);
      nichesData    = await nichesRes.json();
      templatesData = await templatesRes.json();
    } catch (e) {
      console.error('[TemplateSelector] Failed to load data:', e);
      // Fallback inline data
      nichesData    = { niches: [] };
      templatesData = { animationPresets: {}, textPositions: {}, ratioConfigs: {}, durationConfigs: {} };
    }
  }

  // ── Get niche config by id ──
  function getNiche(nicheId) {
    if (!nichesData) return null;
    return nichesData.niches.find(n => n.id === nicheId) || null;
  }

  // ── Get all niches ──
  function getAllNiches() {
    return nichesData ? nichesData.niches : [];
  }

  // ── Get templates for a niche ──
  function getTemplatesForNiche(nicheId) {
    const niche = getNiche(nicheId);
    return niche ? niche.templates : [];
  }

  // ── Get specific template ──
  function getTemplate(nicheId, templateId) {
    const templates = getTemplatesForNiche(nicheId);
    return templates.find(t => t.id === templateId) || templates[0] || null;
  }

  // ── Auto-select best template based on niche + country ──
  function autoSelect(nicheId, country) {
    const templates = getTemplatesForNiche(nicheId);
    if (!templates.length) return null;

    // Country-based preference rules
    const luxuryCountries = ['FR', 'UK', 'DE'];
    const viralCountries  = ['US', 'MX', 'BR'];

    if (luxuryCountries.includes(country)) {
      // Prefer luxury/premium templates
      const luxury = templates.find(t =>
        t.name.toLowerCase().includes('luxury') ||
        t.name.toLowerCase().includes('premium') ||
        t.name.toLowerCase().includes('elegant')
      );
      if (luxury) return luxury;
    }

    if (viralCountries.includes(country)) {
      // Prefer viral/energetic templates
      const viral = templates.find(t =>
        t.name.toLowerCase().includes('viral') ||
        t.name.toLowerCase().includes('power') ||
        t.name.toLowerCase().includes('wow')
      );
      if (viral) return viral;
    }

    // Default: first template
    return templates[0];
  }

  // ── Get animation preset ──
  function getAnimationPreset(animationId) {
    if (!templatesData) return null;
    return templatesData.animationPresets[animationId] || null;
  }

  // ── Get ratio config ──
  function getRatioConfig(ratio) {
    if (!templatesData) return null;
    return templatesData.ratioConfigs[ratio] || templatesData.ratioConfigs['9:16'];
  }

  // ── Get duration config ──
  function getDurationConfig(duration) {
    if (!templatesData) return null;
    return templatesData.durationConfigs[duration] || templatesData.durationConfigs['short'];
  }

  // ── Get text position config ──
  function getTextPosition(positionId) {
    if (!templatesData) return { x: '50%', y: '85%', align: 'center', anchor: 'bottom' };
    return templatesData.textPositions[positionId] || templatesData.textPositions['bottom-center'];
  }

  // ── Populate niche select element ──
  function populateNicheSelect(selectEl) {
    if (!nichesData) return;
    selectEl.innerHTML = '';
    nichesData.niches.forEach(niche => {
      const opt = document.createElement('option');
      opt.value = niche.id;
      opt.textContent = `${niche.icon} ${niche.label}`;
      selectEl.appendChild(opt);
    });
  }

  // ── Populate template select based on niche ──
  function populateTemplateSelect(selectEl, nicheId) {
    const templates = getTemplatesForNiche(nicheId);
    selectEl.innerHTML = '';
    templates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      opt.title = t.description;
      selectEl.appendChild(opt);
    });
  }

  // ── Build complete creative config ──
  function buildCreativeConfig(nicheId, templateId, ratio, duration, country) {
    const niche    = getNiche(nicheId);
    const template = getTemplate(nicheId, templateId) || autoSelect(nicheId, country);
    const ratioConf    = getRatioConfig(ratio);
    const durationConf = getDurationConfig(duration);

    if (!niche || !template) return null;

    return {
      niche,
      template,
      ratio: ratioConf,
      duration: durationConf,
      animations: template.animations.map(a => ({
        id: a,
        preset: getAnimationPreset(a)
      })),
      textPosition: getTextPosition(template.textPosition),
      colors: {
        bg:     template.bgColor,
        text:   template.textColor,
        accent: template.accentColor
      }
    };
  }

  // ── Public API ──
  return {
    loadData,
    getNiche,
    getAllNiches,
    getTemplatesForNiche,
    getTemplate,
    autoSelect,
    getAnimationPreset,
    getRatioConfig,
    getDurationConfig,
    getTextPosition,
    populateNicheSelect,
    populateTemplateSelect,
    buildCreativeConfig
  };

})();
