// Lumina Photo Editor — Main Application Controller
import { PhotoEditor } from './editor.js';
import { ImageEnhancer } from './enhance.js';
import { FILTER_PRESETS } from './presets.js';
import { HistogramRenderer } from './histogram.js';
import { generateSampleImage } from './samples.js';

// DOM Elements
const viewportEl = document.getElementById('canvas-viewport');
const mainCanvasEl = document.getElementById('main-canvas');
const overlayCanvasEl = document.getElementById('overlay-canvas');
const histogramCanvasEl = document.getElementById('histogram-canvas');
const emptyStateEl = document.getElementById('empty-state');
const dragOverlayEl = document.getElementById('drag-overlay');
const fileInputEl = document.getElementById('file-input');

// Initialize Core Engines
const editor = new PhotoEditor(viewportEl, mainCanvasEl, overlayCanvasEl);
const histogram = new HistogramRenderer(histogramCanvasEl);

// State
let baseCanvasBeforeSliders = null;
let currentLoadedFileName = 'mountain-sunset.png';
let exportFormat = 'image/png';
let exportQuality = 0.92;
let exportScale = 1.0;
let rafId = null;

// Toast Notification Helper
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2300);
}

// ----------------------------------------------------------------------------
// Welcome / Completion Popup Modal
// ----------------------------------------------------------------------------
const welcomeModal = document.getElementById('welcome-modal');
const btnCloseWelcome = document.getElementById('btn-close-welcome');
const btnStartEditing = document.getElementById('btn-start-editing');
const btnOpenGuide = document.getElementById('btn-open-guide');

function closeWelcomeModal() {
  welcomeModal.classList.remove('open');
}

function openWelcomeModal() {
  welcomeModal.classList.add('open');
}

btnCloseWelcome.addEventListener('click', closeWelcomeModal);
btnStartEditing.addEventListener('click', closeWelcomeModal);
btnOpenGuide.addEventListener('click', openWelcomeModal);

welcomeModal.addEventListener('click', (e) => {
  if (e.target === welcomeModal) closeWelcomeModal();
});

// ----------------------------------------------------------------------------
// Tool Tab Navigation
// ----------------------------------------------------------------------------
const toolTabButtons = document.querySelectorAll('.tool-tab-btn');
const drawerPanels = {
  enhance: document.getElementById('panel-enhance'),
  crop: document.getElementById('panel-crop'),
  cut: document.getElementById('panel-cut'),
  filters: document.getElementById('panel-filters')
};

function switchTool(toolName) {
  toolTabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolName);
  });

  Object.entries(drawerPanels).forEach(([name, panel]) => {
    if (panel) panel.style.display = name === toolName ? 'flex' : 'none';
  });

  editor.setTool(toolName);
}

toolTabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTool(btn.dataset.tool));
});

// ----------------------------------------------------------------------------
// Scalable Live Enhancement Pipeline
// ----------------------------------------------------------------------------
const sliderKeys = [
  'brightness', 'contrast', 'exposure', 'highlights', 'shadows',
  'saturation', 'vibrance', 'temperature', 'tint', 'sharpness', 'blur', 'vignette'
];

function updateSliderUI(adjustments) {
  sliderKeys.forEach(key => {
    const slider = document.getElementById(`slider-${key}`);
    const valBadge = document.getElementById(`val-${key}`);
    if (slider && valBadge) {
      const val = adjustments[key] ?? 0;
      slider.value = val;
      valBadge.textContent = (val > 0 ? `+${val}` : `${val}`) + (key === 'blur' ? ' px' : (key === 'sharpness' || key === 'vignette' ? '%' : ''));
    }
  });
}

function queueLiveSliderPreview() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    applySliderChanges(true);
    rafId = null;
  });
}

