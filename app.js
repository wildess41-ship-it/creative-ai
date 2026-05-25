/**
 * Creative AI — app.js
 * Main application controller. Integrates all engine modules.
 * Handles UI events, state management, and orchestrates the creative pipeline.
 *
 * Pipeline:
 *   Upload → Template Selection → Copy Generation → Animation → Audio → Render → Export
 */

'use strict';

// ============================================================
// APP STATE
// ============================================================
const AppState = {

  mode: 'single',

  // ── Projects ──
  currentProjectId:
    null,

  projects: [],

  // ── Creative Settings ──
  country: 'BR',

  language:
    'pt-BR',

  ratio:
    '9:16',

  niche:
    'jewelry',

  templateId:
    '',

  duration:
    'short',

  musicStyle:
    'auto',

  productName:
    '',

  // ── Current Creative ──
  currentCopy:
    null,

  currentConfig:
    null,

  exportResults:
    [],

  isGenerating:
    false
};

// ============================================================
// DOM REFERENCES
// ============================================================
const DOM = {};

function cacheDom() {
  // Mode
  DOM.btnSingle      = document.getElementById('btn-single');
  DOM.btnBatch       = document.getElementById('btn-batch');
  DOM.uploadSingle   = document.getElementById('upload-single');
  DOM.uploadBatch    = document.getElementById('upload-batch');
  DOM.uploadTitleSingle = document.getElementById('upload-title-single');
  DOM.uploadTitleBatch  = document.getElementById('upload-title-batch');

  // Single upload
  DOM.dropZoneSingle   = document.getElementById('drop-zone-single');
  DOM.fileInputSingle  = document.getElementById('file-input-single');
  DOM.previewGridSingle = document.getElementById('preview-grid-single');
  DOM.uploadCounter    = document.getElementById('upload-counter-single');

  // Batch upload
  DOM.batchProductsList = document.getElementById('batch-products-list');
  DOM.btnAddProduct     = document.getElementById('btn-add-product');
  DOM.fileInputBatch    = document.getElementById('file-input-batch');

  // Settings
  DOM.selCountry   = document.getElementById('sel-country');
  DOM.selLanguage  = document.getElementById('sel-language');
  DOM.selNiche     = document.getElementById('sel-niche');
  DOM.selTemplate  = document.getElementById('sel-template');
  DOM.selDuration  = document.getElementById('sel-duration');
  DOM.selMusic     = document.getElementById('sel-music');
  DOM.inpProductName = document.getElementById('inp-product-name');

  // Ratio
  DOM.ratioBtns = document.querySelectorAll('.ratio-btn');

  // Copy preview
  DOM.copyAttention = document.getElementById('copy-attention');
  DOM.copyInterest  = document.getElementById('copy-interest');
  DOM.copyDesire    = document.getElementById('copy-desire');
  DOM.copyCTA       = document.getElementById('copy-cta');
  DOM.btnRegenerateCopy = document.getElementById('btn-regenerate-copy');

  // Generate
  DOM.btnGenerate   = document.getElementById('btn-generate');

  // Projects
DOM.btnNewProject =
  document.getElementById(
    'btn-new-project'
  );

DOM.currentProjectName =
  document.getElementById(
    'current-project-name'
  );

  // Progress
  DOM.sectionProgress  = document.getElementById('section-progress');
  DOM.progressSingle   = document.getElementById('progress-single');
  DOM.progressBatch    = document.getElementById('progress-batch');
  DOM.progressBarFill  = document.getElementById('progress-bar-fill');
  DOM.progressStatus   = document.getElementById('progress-status');
  DOM.progressSteps    = document.getElementById('progress-steps');
  DOM.batchQueueList   = document.getElementById('batch-queue-list');

  // Result
  DOM.sectionResult    = document.getElementById('section-result');
  DOM.previewCanvas    = document.getElementById('preview-canvas');
  DOM.previewVideo     = document.getElementById('preview-video');
  DOM.videoPreviewWrap = document.getElementById('video-preview-wrap');
  DOM.btnDownload      = document.getElementById('btn-download');
  DOM.btnNewCreative   = document.getElementById('btn-new-creative');
  DOM.batchResults     = document.getElementById('batch-results');
  DOM.batchResultsList = document.getElementById('batch-results-list');

  // Toast
  DOM.toast = document.getElementById('toast');
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
let toastTimer = null;

function showToast(message, type = 'info', duration = 3000) {
  const toast = DOM.toast;
  toast.textContent = message;
  toast.className = `toast toast--${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ============================================================
// MODE SWITCHING
// ============================================================
function setMode(mode) {
  AppState.mode = mode;

  DOM.btnSingle.classList.toggle('active', mode === 'single');
  DOM.btnBatch.classList.toggle('active', mode === 'batch');

  DOM.uploadSingle.style.display = mode === 'single' ? 'block' : 'none';
  DOM.uploadBatch.style.display  = mode === 'batch'  ? 'block' : 'none';
  DOM.uploadTitleSingle.style.display = mode === 'single' ? 'inline' : 'none';
  DOM.uploadTitleBatch.style.display  = mode === 'batch'  ? 'inline' : 'none';
}

// ============================================================
// UPLOAD — SINGLE MODE
// ============================================================
async function handleSingleFiles(fileList) {
  const result = await UploadEngine.processSingleFiles(fileList);

  if (result.errors.length > 0) {
    showToast(result.errors[0], 'error');
  }

  UploadEngine.renderSingleGrid(DOM.previewGridSingle, () => {
    updateUploadCounter();
    triggerCopyRegenerate();
  });

  updateUploadCounter();
  if (result.newCount > 0) triggerCopyRegenerate();
}

function updateUploadCounter() {
  const count = UploadEngine.getSingleCount();
  const min   = UploadEngine.MIN_IMAGES;
  const max   = UploadEngine.MAX_IMAGES;
  DOM.uploadCounter.textContent = `${count} image${count !== 1 ? 's' : ''} selected (min ${min}, max ${max})`;
  DOM.uploadCounter.style.color = count >= min ? 'var(--success)' : 'var(--text-muted)';
}

// ============================================================
// UPLOAD — BATCH MODE
// ============================================================
let pendingBatchProductName = '';

function renderBatchProductsList() {
  const products = UploadEngine.getBatchProducts();
  DOM.batchProductsList.innerHTML = '';

  if (products.length === 0) {
    DOM.batchProductsList.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">No products added yet. Click "+ Add Product" to start.</p>';
    return;
  }

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'batch-product-card';

    const thumbsHtml = product.images.slice(0, 5).map(img =>
      `<img class="batch-product-card__thumb" src="${img.url}" alt="${img.name}" />`
    ).join('');

    const moreCount = product.images.length > 5 ? `+${product.images.length - 5}` : '';

    card.innerHTML = `
      <div class="batch-product-card__thumbs">
        ${thumbsHtml}
        ${moreCount ? `<span style="font-size:0.75rem;color:var(--text-muted);align-self:center">${moreCount}</span>` : ''}
      </div>
      <div class="batch-product-card__info">
        <div class="batch-product-card__name">${product.name}</div>
        <div class="batch-product-card__count">${product.images.length} image${product.images.length !== 1 ? 's' : ''}</div>
      </div>
      <button class="batch-product-card__remove" data-id="${product.id}">Remove</button>
    `;

    card.querySelector('.batch-product-card__remove').addEventListener('click', () => {
      UploadEngine.removeBatchProduct(product.id);
      renderBatchProductsList();
    });

    DOM.batchProductsList.appendChild(card);
  });
}

function promptAddProduct() {
  const name = prompt('Product name (optional):', `Product ${UploadEngine.getBatchProducts().length + 1}`);
  pendingBatchProductName = name || `Product ${UploadEngine.getBatchProducts().length + 1}`;
  DOM.fileInputBatch.click();
}

async function handleBatchFiles(fileList) {
  const result = await UploadEngine.addBatchProduct(fileList, pendingBatchProductName);
  if (!result.success) {
    showToast(result.errors[0] || 'Failed to add product.', 'error');
    return;
  }
  if (result.errors.length > 0) {
    showToast(result.errors[0], 'error');
  }
  renderBatchProductsList();
  showToast(`"${result.product.name}" added to batch!`, 'success');
}

// ============================================================
// SETTINGS
// ============================================================
function onNicheChange() {
  AppState.niche = DOM.selNiche.value;
  TemplateSelector.populateTemplateSelect(DOM.selTemplate, AppState.niche);
  AppState.templateId = DOM.selTemplate.value;
  triggerCopyRegenerate();
}

function onTemplateChange() {
  AppState.templateId = DOM.selTemplate.value;
}

function onCountryChange() {
  AppState.country = DOM.selCountry.value;
  // Auto-sync language
  const localeMap = CopyEngine.countryLocaleMap;
  if (localeMap[AppState.country]) {
    AppState.language = localeMap[AppState.country];
    DOM.selLanguage.value = AppState.language;
  }
  triggerCopyRegenerate();
}

function onLanguageChange() {
  AppState.language = DOM.selLanguage.value;
  triggerCopyRegenerate();
}

function onRatioChange(btn) {
  DOM.ratioBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  AppState.ratio = btn.dataset.ratio;
}

// ============================================================
// COPY GENERATION
// ============================================================
let copyDebounceTimer = null;

function triggerCopyRegenerate() {
  clearTimeout(copyDebounceTimer);
  copyDebounceTimer = setTimeout(generateAndDisplayCopy, 400);
}

async function generateAndDisplayCopy() {
  try {
    const copy = await CopyEngine.generateAIDA(
      AppState.niche,
      AppState.country,
      AppState.language,
      AppState.productName
    );
    AppState.currentCopy = copy;
    displayCopy(copy);
  } catch (e) {
    console.error('[App] Copy generation error:', e);
  }
}

function displayCopy(copy) {
  if (!copy) return;
  DOM.copyAttention.textContent = copy.attention || '—';
  DOM.copyInterest.textContent  = copy.interest  || '—';
  DOM.copyDesire.textContent    = copy.desire     || '—';
  DOM.copyCTA.textContent       = copy.cta        || '—';
}

// ============================================================
// PROGRESS UI
// ============================================================
function setProgress(percent, statusText, stepId) {
  DOM.progressBarFill.style.width = `${Math.round(percent * 100)}%`;
  if (statusText) DOM.progressStatus.textContent = statusText;

  if (stepId) {
    const steps = DOM.progressSteps.querySelectorAll('.progress-step');
    let found = false;
    steps.forEach(step => {
      if (step.dataset.step === stepId) {
        step.classList.add('active');
        step.classList.remove('done');
        found = true;
      } else if (!found) {
        step.classList.add('done');
        step.classList.remove('active');
      } else {
        step.classList.remove('active', 'done');
      }
    });
  }
}

function resetProgressSteps() {
  const steps = DOM.progressSteps.querySelectorAll('.progress-step');
  steps.forEach(s => s.classList.remove('active', 'done'));
}

// ============================================================
// CANVAS SETUP
// ============================================================
function setupCanvas(ratio) {
  const configs = {
    '9:16': { w: 540, h: 960 },   // Preview size (half of 1080x1920)
    '1:1':  { w: 540, h: 540 },
    '4:5':  { w: 540, h: 675 }
  };
  const conf = configs[ratio] || configs['9:16'];
  DOM.previewCanvas.width  = conf.w;
  DOM.previewCanvas.height = conf.h;
  DOM.previewCanvas.style.width  = '100%';
  DOM.previewCanvas.style.height = 'auto';
  return conf;
}

// ============================================================
// MAIN GENERATE — SINGLE MODE
// ============================================================
async function generateSingle() {
  if (!UploadEngine.isSingleValid()) {
    showToast(`Please upload at least ${UploadEngine.MIN_IMAGES} images.`, 'error');
    return;
  }

  AppState.isGenerating = true;
  DOM.btnGenerate.disabled = true;

  // Show progress section
  DOM.sectionProgress.style.display = 'block';
  DOM.progressSingle.style.display  = 'block';
  DOM.progressBatch.style.display   = 'none';
  DOM.sectionResult.style.display   = 'none';
  resetProgressSteps();
  DOM.sectionProgress.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    // ── Step 1: Load data ──
    setProgress(0.05, 'Loading configuration…', 'upload');
    await TemplateSelector.loadData();

    // ── Step 2: Build config ──
    setProgress(0.15, 'Selecting template…', 'template');
    const config = TemplateSelector.buildCreativeConfig(
      AppState.niche,
      AppState.templateId || null,
      AppState.ratio,
      AppState.duration,
      AppState.country
    );

    if (!config) throw new Error('Failed to build creative configuration.');
    AppState.currentConfig = config;

    // ── Step 3: Generate copy ──
    setProgress(0.25, 'Generating copy…', 'copy');
    let copy;

const voiceMode =
  document.getElementById('voice-mode')?.value;

const customScript =
  document.getElementById('custom-script')?.value?.trim();

if (
  voiceMode === 'custom' &&
  customScript
) {

  const lines = customScript
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .slice(0, 8);

copy = {
  scenes: lines,

  attention: lines[0] || '—',

  interest:
    lines[1] ||
    lines[0] ||
    '—',

  desire:
    lines[2] ||
    lines[1] ||
    '—',

  cta:
    lines[
      lines.length - 1
    ] || '—'
};

} else {

  copy = await CopyEngine.generateAIDA(
    AppState.niche,
    AppState.country,
    AppState.language,
    AppState.productName
  );
}
    AppState.currentCopy = copy;
    displayCopy(copy);
    await delay(200);

    // ── Step 4: Setup canvas ──
    setProgress(0.35, 'Preparing canvas…', 'animation');
    const canvasConf = setupCanvas(AppState.ratio);
    DOM.previewCanvas.style.display = 'block';
    DOM.previewVideo.style.display  = 'none';

    // ── Step 5: Load audio ──
    setProgress(0.45, 'Loading music…', 'audio');
    const audioData = await AudioEngine.prepareForExport(
      AppState.niche,
      AppState.musicStyle,
      config.duration.totalSeconds
    );
    await delay(200);

    // ── Step 6: Start live preview ──
    setProgress(0.55, 'Starting preview…', 'render');
    const images = UploadEngine.getSingleImages();
    RenderEngine.startPreview(DOM.previewCanvas, images, copy, config);

    await delay(500);

    // ── Step 7: Export video ──
    setProgress(0.65, 'Recording video…', 'export');

    const exportResult = await ExportEngine.exportVideo(
      DOM.previewCanvas,
      audioData.buffer,
      config,
      AppState.productName || AppState.niche,
      (progress, message) => {
        setProgress(0.65 + progress * 0.3, message);
      }
    );

    // ── Step 8: Done ──
    setProgress(1.0, 'Creative ready!', 'export');
    DOM.progressSteps.querySelectorAll('.progress-step').forEach(s => {
      s.classList.add('done');
      s.classList.remove('active');
    });

    AppState.exportResults = [exportResult];

   // Show result
   await delay(500);
   showResult(exportResult);

  } catch (err) {
    console.error('[App] Generation error:', err);
    setProgress(0, `Error: ${err.message}`, null);
    showToast(`Error: ${err.message}`, 'error', 5000);
  } finally {
    AppState.isGenerating = false;
    DOM.btnGenerate.disabled = false;
  }
}

// ============================================================
// MAIN GENERATE — BATCH MODE
// ============================================================
async function generateBatch() {
  const products = UploadEngine.getBatchProducts();
  if (products.length === 0) {
    showToast('Please add at least one product.', 'error');
    return;
  }

  AppState.isGenerating = true;
  DOM.btnGenerate.disabled = true;

  // Show progress section
  DOM.sectionProgress.style.display = 'block';
  DOM.progressSingle.style.display  = 'none';
  DOM.progressBatch.style.display   = 'block';
  DOM.sectionResult.style.display   = 'none';
  DOM.sectionProgress.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Load data
  await TemplateSelector.loadData();

  // Build queue
  BatchQueue.clearQueue();
  const settings = {
    country:     AppState.country,
    language:    AppState.language,
    ratio:       AppState.ratio,
    niche:       AppState.niche,
    templateId:  AppState.templateId,
    duration:    AppState.duration,
    musicStyle:  AppState.musicStyle
  };

  products.forEach(product => BatchQueue.addJob(product, settings));

  // Build queue UI
  BatchQueue.buildQueueUI(DOM.batchQueueList);

  // Setup callbacks
  BatchQueue.on('jobStart', (job) => {
    BatchQueue.updateQueueItemUI(job.id);
  });

  BatchQueue.on('jobProgress', (job, progress, message) => {
    BatchQueue.updateQueueItemUI(job.id);
  });

  BatchQueue.on('jobComplete', (job, result) => {
    BatchQueue.updateQueueItemUI(job.id);
    AppState.exportResults.push(result);
    showToast(`"${job.name}" done!`, 'success');
  });

  BatchQueue.on('jobError', (job, err) => {
    BatchQueue.updateQueueItemUI(job.id);
    showToast(`"${job.name}" failed: ${err.message}`, 'error');
  });

  BatchQueue.on('queueDone', (queue) => {
    AppState.isGenerating = false;
    DOM.btnGenerate.disabled = false;
    showBatchResults();
    showToast('All creatives generated!', 'success', 4000);
  });

  // Process function for each job
  const processJob = async (job, onProgress) => {
    onProgress(0.1, 'Building config…');

    const config = TemplateSelector.buildCreativeConfig(
      job.settings.niche,
      job.settings.templateId || null,
      job.settings.ratio,
      job.settings.duration,
      job.settings.country
    );

    if (!config) throw new Error('Failed to build config');

    onProgress(0.2, 'Generating copy…');
    const copy = await CopyEngine.generateAIDA(
      job.settings.niche,
      job.settings.country,
      job.settings.language,
      job.name
    );

    onProgress(0.35, 'Preparing canvas…');
    const offscreenCanvas = document.createElement('canvas');
    const ratioConf = TemplateSelector.getRatioConfig(job.settings.ratio);
    offscreenCanvas.width  = Math.round((ratioConf?.width  || 1080) / 2);
    offscreenCanvas.height = Math.round((ratioConf?.height || 1920) / 2);

    onProgress(0.45, 'Loading music…');
    const audioData = await AudioEngine.prepareForExport(
      job.settings.niche,
      job.settings.musicStyle,
      config.duration.totalSeconds
    );

    onProgress(0.55, 'Starting render…');
    RenderEngine.startPreview(offscreenCanvas, job.images, copy, config);
    await delay(300);

    onProgress(0.65, 'Recording…');
    const result = await ExportEngine.exportVideo(
      offscreenCanvas,
      audioData.buffer,
      config,
      job.name,
      (p, msg) => onProgress(0.65 + p * 0.3, msg)
    );

    RenderEngine.stopPreview();

    return { ...result, productName: job.name };
  };

  // Run queue
  AppState.exportResults = [];
  await BatchQueue.run(processJob);
}

// ============================================================
// SHOW RESULT
// ============================================================
function showResult(exportResult) {
  RenderEngine.stopPreview();

  // Show video in preview
  DOM.previewVideo.src = exportResult.url;
  DOM.previewVideo.style.display = 'block';
  DOM.previewCanvas.style.display = 'none';

  DOM.sectionProgress.style.display = 'none';
  DOM.sectionResult.style.display   = 'block';
  DOM.batchResults.style.display    = 'none';

  // Setup download button
  DOM.btnDownload.onclick = () => {
    ExportEngine.downloadFile(exportResult.url, exportResult.filename);
    showToast('Download started!', 'success');
  };

  DOM.sectionResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showBatchResults() {
  DOM.sectionProgress.style.display = 'none';
  DOM.sectionResult.style.display   = 'block';
  DOM.batchResults.style.display    = 'block';
  DOM.videoPreviewWrap.style.display = 'none';

  DOM.batchResultsList.innerHTML = '';
  AppState.exportResults.forEach((result, i) => {
    const item = document.createElement('div');
    item.className = 'batch-result-item';
    item.innerHTML = `
      <span class="batch-result-item__name">${result.productName || `Creative ${i + 1}`}</span>
      <button class="btn btn--outline btn--sm" data-idx="${i}">⬇ Download</button>
    `;
    item.querySelector('button').addEventListener('click', () => {
      ExportEngine.downloadFile(result.url, result.filename);
      showToast('Download started!', 'success');
    });
    DOM.batchResultsList.appendChild(item);
  });

  // Main download button downloads all
  DOM.btnDownload.textContent = '⬇ Download All';
  DOM.btnDownload.onclick = () => {
    AppState.exportResults.forEach((r, i) => {
      setTimeout(() => ExportEngine.downloadFile(r.url, r.filename), i * 600);
    });
    showToast('Downloading all creatives…', 'success');
  };

  DOM.sectionResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// NEW CREATIVE (RESET)
// ============================================================

// ============================================================
// NEW PROJECT
// ============================================================

function startNewProject() {

  const name =
    prompt(
      'Project name:',
      `Project ${
        AppState.projects.length + 1
      }`
    );

  const project =
    createNewProject(
      name ||
      `Project ${
        AppState.projects.length
      }`
    );

  // reset visual state
  resetApp();

  console.log(
    '[Project] Active:',
    project
  );

  showToast(
    `Project "${project.name}" created!`,
    'success'
  );
}

function resetApp() {
  RenderEngine.stopPreview();
  AudioEngine.stopPreview();

  UploadEngine.clearSingleImages();
  BatchQueue.clearQueue();

  DOM.previewGridSingle.innerHTML = '';
  DOM.batchProductsList.innerHTML = '';
  updateUploadCounter();

  AppState.exportResults = [];
  AppState.currentCopy   = null;
  AppState.currentConfig = null;
  AppState.isGenerating  = false;

  DOM.sectionResult.style.display   = 'none';
  DOM.sectionProgress.style.display = 'none';
  DOM.previewVideo.src = '';
  DOM.previewVideo.style.display  = 'none';
  DOM.previewCanvas.style.display = 'block';
  DOM.videoPreviewWrap.style.display = 'block';

  // Reset progress
  DOM.progressBarFill.style.width = '0%';
  DOM.progressStatus.textContent  = 'Initializing…';
  resetProgressSteps();

  // Reset copy display
  DOM.copyAttention.textContent = '—';
  DOM.copyInterest.textContent  = '—';
  DOM.copyDesire.textContent    = '—';
  DOM.copyCTA.textContent       = '—';

  DOM.btnGenerate.disabled = false;

  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Ready for a new creative!', 'info');
}

// ============================================================
// PROJECTS
// ============================================================

function createNewProject(
  name = 'New Project'
) {

  const project = {

    id:
      crypto.randomUUID(),

    name,

    createdAt:
      new Date()
        .toISOString(),

    images: [],

    copy: null,

    config: null,

    videos: []
  };

  AppState.projects.push(
    project
  );

  AppState.currentProjectId =
    project.id;

  if (
  DOM.currentProjectName
) {
  DOM.currentProjectName
    .textContent =
      project.name;
}

  console.log(
    '[Project] Created:',
    project
  );

  return project;
}

function getCurrentProject() {

  return AppState.projects.find(
    p =>
      p.id ===
      AppState.currentProjectId
  );
}

// ============================================================
// UTILITY
// ============================================================
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// INIT
// ============================================================
async function init() {
  cacheDom();

  // ── Load engine data ──
  await TemplateSelector.loadData();

  // ── Populate template select ──
  TemplateSelector.populateTemplateSelect(DOM.selTemplate, AppState.niche);
  AppState.templateId = DOM.selTemplate.value;

  // ── Create first project ──
  createNewProject();
  
  // ── Generate initial copy ──
  generateAndDisplayCopy();

  // ── Mode buttons ──
  DOM.btnSingle.addEventListener('click', () => setMode('single'));
  DOM.btnBatch.addEventListener('click',  () => setMode('batch'));

  // ── Single upload ──
  UploadEngine.setupDropZone(DOM.dropZoneSingle, handleSingleFiles);

  DOM.fileInputSingle.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleSingleFiles(e.target.files);
    e.target.value = '';
  });

  // ── Batch upload ──
  DOM.btnAddProduct.addEventListener('click', promptAddProduct);

  DOM.fileInputBatch.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleBatchFiles(e.target.files);
    e.target.value = '';
  });

  // ── Settings ──
  DOM.selCountry.addEventListener('change', onCountryChange);
  DOM.selLanguage.addEventListener('change', onLanguageChange);
  DOM.selNiche.addEventListener('change', onNicheChange);
  DOM.selTemplate.addEventListener('change', onTemplateChange);
  DOM.selDuration.addEventListener('change', () => { AppState.duration = DOM.selDuration.value; });
  DOM.selMusic.addEventListener('change', () => { AppState.musicStyle = DOM.selMusic.value; });
  DOM.inpProductName.addEventListener('input', () => {
    AppState.productName = DOM.inpProductName.value;
    triggerCopyRegenerate();
  });

  // ── Ratio buttons ──
  DOM.ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => onRatioChange(btn));
  });

  // ── Copy regenerate ──
  DOM.btnRegenerateCopy.addEventListener('click', generateAndDisplayCopy);

  // ── Generate button ──
  DOM.btnGenerate.addEventListener('click', () => {
    if (AppState.isGenerating) return;
    if (AppState.mode === 'single') generateSingle();
    else generateBatch();
  });

  // ── New creative ──
  DOM.btnNewCreative.addEventListener('click', startNewProject);

  // ── New project (top bar) ──
DOM.btnNewProject.addEventListener('click', startNewProject);

  // ── Initial state ──
  setMode('single');
  updateUploadCounter();
  renderBatchProductsList();

  // ── Voice narration UI ──
const voiceMode =
  document.getElementById('voice-mode');

const customScriptWrap =
  document.getElementById('custom-script-wrap');

if (voiceMode && customScriptWrap) {

  voiceMode.addEventListener(
    'change',
    () => {

      if (voiceMode.value === 'custom') {

        customScriptWrap.style.display =
          'block';

      } else {

        customScriptWrap.style.display =
          'none';
      }
    }
  );
}

  console.log('[Creative AI] Initialized successfully.');
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', init);
