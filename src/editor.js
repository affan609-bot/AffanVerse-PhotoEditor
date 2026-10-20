// Main Photo Editor State Engine & Canvas Viewport
import { CropManager } from './crop.js';
import { CutManager } from './cut.js';
import { ImageEnhancer } from './enhance.js';

export class PhotoEditor {
  constructor(viewportEl, mainCanvasEl, overlayCanvasEl) {
    this.viewport = viewportEl;
    this.mainCanvas = mainCanvasEl;
    this.mainCtx = mainCanvasEl.getContext('2d', { willReadFrequently: true });
    this.overlayCanvas = overlayCanvasEl;
    this.overlayCtx = overlayCanvasEl.getContext('2d');

    // Canvas buffer storing the actual full-resolution edited image
    this.currentCanvas = null;
    this.originalCanvas = null; // Unaltered original for "Hold to Compare"

    // Adjustments
    this.adjustments = ImageEnhancer.defaultAdjustments();
    this.activePreset = 'original';

    // Tool Managers
    this.cropManager = new CropManager(this);
    this.cutManager = new CutManager(this);
    this.activeTool = 'enhance';

    // Viewport transform
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Viewport interaction states
    this.isPanning = false;
    this.spacePressed = false;
    this.lastPanMouse = { x: 0, y: 0 };
    this.isComparing = false;

    // History stack (Undo / Redo) - bounded to 20 for memory safety
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 20;

    // UI Callbacks
    this.onHistoryChange = null;
    this.onImageLoaded = null;
    this.onPixelHover = null;
    this.onZoomChange = null;

    this.initEventListeners();
    this.resizeCanvases();

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvases());
      this.resizeObserver.observe(this.viewport);
    }
  }

  hasImage() {
    return this.currentCanvas !== null && this.currentCanvas.width > 0;
  }

  loadImage(imageSource, filename = 'image.png') {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve, reject) => {
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        this.currentCanvas = c;
        const orig = document.createElement('canvas');
        orig.width = c.width;
        orig.height = c.height;
        orig.getContext('2d').drawImage(c, 0, 0);
        this.originalCanvas = orig;

        this.adjustments = ImageEnhancer.defaultAdjustments();
        this.activePreset = 'original';

        this.history = [];
        this.historyIndex = -1;
        this.pushHistory('Open Image', c);

        this.fitToScreen();

        if (this.onImageLoaded) {
          this.onImageLoaded({
            width: c.width,
            height: c.height,
            name: filename
          });
        }

        resolve();
      };
      img.onerror = reject;

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else if (imageSource instanceof Blob) {
        img.src = URL.createObjectURL(imageSource);
      }
    });
  }

  pushHistory(actionName, canvas, adjustments = null) {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const snap = document.createElement('canvas');
    snap.width = canvas.width;
    snap.height = canvas.height;
    snap.getContext('2d').drawImage(canvas, 0, 0);

    const state = {
      action: actionName,
      canvas: snap,
      adjustments: adjustments ? { ...adjustments } : { ...this.adjustments },
      preset: this.activePreset
    };

    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;

    this.currentCanvas = snap;
    this.render();

    if (this.onHistoryChange) {
      this.onHistoryChange({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        action: actionName,
        count: this.history.length,
        index: this.historyIndex
      });
    }
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return;
    this.historyIndex--;
    const state = this.history[this.historyIndex];

    const copy = document.createElement('canvas');
    copy.width = state.canvas.width;
    copy.height = state.canvas.height;
    copy.getContext('2d').drawImage(state.canvas, 0, 0);

    this.currentCanvas = copy;
    this.adjustments = { ...state.adjustments };
    this.activePreset = state.preset;

    this.render();

    if (this.onHistoryChange) {
      this.onHistoryChange({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        action: state.action,
        count: this.history.length,
        index: this.historyIndex
      });
    }
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    const state = this.history[this.historyIndex];

    const copy = document.createElement('canvas');
    copy.width = state.canvas.width;
    copy.height = state.canvas.height;
    copy.getContext('2d').drawImage(state.canvas, 0, 0);

    this.currentCanvas = copy;
    this.adjustments = { ...state.adjustments };
    this.activePreset = state.preset;

    this.render();

    if (this.onHistoryChange) {
      this.onHistoryChange({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        action: state.action,
        count: this.history.length,
        index: this.historyIndex
      });
    }
  }

  resetAll() {
    if (!this.originalCanvas) return;
    const resetCopy = document.createElement('canvas');
    resetCopy.width = this.originalCanvas.width;
    resetCopy.height = this.originalCanvas.height;
    resetCopy.getContext('2d').drawImage(this.originalCanvas, 0, 0);

    this.adjustments = ImageEnhancer.defaultAdjustments();
    this.activePreset = 'original';
    this.pushHistory('Reset to Original', resetCopy);
    this.fitToScreen();
  }

  updateLiveCanvas(tempCanvas) {
    this.currentCanvas = tempCanvas;
    this.render();
  }

  screenToImg(clientX, clientY) {
    const rect = this.overlayCanvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const imgX = (screenX - this.panX) / this.zoom;
    const imgY = (screenY - this.panY) / this.zoom;
    return { x: imgX, y: imgY, screenX, screenY };
  }

  imgToScreen(imgX, imgY) {
    return {
      x: this.panX + imgX * this.zoom,
      y: this.panY + imgY * this.zoom
    };
  }

  setCursor(cursorStyle) {
    this.overlayCanvas.style.cursor = cursorStyle;
  }

  resizeCanvases() {
    const rect = this.viewport.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    if (w <= 0 || h <= 0) return;

    this.mainCanvas.width = w;
    this.mainCanvas.height = h;
    this.overlayCanvas.width = w;
    this.overlayCanvas.height = h;

    this.render();
  }

  fitToScreen() {
    if (!this.hasImage()) return;
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    const iw = this.currentCanvas.width;
    const ih = this.currentCanvas.height;

    const margin = 40;
    const scaleX = (vw - margin * 2) / iw;
    const scaleY = (vh - margin * 2) / ih;
    this.zoom = Math.min(scaleX, scaleY, 1.0);

    this.panX = (vw - iw * this.zoom) / 2;
    this.panY = (vh - ih * this.zoom) / 2;

    this.render();
    if (this.onZoomChange) this.onZoomChange(this.zoom);
  }

  setZoom(newZoom, centerX = null, centerY = null) {
    if (!this.hasImage()) return;
    const clamped = Math.max(0.1, Math.min(newZoom, 10.0));
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;

    const cx = centerX !== null ? centerX : vw / 2;
    const cy = centerY !== null ? centerY : vh / 2;

    const imgX = (cx - this.panX) / this.zoom;
    const imgY = (cy - this.panY) / this.zoom;

    this.zoom = clamped;
    this.panX = cx - imgX * this.zoom;
    this.panY = cy - imgY * this.zoom;

    this.render();
    if (this.onZoomChange) this.onZoomChange(this.zoom);
  }

  setTool(tool) {
    if (this.activeTool === 'crop' && tool !== 'crop') {
      this.cropManager.cancel();
    }
    if (this.activeTool === 'cut' && tool !== 'cut') {
      this.cutManager.resetSelection();
    }

    this.activeTool = tool;

    if (tool === 'crop') {
      this.cropManager.start();
    }

    this.render();
  }

  setComparing(isComparing) {
    this.isComparing = isComparing;
    this.render();
  }

  render() {
    if (!this.hasImage()) {
      this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      return;
    }

    const ctx = this.mainCtx;
    const w = this.mainCanvas.width;
    const h = this.mainCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const imgToDraw = this.isComparing ? this.originalCanvas : this.currentCanvas;
    const iw = imgToDraw.width;
    const ih = imgToDraw.height;

    const destX = this.panX;
    const destY = this.panY;
    const destW = iw * this.zoom;
    const destH = ih * this.zoom;

    // 1. Transparency Checkerboard Pattern
    this.drawCheckerboard(ctx, destX, destY, destW, destH);

    // 2. High Quality Image Rendering
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgToDraw, 0, 0, iw, ih, destX, destY, destW, destH);
    ctx.restore();

    // 3. Render Overlays
    const oCtx = this.overlayCtx;
    oCtx.clearRect(0, 0, w, h);

    if (!this.isComparing) {
      const imgToScreen = (x, y) => this.imgToScreen(x, y);

      if (this.activeTool === 'crop') {
        this.cropManager.drawOverlay(oCtx, imgToScreen);
      } else if (this.activeTool === 'cut') {
        this.cutManager.drawOverlay(oCtx, imgToScreen);
      }
    }
  }

  drawCheckerboard(ctx, x, y, width, height) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    const sq = 12;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#263449';
    const startX = Math.floor(x / sq) * sq;
    const startY = Math.floor(y / sq) * sq;

    for (let py = startY; py < y + height; py += sq) {
      for (let px = startX; px < x + width; px += sq) {
        if ((Math.floor(px / sq) + Math.floor(py / sq)) % 2 === 0) {
          ctx.fillRect(px, py, sq, sq);
        }
      }
    }
    ctx.restore();
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.resizeCanvases());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
        this.spacePressed = true;
        this.setCursor('grab');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spacePressed = false;
        this.setCursor('default');
      }
    });

    this.overlayCanvas.addEventListener('mousedown', (e) => {
      if (!this.hasImage()) return;
      const imgPos = this.screenToImg(e.clientX, e.clientY);

      if (e.button === 1 || this.spacePressed || e.altKey) {
        this.isPanning = true;
        this.lastPanMouse = { x: e.clientX, y: e.clientY };
        this.setCursor('grabbing');
        return;
      }

      if (e.button !== 0) return;

      if (this.activeTool === 'crop') {
        if (this.cropManager.onMouseDown(e, imgPos)) return;
      } else if (this.activeTool === 'cut') {
        if (this.cutManager.onMouseDown(e, imgPos)) return;
      }
    });

    this.overlayCanvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.lastPanMouse.x;
        const dy = e.clientY - this.lastPanMouse.y;
        this.panX += dx;
        this.panY += dy;
        this.lastPanMouse = { x: e.clientX, y: e.clientY };
        this.render();
        return;
      }

      if (!this.hasImage()) return;
      const imgPos = this.screenToImg(e.clientX, e.clientY);

      if (this.onPixelHover && imgPos.x >= 0 && imgPos.x < this.currentCanvas.width && imgPos.y >= 0 && imgPos.y < this.currentCanvas.height) {
        const pxCtx = this.currentCanvas.getContext('2d');
        const px = pxCtx.getImageData(Math.floor(imgPos.x), Math.floor(imgPos.y), 1, 1).data;
        this.onPixelHover({
          x: Math.floor(imgPos.x),
          y: Math.floor(imgPos.y),
          r: px[0], g: px[1], b: px[2], a: px[3]
        });
      }

      if (this.spacePressed) {
        this.setCursor('grab');
        return;
      }

      if (this.activeTool === 'crop') {
        this.cropManager.onMouseMove(e, imgPos);
      } else if (this.activeTool === 'cut') {
        this.cutManager.onMouseMove(e, imgPos);
        if (this.cutManager.mode === 'brush') {
          this.setCursor('none');
        } else {
          this.setCursor('crosshair');
        }
      } else {
        this.setCursor('default');
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.setCursor(this.spacePressed ? 'grab' : 'default');
      }

      const imgPos = this.screenToImg(e.clientX, e.clientY);

      if (this.activeTool === 'crop') {
        this.cropManager.onMouseUp(e, imgPos);
      } else if (this.activeTool === 'cut') {
        this.cutManager.onMouseUp(e, imgPos);
      }
    });

    this.overlayCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const rect = this.overlayCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.setZoom(this.zoom * zoomFactor, mouseX, mouseY);
    }, { passive: false });

    // Multi-touch gestures for mobile & tablet (Pinch to zoom + touch drawing/cropping)
    let initialPinchDist = null;
    let initialPinchZoom = 1.0;

    this.overlayCanvas.addEventListener('touchstart', (e) => {
      if (!this.hasImage()) return;
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const fakeMouseEvent = { clientX: touch.clientX, clientY: touch.clientY, button: 0 };
        const imgPos = this.screenToImg(touch.clientX, touch.clientY);
        if (this.activeTool === 'crop') this.cropManager.onMouseDown(fakeMouseEvent, imgPos);
        else if (this.activeTool === 'cut') this.cutManager.onMouseDown(fakeMouseEvent, imgPos);
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialPinchZoom = this.zoom;
      }
    }, { passive: false });

    this.overlayCanvas.addEventListener('touchmove', (e) => {
      if (!this.hasImage()) return;
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 1 && !initialPinchDist) {
        const touch = e.touches[0];
        const fakeMouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
        const imgPos = this.screenToImg(touch.clientX, touch.clientY);
        if (this.activeTool === 'crop') this.cropManager.onMouseMove(fakeMouseEvent, imgPos);
        else if (this.activeTool === 'cut') this.cutManager.onMouseMove(fakeMouseEvent, imgPos);
      } else if (e.touches.length === 2 && initialPinchDist) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const centerClientX = (t1.clientX + t2.clientX) / 2;
        const centerClientY = (t1.clientY + t2.clientY) / 2;
        const rect = this.overlayCanvas.getBoundingClientRect();
        const factor = currentDist / initialPinchDist;
        this.setZoom(initialPinchZoom * factor, centerClientX - rect.left, centerClientY - rect.top);
      }
    }, { passive: false });

    this.overlayCanvas.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialPinchDist = null;
      }
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const fakeMouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
        const imgPos = this.screenToImg(touch.clientX, touch.clientY);
        if (this.activeTool === 'crop') this.cropManager.onMouseUp(fakeMouseEvent, imgPos);
        else if (this.activeTool === 'cut') this.cutManager.onMouseUp(fakeMouseEvent, imgPos);
      }
    });
  }

  // Prepares export canvas with proper transparency handling and scaling
  getExportCanvas(format, scale = 1.0) {
    if (!this.hasImage()) return null;

    const srcW = this.currentCanvas.width;
    const srcH = this.currentCanvas.height;
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outW;
    exportCanvas.height = outH;
    const ctx = exportCanvas.getContext('2d');

    // If JPEG, fill white background to prevent transparent areas from turning black
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.currentCanvas, 0, 0, srcW, srcH, 0, 0, outW, outH);

    return exportCanvas;
  }

  exportImage(format = 'image/png', quality = 0.92, scale = 1.0) {
    const canvas = this.getExportCanvas(format, scale);
    if (!canvas) return null;
    return canvas.toDataURL(format, quality);
  }

  exportBlob(format = 'image/png', quality = 0.92, scale = 1.0) {
    const canvas = this.getExportCanvas(format, scale);
    if (!canvas) return Promise.resolve(null);
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), format, quality);
    });
  }
}