function applySliderChanges(isLive = true) {
  if (!editor.hasImage()) return;

  if (!baseCanvasBeforeSliders) {
    baseCanvasBeforeSliders = document.createElement('canvas');
    baseCanvasBeforeSliders.width = editor.currentCanvas.width;
    baseCanvasBeforeSliders.height = editor.currentCanvas.height;
    baseCanvasBeforeSliders.getContext('2d').drawImage(editor.currentCanvas, 0, 0);
  }

  sliderKeys.forEach(key => {
    const slider = document.getElementById(`slider-${key}`);
    if (slider) editor.adjustments[key] = parseInt(slider.value, 10);
  });

  if (isLive) {
    // Scalable preview: downscaled during active slider drag for 60fps responsiveness
    const previewCanvas = ImageEnhancer.applyAdjustments(baseCanvasBeforeSliders, editor.adjustments, 1200);
    editor.updateLiveCanvas(previewCanvas);
    histogram.update(previewCanvas);
  } else {
    // Full resolution commit on slider release
    const fullResCanvas = ImageEnhancer.applyAdjustments(baseCanvasBeforeSliders, editor.adjustments);
    editor.pushHistory('Adjust Enhancements', fullResCanvas, editor.adjustments);
    baseCanvasBeforeSliders = null;
    histogram.update(fullResCanvas);
  }
}

sliderKeys.forEach(key => {
  const slider = document.getElementById(`slider-${key}`);
  const valBadge = document.getElementById(`val-${key}`);

  if (slider && valBadge) {
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      valBadge.textContent = (val > 0 ? `+${val}` : `${val}`) + (key === 'blur' ? ' px' : (key === 'sharpness' || key === 'vignette' ? '%' : ''));
      queueLiveSliderPreview();
    });

    slider.addEventListener('change', () => {
      applySliderChanges(false);
    });
  }
});

// Reset Sliders
document.getElementById('btn-reset-sliders').addEventListener('click', () => {
  if (!editor.hasImage()) return;
  editor.adjustments = ImageEnhancer.defaultAdjustments();
  updateSliderUI(editor.adjustments);
  if (baseCanvasBeforeSliders) {
    editor.pushHistory('Reset Adjustments', baseCanvasBeforeSliders, editor.adjustments);
    baseCanvasBeforeSliders = null;
  }
  showToast('Reset tone adjustments');
});

// Auto-Enhance Button
document.getElementById('btn-auto-enhance').addEventListener('click', () => {
  if (!editor.hasImage()) return;
  const autoAdj = ImageEnhancer.calculateAutoEnhance(editor.currentCanvas.getContext('2d'), editor.currentCanvas.width, editor.currentCanvas.height);
  editor.adjustments = { ...autoAdj };
  updateSliderUI(editor.adjustments);

  const enhanced = ImageEnhancer.applyAdjustments(editor.currentCanvas, editor.adjustments);
  editor.pushHistory('Auto-Enhance', enhanced, editor.adjustments);
  baseCanvasBeforeSliders = null;
  histogram.update(enhanced);
  showToast('✨ Auto-enhancement applied!');
});

// ----------------------------------------------------------------------------
// Crop & Transform Tool Controls
// ----------------------------------------------------------------------------
const aspectButtons = document.querySelectorAll('.aspect-btn');
aspectButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    aspectButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const ratioStr = btn.dataset.ratio;
    if (ratioStr === 'free') editor.cropManager.setAspectRatio(null);
    else if (ratioStr === '1:1') editor.cropManager.setAspectRatio(1);
    else if (ratioStr === '16:9') editor.cropManager.setAspectRatio(16 / 9);
    else if (ratioStr === '9:16') editor.cropManager.setAspectRatio(9 / 16);
    else if (ratioStr === '4:3') editor.cropManager.setAspectRatio(4 / 3);
    else if (ratioStr === '3:2') editor.cropManager.setAspectRatio(3 / 2);
  });
});

document.getElementById('btn-apply-crop').addEventListener('click', () => {
  editor.cropManager.applyCrop();
  showToast('Image cropped');
});

document.getElementById('btn-cancel-crop').addEventListener('click', () => {
  editor.cropManager.cancel();
  switchTool('enhance');
});

document.getElementById('btn-rotate-ccw').addEventListener('click', () => {
  editor.cropManager.rotate(-90);
  showToast('Rotated 90° Left');
});

document.getElementById('btn-rotate-cw').addEventListener('click', () => {
  editor.cropManager.rotate(90);
  showToast('Rotated 90° Right');
});

document.getElementById('btn-flip-h').addEventListener('click', () => {
  editor.cropManager.flip(true);
  showToast('Flipped Horizontally');
});

document.getElementById('btn-flip-v').addEventListener('click', () => {
  editor.cropManager.flip(false);
  showToast('Flipped Vertically');
});

