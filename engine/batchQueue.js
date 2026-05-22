/**
 * Creative AI — engine/batchQueue.js
 * Sequential batch processing queue. Processes one product at a time.
 * Responsibility: Queue management, sequential execution, status tracking.
 */

const BatchQueue = (() => {

  // ── Queue state ──
  let queue      = [];
  let isRunning  = false;
  let currentJob = null;

  // ── Callbacks ──
  let onJobStart    = null;
  let onJobProgress = null;
  let onJobComplete = null;
  let onJobError    = null;
  let onQueueDone   = null;

  // ── Job status enum ──
  const STATUS = {
    WAITING:  'waiting',
    ACTIVE:   'active',
    DONE:     'done',
    ERROR:    'error'
  };

  // ── Add job to queue ──
  function addJob(product, settings) {
    const job = {
      id:       product.id,
      name:     product.name,
      images:   product.images,
      settings,
      status:   STATUS.WAITING,
      progress: 0,
      result:   null,
      error:    null
    };
    queue.push(job);
    return job;
  }

  // ── Clear queue ──
  function clearQueue() {
    queue = [];
    isRunning = false;
    currentJob = null;
  }

  // ── Get queue snapshot ──
  function getQueue() { return [...queue]; }

  // ── Get job by id ──
  function getJob(id) { return queue.find(j => j.id === id) || null; }

  // ── Update job status ──
  function updateJob(id, updates) {
    const job = queue.find(j => j.id === id);
    if (job) Object.assign(job, updates);
    return job;
  }

  // ── Set callbacks ──
  function on(event, callback) {
    if (event === 'jobStart')    onJobStart    = callback;
    if (event === 'jobProgress') onJobProgress = callback;
    if (event === 'jobComplete') onJobComplete = callback;
    if (event === 'jobError')    onJobError    = callback;
    if (event === 'queueDone')   onQueueDone   = callback;
  }

  // ── Process a single job ──
  async function processJob(job, processFn) {
    updateJob(job.id, { status: STATUS.ACTIVE, progress: 0 });
    if (onJobStart) onJobStart(job);

    try {
      const result = await processFn(job, (progress, message) => {
        updateJob(job.id, { progress });
        if (onJobProgress) onJobProgress(job, progress, message);
      });

      updateJob(job.id, { status: STATUS.DONE, progress: 1, result });
      if (onJobComplete) onJobComplete(job, result);

    } catch (err) {
      console.error(`[BatchQueue] Job ${job.id} failed:`, err);
      updateJob(job.id, { status: STATUS.ERROR, error: err.message });
      if (onJobError) onJobError(job, err);
    }
  }

  // ── Run queue sequentially ──
  async function run(processFn) {
    if (isRunning) {
      console.warn('[BatchQueue] Queue is already running.');
      return;
    }

    isRunning = true;

    const pendingJobs = queue.filter(j => j.status === STATUS.WAITING);

    for (const job of pendingJobs) {
      if (!isRunning) break; // Allow cancellation
      currentJob = job;
      await processJob(job, processFn);
      // Small delay between jobs to let browser breathe
      await new Promise(r => setTimeout(r, 200));
    }

    isRunning  = false;
    currentJob = null;

    if (onQueueDone) onQueueDone(queue);
  }

  // ── Stop queue ──
  function stop() {
    isRunning = false;
  }

  // ── Get stats ──
  function getStats() {
    return {
      total:    queue.length,
      waiting:  queue.filter(j => j.status === STATUS.WAITING).length,
      active:   queue.filter(j => j.status === STATUS.ACTIVE).length,
      done:     queue.filter(j => j.status === STATUS.DONE).length,
      error:    queue.filter(j => j.status === STATUS.ERROR).length,
      isRunning
    };
  }

  // ── Build queue UI items ──
  function buildQueueUI(container) {
    container.innerHTML = '';
    queue.forEach(job => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.id = `queue-item-${job.id}`;

      const statusClass = {
        [STATUS.WAITING]: 'queue-item__status--waiting',
        [STATUS.ACTIVE]:  'queue-item__status--active',
        [STATUS.DONE]:    'queue-item__status--done',
        [STATUS.ERROR]:   'queue-item__status--error'
      }[job.status] || 'queue-item__status--waiting';

      const statusLabel = {
        [STATUS.WAITING]: 'Waiting',
        [STATUS.ACTIVE]:  'Rendering…',
        [STATUS.DONE]:    'Done ✓',
        [STATUS.ERROR]:   'Error ✗'
      }[job.status] || 'Waiting';

      item.innerHTML = `
        <span class="queue-item__name">${job.name}</span>
        <div class="queue-item__bar-wrap">
          <div class="queue-item__bar" style="width:${Math.round(job.progress * 100)}%"></div>
        </div>
        <span class="queue-item__status ${statusClass}">${statusLabel}</span>
      `;

      container.appendChild(item);
    });
  }

  // ── Update single queue item UI ──
  function updateQueueItemUI(jobId) {
    const job  = getJob(jobId);
    const item = document.getElementById(`queue-item-${jobId}`);
    if (!job || !item) return;

    const bar = item.querySelector('.queue-item__bar');
    const statusEl = item.querySelector('.queue-item__status');

    if (bar) bar.style.width = `${Math.round(job.progress * 100)}%`;

    if (statusEl) {
      const statusClass = {
        [STATUS.WAITING]: 'queue-item__status--waiting',
        [STATUS.ACTIVE]:  'queue-item__status--active',
        [STATUS.DONE]:    'queue-item__status--done',
        [STATUS.ERROR]:   'queue-item__status--error'
      }[job.status] || 'queue-item__status--waiting';

      const statusLabel = {
        [STATUS.WAITING]: 'Waiting',
        [STATUS.ACTIVE]:  'Rendering…',
        [STATUS.DONE]:    'Done ✓',
        [STATUS.ERROR]:   'Error ✗'
      }[job.status] || 'Waiting';

      statusEl.className = `queue-item__status ${statusClass}`;
      statusEl.textContent = statusLabel;
    }
  }

  // ── Public API ──
  return {
    addJob,
    clearQueue,
    getQueue,
    getJob,
    updateJob,
    on,
    run,
    stop,
    getStats,
    buildQueueUI,
    updateQueueItemUI,
    STATUS
  };

})();
