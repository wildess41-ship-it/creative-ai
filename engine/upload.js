/**
 * Creative AI — engine/upload.js
 * Handles image upload, validation, preview generation, and batch product management.
 * Responsibility: File input, drag-and-drop, image loading, preview thumbnails.
 */

const UploadEngine = (() => {

  // ── Constants ──
  const MIN_IMAGES = 3;
  const MAX_IMAGES = 15;
  const MAX_FILE_SIZE_MB = 10;
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  // ── State ──
  let singleImages = [];
  let batchProducts = [];
  let batchProductCounter = 0;

  // ── Validate a single file ──
  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid format: ${file.name}. Use JPG, PNG or WEBP.`
      };
    }

    if (
      file.size >
      MAX_FILE_SIZE_MB * 1024 * 1024
    ) {
      return {
        valid: false,
        error: `File too large: ${file.name}. Max ${MAX_FILE_SIZE_MB}MB.`
      };
    }

    return { valid: true };
  }

  // ── Load image file ──
  function loadImage(file) {
    return new Promise((resolve, reject) => {

      const url =
        URL.createObjectURL(file);

      const img = new Image();

      img.onload = () =>
        resolve({
          file,
          url,
          img,
          name: file.name
        });

      img.onerror = () =>
        reject(
          new Error(
            `Failed to load: ${file.name}`
          )
        );

      img.src = url;
    });
  }

  // ── Process single files ──
  async function processSingleFiles(fileList) {

    const files =
      Array.from(fileList);

    const errors = [];
    const newImages = [];

    for (const file of files) {

      const validation =
        validateFile(file);

      if (!validation.valid) {
        errors.push(validation.error);
        continue;
      }

      if (
        singleImages.length +
        newImages.length >=
        MAX_IMAGES
      ) {
        errors.push(
          `Maximum ${MAX_IMAGES} images allowed.`
        );
        break;
      }

      try {

        const loaded =
          await loadImage(file);

        newImages.push(loaded);

      } catch (e) {

        errors.push(e.message);

      }
    }

    singleImages = [
      ...singleImages,
      ...newImages
    ];

    return {
      images: singleImages,
      newCount: newImages.length,
      errors,
      valid:
        singleImages.length >=
        MIN_IMAGES
    };
  }

  // ── Remove single image ──
  function removeSingleImage(index) {

    if (singleImages[index]) {

      URL.revokeObjectURL(
        singleImages[index].url
      );

      singleImages.splice(index, 1);
    }

    return singleImages;
  }

  // ── Clear images ──
  function clearSingleImages() {

    singleImages.forEach(img =>
      URL.revokeObjectURL(img.url)
    );

    singleImages = [];
  }

  // ── Add batch product ──
  async function addBatchProduct(
    fileList,
    productName
  ) {

    const files =
      Array.from(fileList);

    const images = [];
    const errors = [];

    for (const file of files) {

      const validation =
        validateFile(file);

      if (!validation.valid) {
        errors.push(validation.error);
        continue;
      }

      if (
        images.length >=
        MAX_IMAGES
      ) break;

      try {

        const loaded =
          await loadImage(file);

        images.push(loaded);

      } catch (e) {

        errors.push(e.message);

      }
    }

    if (
      images.length <
      MIN_IMAGES
    ) {
      return {
        success: false,
        errors: [
          `Product needs at least ${MIN_IMAGES} images.`,
          ...errors
        ]
      };
    }

    const product = {
      id: ++batchProductCounter,
      name:
        productName ||
        `Product ${batchProductCounter}`,
      images
    };

    batchProducts.push(product);

    return {
      success: true,
      product,
      errors
    };
  }

  // ── Remove batch product ──
  function removeBatchProduct(productId) {

    const idx =
      batchProducts.findIndex(
        p => p.id === productId
      );

    if (idx !== -1) {

      batchProducts[idx]
        .images
        .forEach(img =>
          URL.revokeObjectURL(
            img.url
          )
        );

      batchProducts.splice(idx, 1);
    }

    return batchProducts;
  }

  // ── Getters ──
  function getSingleImages() {
    return singleImages;
  }

  function getBatchProducts() {
    return batchProducts;
  }

  function getSingleCount() {
    return singleImages.length;
  }

  function isSingleValid() {
    return (
      singleImages.length >=
      MIN_IMAGES
    );
  }

  function isBatchValid() {
    return (
      batchProducts.length >= 1
    );
  }

  // ── Preview thumbnail ──
  function buildThumbHTML(
    url,
    index,
    removeFn
  ) {

    const div =
      document.createElement('div');

    div.className =
      'preview-thumb';

    div.dataset.index = index;

    const img =
      document.createElement('img');

    img.src = url;
    img.alt =
      `Image ${index + 1}`;

    img.loading = 'lazy';

    const btn =
      document.createElement('button');

    btn.className =
      'preview-thumb__remove';

    btn.innerHTML = '✕';

    btn.title =
      'Remove image';

    btn.addEventListener(
      'click',
      (e) => {

        e.stopPropagation();

        removeFn(index);
      }
    );

    div.appendChild(img);
    div.appendChild(btn);

    return div;
  }

  // ── Render preview grid ──
  function renderSingleGrid(
    container,
    onRemove
  ) {

    container.innerHTML = '';

    singleImages.forEach(
      (imgData, i) => {

        const thumb =
          buildThumbHTML(
            imgData.url,
            i,
            (idx) => {

              removeSingleImage(idx);

              renderSingleGrid(
                container,
                onRemove
              );

              if (onRemove) {
                onRemove(
                  singleImages
                );
              }
            }
          );

        container.appendChild(
          thumb
        );
      }
    );
  }

  // ── Resolve input safely ──
  function resolveInput(zone) {

    return (
      zone.querySelector(
        'input[type="file"]'
      ) ||

      document.getElementById(
        'file-input-single'
      )
    );
  }

  // ── Setup drag/drop ──
  function setupDropZone(
    zone,
    onFilesDropped
  ) {

    if (!zone) return;

    zone.addEventListener(
      'dragover',
      (e) => {

        e.preventDefault();

        zone.classList.add(
          'drag-over'
        );
      }
    );

    zone.addEventListener(
      'dragleave',
      () => {

        zone.classList.remove(
          'drag-over'
        );
      }
    );

    zone.addEventListener(
      'drop',
      (e) => {

        e.preventDefault();

        zone.classList.remove(
          'drag-over'
        );

        const files =
          e.dataTransfer?.files;

        if (
          files &&
          files.length > 0
        ) {
          onFilesDropped(files);
        }
      }
    );

    // FIX:
    // Don't hijack clicks
    // from buttons/labels.
    zone.addEventListener(
      'click',
      (e) => {

        const clickedControl =
          e.target.closest(
            'label, button, input'
          );

        if (clickedControl) {
          return;
        }

        const input =
          resolveInput(zone);

        if (!input) return;

        input.value = '';

        requestAnimationFrame(() => {
          input.click();
        });
      }
    );
  }

  // ── Public API ──
  return {
    processSingleFiles,
    removeSingleImage,
    clearSingleImages,
    addBatchProduct,
    removeBatchProduct,
    getSingleImages,
    getBatchProducts,
    getSingleCount,
    isSingleValid,
    isBatchValid,
    renderSingleGrid,
    setupDropZone,
    MIN_IMAGES,
    MAX_IMAGES
  };

})();