// ----------------------------------------------------------------------------
// Cut & Erase Tool Controls
// ----------------------------------------------------------------------------
const cutModeButtons = document.querySelectorAll('.sub-tab-btn[data-cutmode]');
const cutBrushSettings = document.getElementById('cut-brush-settings');
const cutRectSettings = document.getElementById('cut-rect-settings');
const cutLassoSettings = document.getElementById('cut-lasso-settings');

cutModeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    cutModeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.cutmode;
    editor.cutManager.setMode(mode);

    cutBrushSettings.style.display = mode === 'brush' ? 'flex' : 'none';
    cutRectSettings.style.display = mode === 'rectangle' ? 'flex' : 'none';
    cutLassoSettings.style.display = mode === 'lasso' ? 'flex' : 'none';
  });
});

const selectCutBg = document.getElementById('select-cut-bg');
selectCutBg.addEventListener('change', (e) => {
  editor.cutManager.cutBackground = e.target.value;
});

const sliderBrushSize = document.getElementById('slider-brush-size');
const valBrushSize = document.getElementById('val-brush-size');
sliderBrushSize.addEventListener('input', () => {
  editor.cutManager.brushSize = parseInt(sliderBrushSize.value, 10);
  valBrushSize.textContent = `${sliderBrushSize.value} px`;
  editor.render();
});

const sliderBrushHardness = document.getElementById('slider-brush-hardness');
const valBrushHardness = document.getElementById('val-brush-hardness');
sliderBrushHardness.addEventListener('input', () => {
  editor.cutManager.brushHardness = parseInt(sliderBrushHardness.value, 10);
  valBrushHardness.textContent = `${sliderBrushHardness.value}%`;
  editor.render();
});

const sliderBrushOpacity = document.getElementById('slider-brush-opacity');
const valBrushOpacity = document.getElementById('val-brush-opacity');
sliderBrushOpacity.addEventListener('input', () => {
  editor.cutManager.brushOpacity = parseInt(sliderBrushOpacity.value, 10);
  valBrushOpacity.textContent = `${sliderBrushOpacity.value}%`;
  editor.render();
});

// Rectangle Cut Buttons
document.getElementById('btn-cut-rect-erase').addEventListener('click', () => {
  editor.cutManager.executeRectCut(false);
  showToast('Erased area inside box');
});

document.getElementById('btn-cut-rect-isolate').addEventListener('click', () => {
  editor.cutManager.executeRectCut(true);
  showToast('Cut out box selection');
});

// Lasso Cut Buttons
document.getElementById('btn-cut-lasso-erase').addEventListener('click', () => {
  editor.cutManager.executeLassoCut(false);
  showToast('Erased area inside lasso');
});

document.getElementById('btn-cut-lasso-isolate').addEventListener('click', () => {
  editor.cutManager.executeLassoCut(true);
  showToast('Isolated object inside lasso');
});

// ----------------------------------------------------------------------------
// Presets & Filter Looks
// ----------------------------------------------------------------------------
const presetsContainer = document.getElementById('presets-container');
FILTER_PRESETS.forEach(preset => {
  const card = document.createElement('div');
  card.className = `preset-card ${preset.id === 'original' ? 'active' : ''}`;
  card.dataset.presetId = preset.id;
  card.innerHTML = `<span>${preset.name}</span>`;

  card.addEventListener('click', () => {
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    editor.activePreset = preset.id;
    editor.adjustments = { ...preset.adjustments };
    updateSliderUI(editor.adjustments);

    const base = editor.history[0]?.canvas || editor.currentCanvas;
    const filtered = ImageEnhancer.applyAdjustments(base, editor.adjustments);
    editor.pushHistory(`Apply Filter: ${preset.name}`, filtered, editor.adjustments);
    baseCanvasBeforeSliders = null;
    histogram.update(filtered);
    showToast(`Applied ${preset.name}`);
  });

  presetsContainer.appendChild(card);
});

// ----------------------------------------------------------------------------
// Zoom Controls
// ----------------------------------------------------------------------------
const zoomPercentageEl = document.getElementById('zoom-percentage');
editor.onZoomChange = (zoom) => {
  zoomPercentageEl.textContent = `${Math.round(zoom * 100)}%`;
};

document.getElementById('btn-zoom-in').addEventListener('click', () => {
  editor.setZoom(editor.zoom * 1.25);
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
  editor.setZoom(editor.zoom / 1.25);
});

