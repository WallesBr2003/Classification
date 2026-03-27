
/* ============================================================
   app.js — Classificador de Animais com Teachable Machine
   ============================================================ */

'use strict';

// ── Configuracoes ───────────────────────────────────────────
const MODEL_URL = './model.json';
const METADATA_URL = './metadata.json';
const IMAGE_SIZE = 224;

const CLASS_EMOJIS = {
  'Cachorro': '\uD83D\uDC36',
  'Cavalo': '\uD83D\uDC34',
  'Elefante': '\uD83D\uDC18',
  'Borboleta': '\uD83E\uDD8B',
  'Galinha': '\uD83D\uDC14',
  'Gato': '\uD83D\uDC31',
  'Vaca': '\uD83D\uDC04',
  'Ovelha': '\uD83D\uDC11',
  'Aranha': '\uD83D\uDD77\uFE0F',
};

// ── Estado global ───────────────────────────────────────────
let model = null;
let webcamStream = null;
let liveInterval = null;
let currentTab = 'upload';

// Evaluation state
let evalImageStore = {};   // { className: [{ file, imgEl }] }
let lastEvalReport = null; // stores last computed report
const CLASSES = ['Cachorro', 'Cavalo', 'Elefante', 'Borboleta', 'Galinha', 'Gato', 'Vaca', 'Ovelha', 'Aranha'];

// ── Inicializacao ────────────────────────────────────────────
(async function init() {
  showLoading('Carregando modelo de IA...');
  try {
    model = await tmImage.load(MODEL_URL, METADATA_URL);
    console.log('[Classificador] Modelo carregado. Classes:', model.getTotalClasses());
    buildEvalGrid();
  } catch (err) {
    console.error('[Classificador] Erro ao carregar modelo:', err);
    showError('Nao foi possivel carregar o modelo. Certifique-se de abrir via servidor local.');
  } finally {
    hideLoading();
  }
})();

// ── Navegacao entre abas ─────────────────────────────────────
function switchTab(tab) {
  if (tab === currentTab) return;
  if (currentTab === 'webcam' && tab !== 'webcam') stopWebcam();
  currentTab = tab;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });

  const activeTab = document.getElementById(`tab-${tab}`);
  const activePanel = document.getElementById(`panel-${tab}`);
  activeTab.classList.add('active');
  activeTab.setAttribute('aria-selected', 'true');
  activePanel.classList.remove('hidden');
  activePanel.classList.add('active');

  if (tab !== 'eval') clearResults();
}

// ── Upload de imagem ─────────────────────────────────────────
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.add('drag-over');
}
function handleDragLeave() {
  document.getElementById('drop-zone').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImageFile(file);
}
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) loadImageFile(file);
}
function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById('preview-img');
    img.src = ev.target.result;
    img.classList.remove('hidden');
    document.getElementById('drop-zone-content').classList.add('hidden');
    document.getElementById('btn-classify-upload').classList.remove('hidden');
    document.getElementById('btn-clear-upload').classList.remove('hidden');
    clearResults();
  };
  reader.readAsDataURL(file);
}
function clearUpload() {
  const img = document.getElementById('preview-img');
  img.src = '';
  img.classList.add('hidden');
  document.getElementById('drop-zone-content').classList.remove('hidden');
  document.getElementById('btn-classify-upload').classList.add('hidden');
  document.getElementById('btn-clear-upload').classList.add('hidden');
  document.getElementById('file-input').value = '';
  clearResults();
}
async function classifyUpload() {
  if (!model) { showError('Modelo ainda nao carregado.'); return; }
  const img = document.getElementById('preview-img');
  if (!img.src) return;
  const btn = document.getElementById('btn-classify-upload');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> Classificando...';
  try {
    showResults(await model.predict(img));
  } catch (err) {
    console.error(err);
    showError('Erro ao classificar a imagem.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">\uD83D\uDD0D</span> Classificar Imagem';
  }
}

// ── Webcam ────────────────────────────────────────────────────
async function startWebcam() {
  if (!model) { showError('Modelo ainda nao carregado.'); return; }
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
    });
    const video = document.getElementById('webcam-video');
    video.srcObject = webcamStream;
    video.classList.remove('hidden');
    document.getElementById('webcam-placeholder').classList.add('hidden');
    document.getElementById('btn-start-webcam').classList.add('hidden');
    document.getElementById('btn-stop-webcam').classList.remove('hidden');
    document.getElementById('btn-capture').classList.remove('hidden');
    startLiveClassification();
  } catch (err) {
    if (err.name === 'NotAllowedError') showError('Permissao de camera negada.');
    else showError('Nao foi possivel acessar a camera: ' + err.message);
  }
}
function stopWebcam() {
  stopLiveClassification();
  if (webcamStream) { webcamStream.getTracks().forEach(t => t.stop()); webcamStream = null; }
  const video = document.getElementById('webcam-video');
  video.srcObject = null;
  video.classList.add('hidden');
  document.getElementById('webcam-placeholder').classList.remove('hidden');
  document.getElementById('btn-start-webcam').classList.remove('hidden');
  document.getElementById('btn-stop-webcam').classList.add('hidden');
  document.getElementById('btn-capture').classList.add('hidden');
  document.getElementById('webcam-live-indicator').classList.add('hidden');
  clearResults();
}
function startLiveClassification() {
  document.getElementById('webcam-live-indicator').classList.remove('hidden');
  liveInterval = setInterval(() => {
    const video = document.getElementById('webcam-video');
    if (video.readyState === 4) classifyVideoFrame(video);
  }, 800);
}
function stopLiveClassification() {
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
}
async function classifyVideoFrame(videoEl) {
  if (!model || !videoEl) return;
  try { showResults(await model.predict(videoEl), true); } catch (e) { }
}
async function captureAndClassify() {
  const video = document.getElementById('webcam-video');
  if (!video || !model) return;
  stopLiveClassification();
  const canvas = document.getElementById('webcam-canvas');
  canvas.width = video.videoWidth || IMAGE_SIZE;
  canvas.height = video.videoHeight || IMAGE_SIZE;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const btn = document.getElementById('btn-capture');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> Classificando...';
  try { showResults(await model.predict(canvas)); } catch (err) { showError('Erro ao classificar frame.'); }
  finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">\uD83D\uDCF8</span> Capturar e Classificar';
    startLiveClassification();
  }
}

// ── Exibicao de resultados ────────────────────────────────────
function showResults(predictions) {
  if (!predictions || !predictions.length) return;
  const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
  const best = sorted[0];
  document.getElementById('results-section').classList.remove('hidden');
  document.getElementById('top-emoji').textContent = CLASS_EMOJIS[best.className] || '\uD83D\uDC3E';
  document.getElementById('top-label').textContent = best.className;
  document.getElementById('top-confidence').textContent = `Confianca: ${(best.probability * 100).toFixed(1)}%`;

  const container = document.getElementById('bars-container');
  container.innerHTML = '';
  sorted.forEach((pred, idx) => {
    const pct = (pred.probability * 100).toFixed(1);
    const isBest = idx === 0;
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.style.animationDelay = `${idx * 60}ms`;
    row.innerHTML = `
      <span class="bar-label${isBest ? ' best' : ''}">${CLASS_EMOJIS[pred.className] || ''} ${pred.className}</span>
      <div class="bar-track"><div class="bar-fill${isBest ? ' best' : ''}" data-pct="${pred.probability * 100}" style="width:0%"></div></div>
      <span class="bar-pct${isBest ? ' best' : ''}">${pct}%</span>`;
    container.appendChild(row);
  });
  requestAnimationFrame(() => {
    document.querySelectorAll('.bar-fill').forEach(fill => {
      setTimeout(() => { fill.style.width = `${fill.dataset.pct}%`; }, 50);
    });
  });
}
function clearResults() {
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('bars-container').innerHTML = '';
  document.getElementById('top-label').textContent = '—';
  document.getElementById('top-confidence').textContent = '—';
  document.getElementById('top-emoji').textContent = '\uD83D\uDC3E';
}

// ── Loading / Erros ───────────────────────────────────────────
function showLoading(msg = 'Carregando...') {
  document.getElementById('loading-text').textContent = msg;
  document.getElementById('loading-overlay').classList.remove('hidden');
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}
function showError(msg) {
  hideLoading();
  const old = document.getElementById('error-toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.id = 'error-toast';
  toast.style.cssText = `
    position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
    background:rgba(239,68,68,0.92);color:#fff;
    padding:0.75rem 1.5rem;border-radius:12px;
    font-size:0.9rem;font-weight:500;z-index:9999;
    backdrop-filter:blur(8px);box-shadow:0 8px 32px rgba(0,0,0,0.4);
    max-width:90vw;text-align:center;animation:fadeUp 0.3s both;`;
  toast.textContent = '\u26A0\uFE0F ' + msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5500);
}

// =============================================================
//   AVALIACAO DO MODELO
// =============================================================