document.getElementById('btn-zoom-fit').addEventListener('click', () => {
  editor.fitToScreen();
});

document.getElementById('btn-zoom-100').addEventListener('click', () => {
  editor.setZoom(1.0);
});

// ----------------------------------------------------------------------------
// Undo / Redo / Reset / Compare
// ----------------------------------------------------------------------------
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnCompare = document.getElementById('btn-compare');
const btnResetAll = document.getElementById('btn-reset-all');
const statusHistory = document.getElementById('status-history');

editor.onHistoryChange = ({ canUndo, canRedo, action, count, index }) => {
  btnUndo.disabled = !canUndo;
  btnRedo.disabled = !canRedo;
  statusHistory.textContent = `${action} (${index + 1}/${count})`;
  updateSliderUI(editor.adjustments);
  histogram.update(editor.currentCanvas);
};

btnUndo.addEventListener('click', () => editor.undo());
btnRedo.addEventListener('click', () => editor.redo());
btnResetAll.addEventListener('click', () => {
  if (confirm('Revert all edits and return to original photo?')) {
    editor.resetAll();
    showToast('Reverted to original photo');
  }
});

// Compare Handlers
const startCompare = () => {
  btnCompare.classList.add('active');
  editor.setComparing(true);
};
const endCompare = () => {
  btnCompare.classList.remove('active');
  editor.setComparing(false);
};

btnCompare.addEventListener('mousedown', startCompare);
window.addEventListener('mouseup', endCompare);
btnCompare.addEventListener('touchstart', startCompare);
window.addEventListener('touchend', endCompare);

// ----------------------------------------------------------------------------
// File Loading & Drag-and-Drop
// ----------------------------------------------------------------------------
const btnOpenFile = document.getElementById('btn-open-file');
const btnEmptyOpen = document.getElementById('btn-empty-open');

function triggerOpenFile() {
  fileInputEl.click();
}

btnOpenFile.addEventListener('click', triggerOpenFile);
btnEmptyOpen.addEventListener('click', triggerOpenFile);

fileInputEl.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) {
    loadSelectedFile(file);
    fileInputEl.value = ''; // Reset so reopening same file fires event
  }
});

function loadSelectedFile(file) {
  currentLoadedFileName = file.name;
  editor.loadImage(file, file.name).then(() => {
    emptyStateEl.style.display = 'none';
    histogram.update(editor.currentCanvas);
    showToast(`Loaded ${file.name}`);
  }).catch(() => {
    showToast('Failed to load image file');
  });
}

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  dragOverlayEl.classList.add('active');
});

window.addEventListener('dragleave', (e) => {
  if (e.relatedTarget === null) {
    dragOverlayEl.classList.remove('active');
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragOverlayEl.classList.remove('active');
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    loadSelectedFile(file);
  }
});

window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      if (blob) {
        loadSelectedFile(blob);
        showToast('Image pasted from clipboard');
        break;
      }
    }
  }
});

// ----------------------------------------------------------------------------
// Sample Images Menu
// ----------------------------------------------------------------------------
const btnSamplesMenu = document.getElementById('btn-samples-menu');
const samplesDropdown = document.getElementById('samples-dropdown');

btnSamplesMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  samplesDropdown.classList.toggle('open');
});

window.addEventListener('click', () => {
  samplesDropdown.classList.remove('open');
});

document.querySelectorAll('.dropdown-item[data-sample]').forEach(item => {
  item.addEventListener('click', () => {
    const type = item.dataset.sample;
    loadSample(type);
  });
});

document.getElementById('btn-empty-sample').addEventListener('click', () => {
  loadSample('sunset');
});

function loadSample(type) {
  const dataUrl = generateSampleImage(type);
  const names = {
    sunset: 'mountain-sunset.png',
    cyberpunk: 'cyberpunk-city.png',
    tropical: 'tropical-flower.png'
  };
  currentLoadedFileName = names[type] || 'sample.png';
  editor.loadImage(dataUrl, currentLoadedFileName).then(() => {
    emptyStateEl.style.display = 'none';
    histogram.update(editor.currentCanvas);
    showToast(`Loaded sample photo`);
  });
}