// ── Build class upload grid ───────────────────────────────────
function buildEvalGrid() {
  const grid = document.getElementById('eval-grid');
  grid.innerHTML = '';
  CLASSES.forEach(cls => {
    evalImageStore[cls] = [];

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    hiddenInput.accept = 'image/*';
    hiddenInput.multiple = true;
    hiddenInput.id = `eval-input-${cls}`;
    hiddenInput.style.display = 'none';
    hiddenInput.addEventListener('change', e => handleEvalFiles(cls, e.target.files));
    document.body.appendChild(hiddenInput);

    const card = document.createElement('div');
    card.className = 'eval-class-card';
    card.id = `eval-card-${cls}`;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Adicionar imagens de teste da classe ${cls}`);
    card.addEventListener('click', () => hiddenInput.click());
    card.addEventListener('keydown', e => { if (e.key === 'Enter') hiddenInput.click(); });
    card.innerHTML = `
      <span class="eval-class-emoji">${CLASS_EMOJIS[cls] || '\uD83D\uDC3E'}</span>
      <span class="eval-class-name">${cls}</span>
      <span class="eval-class-count" id="eval-count-${cls}">Clique para adicionar</span>
      <div class="eval-thumbnails" id="eval-thumbs-${cls}"></div>`;
    grid.appendChild(card);
  });
}

// ── Handle uploaded eval files ────────────────────────────────
function handleEvalFiles(cls, files) {
  if (!files || !files.length) return;
  let loaded = 0;
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = ev => {
      img.src = ev.target.result;
      img.onload = () => {
        evalImageStore[cls].push({ file, imgEl: img });
        loaded++;
        updateClassCard(cls);
        updateEvalSummary();
        if (loaded === Array.from(files).filter(f => f.type.startsWith('image/')).length) {
          img.onload = null; // cleanup
        }
      };
    };
    reader.readAsDataURL(file);
  });
}

function updateClassCard(cls) {
  const items = evalImageStore[cls];
  const card = document.getElementById(`eval-card-${cls}`);
  const count = document.getElementById(`eval-count-${cls}`);
  const thumbs = document.getElementById(`eval-thumbs-${cls}`);

  card.classList.toggle('has-files', items.length > 0);

  // Badge
  const oldBadge = card.querySelector('.eval-class-badge');
  if (oldBadge) oldBadge.remove();
  if (items.length > 0) {
    const badge = document.createElement('span');
    badge.className = 'eval-class-badge';
    badge.textContent = items.length;
    card.appendChild(badge);
  }

  count.textContent = items.length > 0 ? `${items.length} imagem(ns)` : 'Clique para adicionar';
  count.classList.toggle('loaded', items.length > 0);

  // Thumbnails (max 6)
  thumbs.innerHTML = '';
  items.slice(0, 6).forEach(({ imgEl }) => {
    const th = new Image();
    th.src = imgEl.src;
    th.className = 'eval-thumb';
    th.alt = cls;
    thumbs.appendChild(th);
  });
}

function updateEvalSummary() {
  const total = CLASSES.reduce((s, c) => s + evalImageStore[c].length, 0);
  const classCount = CLASSES.filter(c => evalImageStore[c].length > 0).length;
  document.getElementById('eval-total-count').textContent = `${total} imagem(ns) carregada(s)`;
  document.getElementById('eval-class-count').textContent = `${classCount}/9 classes`;
  document.getElementById('btn-evaluate').disabled = total === 0;
  document.getElementById('btn-clear-eval').classList.toggle('hidden', total === 0);
}

function clearEvaluation() {
  CLASSES.forEach(cls => {
    evalImageStore[cls] = [];
    updateClassCard(cls);
    const input = document.getElementById(`eval-input-${cls}`);
    if (input) input.value = '';
  });
  updateEvalSummary();
  document.getElementById('eval-results').classList.add('hidden');
  document.getElementById('eval-progress-wrap').classList.add('hidden');
  lastEvalReport = null;
}

// ── Run evaluation ─────────────────────────────────────────────
async function runEvaluation() {
  if (!model) { showError('Modelo nao carregado.'); return; }

  const total = CLASSES.reduce((s, c) => s + evalImageStore[c].length, 0);
  if (total === 0) { showError('Adicione imagens de teste primeiro.'); return; }

  // Disable button, show progress
  const btnEval = document.getElementById('btn-evaluate');
  btnEval.disabled = true;
  btnEval.innerHTML = '<span class="btn-icon">⏳</span> Avaliando...';

  document.getElementById('eval-results').classList.add('hidden');
  document.getElementById('eval-progress-wrap').classList.remove('hidden');

  const n = CLASSES.length;

  // confusionMatrix[i][j] = number of images from class i predicted as class j
  const confusionMatrix = Array.from({ length: n }, () => new Array(n).fill(0));

  let done = 0;

  for (let ci = 0; ci < n; ci++) {
    const cls = CLASSES[ci];
    const items = evalImageStore[cls];
    for (const { imgEl } of items) {
      let preds;
      try {
        preds = await model.predict(imgEl);
      } catch (e) {
        console.warn('predict error', e);
        done++;
        continue;
      }
      const predClass = preds.reduce((a, b) => a.probability > b.probability ? a : b).className;
      const pi = CLASSES.indexOf(predClass);
      if (pi >= 0) confusionMatrix[ci][pi]++;
      done++;
      const pct = Math.round((done / total) * 100);
      document.getElementById('eval-progress-fill').style.width = pct + '%';
      document.getElementById('eval-progress-pct').textContent = pct + '%';
      document.getElementById('eval-progress-label').textContent = `Classificando ${done}/${total}...`;
      // yield to allow UI update
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // ── Compute metrics ─────────────────────────────────────────
  const report = computeMetrics(confusionMatrix, total);
  lastEvalReport = { report, confusionMatrix, total, timestamp: new Date().toISOString() };

  // ── Render results ──────────────────────────────────────────
  renderMetrics(report, confusionMatrix);

  document.getElementById('eval-progress-wrap').classList.add('hidden');
  document.getElementById('eval-results').classList.remove('hidden');
  document.getElementById('eval-results').scrollIntoView({ behavior: 'smooth', block: 'start' });

  btnEval.disabled = false;
  btnEval.innerHTML = '<span class="btn-icon">\uD83E\uDDEA</span> Avaliar Novamente';
}

// ── Compute Accuracy, Precision, Recall, F1 per class & macro ─
function computeMetrics(cm, total) {
  const n = CLASSES.length;
  let correct = 0;
  for (let i = 0; i < n; i++) correct += cm[i][i];

  const accuracy = total > 0 ? correct / total : 0;

  const perClass = CLASSES.map((cls, i) => {
    const support = cm[i].reduce((s, v) => s + v, 0);     // real positives for class i
    const tp = cm[i][i];
    const fp = cm.reduce((s, row) => s + row[i], 0) - tp; // predicted as i but wrong
    const fn = support - tp;                               // real i but predicted wrong

    const precision = (tp + fp) > 0 ? tp / (tp + fp) : null;
    const recall = support > 0 ? tp / support : null;
    const f1 = (precision !== null && recall !== null && (precision + recall) > 0)
      ? 2 * precision * recall / (precision + recall)
      : null;

    return { cls, tp, fp, fn, support, precision, recall, f1 };
  });

  // Macro averages (only over classes that have support)
  const classesWithSupport = perClass.filter(c => c.support > 0);
  const macroPrecision = avg(classesWithSupport.map(c => c.precision ?? 0));
  const macroRecall = avg(classesWithSupport.map(c => c.recall ?? 0));
  const macroF1 = avg(classesWithSupport.map(c => c.f1 ?? 0));

  return { accuracy, macroPrecision, macroRecall, macroF1, perClass };
}

function avg(arr) {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ── Render metrics to DOM ──────────────────────────────────────
function renderMetrics(report, cm) {
  const { accuracy, macroPrecision, macroRecall, macroF1, perClass } = report;

  // Global metric cards
  setMetricCard('mv-accuracy', accuracy, 'mc-accuracy');
  setMetricCard('mv-precision', macroPrecision, 'mc-precision');
  setMetricCard('mv-recall', macroRecall, 'mc-recall');
  setMetricCard('mv-f1', macroF1, 'mc-f1');

  // Per-class table
  const tbody = document.getElementById('per-class-tbody');
  tbody.innerHTML = '';
  const bestF1 = Math.max(...perClass.map(c => c.f1 ?? -1));

  perClass.forEach(c => {
    const isBest = c.f1 !== null && Math.abs(c.f1 - bestF1) < 0.001;
    const tr = document.createElement('tr');
    if (isBest) tr.className = 'best-row';
    tr.innerHTML = `
      <td>${CLASS_EMOJIS[c.cls] || ''} <strong>${c.cls}</strong></td>
      <td>${fmtPct(c.precision)}</td>
      <td>${fmtPct(c.recall)}</td>
      <td>${fmtPct(c.f1)}</td>
      <td style="color:var(--text-muted)">${c.support}</td>`;
    tbody.appendChild(tr);
  });

  // Confusion matrix
  renderConfusionMatrix(cm);
}

function setMetricCard(valueId, value, cardId) {
  const el = document.getElementById(valueId);
  const pct = (value * 100).toFixed(1) + '%';
  el.textContent = pct;
  el.className = 'metric-value ' + colorClass(value);
  // animate number (count-up)
  countUpEl(el, value * 100);
}

function colorClass(v) {
  if (v >= 0.75) return 'good';
  if (v >= 0.50) return 'medium';
  return 'poor';
}

function countUpEl(el, target) {
  const steps = 40;
  const duration = 700;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    const current = target * (step / steps);
    el.textContent = current.toFixed(1) + '%';
    if (step >= steps) { el.textContent = target.toFixed(1) + '%'; clearInterval(interval); }
  }, duration / steps);
}

function fmtPct(v) {
  if (v === null) return `<span class="pct-cell pct-na">N/A</span>`;
  const pct = (v * 100).toFixed(1);
  const cls = v >= 0.75 ? 'pct-good' : v >= 0.50 ? 'pct-medium' : 'pct-poor';
  return `<span class="pct-cell ${cls}">${pct}%</span>`;
}

// ── Confusion matrix render ─────────────────────────────────
function renderConfusionMatrix(cm) {
  const wrap = document.getElementById('confusion-matrix-wrap');
  wrap.innerHTML = '';
  const n = CLASSES.length;

  // Find max off-diagonal for color scaling
  let maxErr = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j && cm[i][j] > maxErr) maxErr = cm[i][j];

  const table = document.createElement('table');
  table.className = 'confusion-matrix';

  // Header row
  const thead = table.createTHead();
  const hRow = thead.insertRow();
  const cornerTh = document.createElement('th');
  cornerTh.className = 'row-header';
  cornerTh.textContent = 'Real \\ Predito';
  hRow.appendChild(cornerTh);
  CLASSES.forEach(cls => {
    const th = document.createElement('th');
    th.textContent = (CLASS_EMOJIS[cls] || '') + ' ' + cls.slice(0, 4) + '.';
    th.title = cls;
    hRow.appendChild(th);
  });

  // Data rows
  const tbody = document.createElement('tbody');
  for (let i = 0; i < n; i++) {
    const tr = tbody.insertRow();
    // Row label
    const labelTh = document.createElement('th');
    labelTh.className = 'row-header';
    labelTh.textContent = (CLASS_EMOJIS[CLASSES[i]] || '') + ' ' + CLASSES[i];
    tr.appendChild(labelTh);

    for (let j = 0; j < n; j++) {
      const td = tr.insertCell();
      td.textContent = cm[i][j];
      td.title = `Real: ${CLASSES[i]} | Predito: ${CLASSES[j]} | Contagem: ${cm[i][j]}`;
      if (i === j) {
        td.className = cm[i][j] > 0 ? 'cm-diagonal' : 'cm-zero';
      } else if (cm[i][j] === 0) {
        td.className = 'cm-zero';
      } else if (maxErr > 0 && cm[i][j] / maxErr > 0.5) {
        td.className = 'cm-error-hi';
      } else {
        td.className = 'cm-error-lo';
      }
    }
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
}

// ── Export report as JSON ──────────────────────────────────────
function exportReport() {
  if (!lastEvalReport) return;
  const { report, confusionMatrix, total, timestamp } = lastEvalReport;

  const data = {
    timestamp,
    totalImages: total,
    splitDescription: 'Conjunto de teste representando aprox. 20% dos dados (Principio de Pareto 80/20)',
    modelClasses: CLASSES,
    globalMetrics: {
      accuracy: parseFloat((report.accuracy * 100).toFixed(2)),
      macroPrecision: parseFloat((report.macroPrecision * 100).toFixed(2)),
      macroRecall: parseFloat((report.macroRecall * 100).toFixed(2)),
      macroF1: parseFloat((report.macroF1 * 100).toFixed(2)),
    },
    perClassMetrics: report.perClass.map(c => ({
      class: c.cls,
      support: c.support,
      precision: c.precision !== null ? parseFloat((c.precision * 100).toFixed(2)) : null,
      recall: c.recall !== null ? parseFloat((c.recall * 100).toFixed(2)) : null,
      f1: c.f1 !== null ? parseFloat((c.f1 * 100).toFixed(2)) : null,
    })),
    confusionMatrix: {
      labels: CLASSES,
      matrix: confusionMatrix,
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `avaliacao_modelo_${timestamp.replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