// ----------------------------------------------------------------------------
// Export Modal & Resolution Scaling
// ----------------------------------------------------------------------------
const exportModal = document.getElementById('export-modal');
const btnOpenExport = document.getElementById('btn-open-export');
const btnCloseModal = document.getElementById('btn-close-modal');
const exportQualityContainer = document.getElementById('export-quality-container');
const sliderExportQuality = document.getElementById('slider-export-quality');
const valExportQuality = document.getElementById('val-export-quality');
const exportResolutionInfo = document.getElementById('export-resolution-info');

function updateExportResolutionDisplay() {
  if (!editor.hasImage()) return;
  const w = Math.round(editor.currentCanvas.width * exportScale);
  const h = Math.round(editor.currentCanvas.height * exportScale);
  exportResolutionInfo.textContent = `${w} × ${h} px (${exportScale}x)`;
}

btnOpenExport.addEventListener('click', () => {
  if (!editor.hasImage()) {
    showToast('Please load an image first');
    return;
  }
  updateExportResolutionDisplay();
  exportModal.classList.add('open');
});

btnCloseModal.addEventListener('click', () => {
  exportModal.classList.remove('open');
});

exportModal.addEventListener('click', (e) => {
  if (e.target === exportModal) exportModal.classList.remove('open');
});

// Format buttons
const exportFormatButtons = document.querySelectorAll('button[data-exportformat]');
exportFormatButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    exportFormatButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    exportFormat = btn.dataset.exportformat;
    exportQualityContainer.style.display = exportFormat === 'image/png' ? 'none' : 'block';
  });
});

// Scale buttons
const exportScaleButtons = document.querySelectorAll('button[data-exportscale]');
exportScaleButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    exportScaleButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    exportScale = parseFloat(btn.dataset.exportscale) || 1.0;
    updateExportResolutionDisplay();
  });
});

sliderExportQuality.addEventListener('input', () => {
  const q = parseInt(sliderExportQuality.value, 10);
  exportQuality = q / 100;
  valExportQuality.textContent = `${q}%`;
});

// Download File
document.getElementById('btn-download-image').addEventListener('click', () => {
  if (!editor.hasImage()) return;
  const dataUrl = editor.exportImage(exportFormat, exportQuality, exportScale);
  const ext = exportFormat === 'image/jpeg' ? 'jpg' : (exportFormat === 'image/webp' ? 'webp' : 'png');
  const baseName = currentLoadedFileName.replace(/\.[^/.]+$/, "");
  const downloadName = `${baseName}-edited.${ext}`;

  const link = document.createElement('a');
  link.download = downloadName;
  link.href = dataUrl;
  link.click();

  exportModal.classList.remove('open');
  showToast(`Downloaded ${downloadName}`);
});

// Copy to Clipboard
document.getElementById('btn-copy-clipboard').addEventListener('click', async () => {
  if (!editor.hasImage()) return;
  try {
    const blob = await editor.exportBlob('image/png', 1.0, exportScale);
    if (!blob) return;
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    exportModal.classList.remove('open');
    showToast('Copied full-res image to clipboard!');
  } catch (err) {
    showToast('Clipboard copy failed. Try downloading file.');
  }
});

// ----------------------------------------------------------------------------
// Status Bar Callbacks
// ----------------------------------------------------------------------------
const statusDimensions = document.getElementById('status-dimensions');
const pixelCoords = document.getElementById('pixel-coords');
const pixelColorChip = document.getElementById('pixel-color-chip');

editor.onImageLoaded = ({ width, height, name }) => {
  statusDimensions.textContent = `${width} × ${height} px • ${name}`;
};

editor.onPixelHover = ({ x, y, r, g, b, a }) => {
  pixelCoords.textContent = `X: ${x} Y: ${y} | RGBA(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
  pixelColorChip.style.background = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
};

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    editor.undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    e.preventDefault();
    editor.redo();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    triggerOpenFile();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    document.getElementById('btn-open-export').click();
  }
  if (e.key === 'Enter' && editor.activeTool === 'crop' && editor.cropManager.isActive) {
    e.preventDefault();
    editor.cropManager.applyCrop();
    showToast('Image cropped');
  }
  if (e.key === 'Escape') {
    if (welcomeModal.classList.contains('open')) closeWelcomeModal();
    else if (exportModal.classList.contains('open')) exportModal.classList.remove('open');
    else if (editor.activeTool === 'crop' && editor.cropManager.isActive) {
      editor.cropManager.cancel();
      switchTool('enhance');
    }
  }
});

// Load sample photo initially
loadSample('sunset');
