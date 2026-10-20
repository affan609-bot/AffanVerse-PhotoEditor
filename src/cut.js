// Cut & Erase Tool Suite
// Supports: Precision Eraser Brush, Bounding Box Cut, and Freehand Lasso Cut

export class CutManager {
  constructor(editor) {
    this.editor = editor;
    this.mode = 'brush'; // 'brush' | 'rectangle' | 'lasso'

    // Brush Settings
    this.brushSize = 35;
    this.brushHardness = 80;
    this.brushOpacity = 100;

    // Fill mode: 'transparent' | 'white' | 'black'
    this.cutBackground = 'transparent';

    // Interaction State
    this.isDrawing = false;
    this.lastPoint = null;
    this.currentMousePos = null;

    // Selections
    this.rectStart = null;
    this.rectEnd = null;
    this.lassoPoints = [];
    this.isLassoClosed = false;

    this.tempCanvas = null;
  }

  setMode(mode) {
    this.mode = mode;
    this.resetSelection();
    this.editor.render();
  }

  resetSelection() {
    this.rectStart = null;
    this.rectEnd = null;
    this.lassoPoints = [];
    this.isLassoClosed = false;
    this.isDrawing = false;
    this.lastPoint = null;
    this.tempCanvas = null;
  }

  onMouseDown(e, imgPos) {
    if (!this.editor.hasImage()) return false;
    this.isDrawing = true;
    this.currentMousePos = { ...imgPos };

    if (this.mode === 'brush') {
      this.initStroke(imgPos);
      this.drawBrushDot(imgPos);
      return true;
    } else if (this.mode === 'rectangle') {
      this.rectStart = { ...imgPos };
      this.rectEnd = { ...imgPos };
      return true;
    } else if (this.mode === 'lasso') {
      this.lassoPoints = [{ ...imgPos }];
      this.isLassoClosed = false;
      return true;
    }

    return false;
  }

  onMouseMove(e, imgPos) {
    this.currentMousePos = imgPos ? { ...imgPos } : null;

    if (!this.isDrawing || !imgPos) {
      if (this.mode === 'brush') {
        this.editor.render();
      }
      return false;
    }

    if (this.mode === 'brush') {
      this.drawBrushSegment(this.lastPoint, imgPos);
      this.lastPoint = { ...imgPos };
      this.editor.render();
      return true;
    } else if (this.mode === 'rectangle') {
      this.rectEnd = { ...imgPos };
      this.editor.render();
      return true;
    } else if (this.mode === 'lasso') {
      const last = this.lassoPoints[this.lassoPoints.length - 1];
      if (!last || Math.hypot(imgPos.x - last.x, imgPos.y - last.y) >= 4) {
        this.lassoPoints.push({ ...imgPos });
        this.editor.render();
      }
      return true;
    }

    return false;
  }

  onMouseUp(e, imgPos) {
    if (!this.isDrawing) return false;
    this.isDrawing = false;

    if (this.mode === 'brush') {
      if (this.tempCanvas) {
        this.editor.pushHistory('Eraser Brush Cut', this.tempCanvas);
        this.tempCanvas = null;
      }
      this.lastPoint = null;
      this.editor.render();
      return true;
    } else if (this.mode === 'rectangle') {
      this.editor.render();
      return true;
    } else if (this.mode === 'lasso') {
      if (this.lassoPoints.length > 2) {
        this.isLassoClosed = true;
      }
      this.editor.render();
      return true;
    }

    return false;
  }

  initStroke(pos) {
    this.lastPoint = { ...pos };
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = this.editor.currentCanvas.width;
    this.tempCanvas.height = this.editor.currentCanvas.height;
    const ctx = this.tempCanvas.getContext('2d');
    ctx.drawImage(this.editor.currentCanvas, 0, 0);
  }

  drawBrushDot(pos) {
    if (!this.tempCanvas) return;
    const ctx = this.tempCanvas.getContext('2d');
    this.applyBrushToContext(ctx, pos.x, pos.y);
    this.editor.updateLiveCanvas(this.tempCanvas);
  }

  drawBrushSegment(p1, p2) {
    if (!this.tempCanvas || !p1 || !p2) return;
    const ctx = this.tempCanvas.getContext('2d');
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const step = Math.max(1, this.brushSize * 0.15);
    const steps = Math.ceil(dist / step);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      this.applyBrushToContext(ctx, x, y);
    }

    this.editor.updateLiveCanvas(this.tempCanvas);
  }

  applyBrushToContext(ctx, x, y) {
    ctx.save();
    const radius = this.brushSize / 2;
    const hardness = this.brushHardness / 100;
    const opacity = this.brushOpacity / 100;

    if (this.cutBackground === 'transparent') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (hardness >= 0.95) {
      ctx.fillStyle = this.getCutFillStyle(opacity);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grad = ctx.createRadialGradient(x, y, radius * hardness, x, y, radius);
      if (this.cutBackground === 'transparent') {
        grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        const rgb = this.cutBackground === 'white' ? '255, 255, 255' : '0, 0, 0';
        grad.addColorStop(0, `rgba(${rgb}, ${opacity})`);
        grad.addColorStop(1, `rgba(${rgb}, 0)`);
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getCutFillStyle(opacity = 1) {
    if (this.cutBackground === 'transparent') return `rgba(0, 0, 0, ${opacity})`;
    if (this.cutBackground === 'white') return `rgba(255, 255, 255, ${opacity})`;
    return `rgba(0, 0, 0, ${opacity})`;
  }

  executeRectCut(isolate = false) {
    if (!this.rectStart || !this.rectEnd) return;
    const imgW = this.editor.currentCanvas.width;
    const imgH = this.editor.currentCanvas.height;

    const rawX = Math.min(this.rectStart.x, this.rectEnd.x);
    const rawY = Math.min(this.rectStart.y, this.rectEnd.y);
    const rawW = Math.abs(this.rectEnd.x - this.rectStart.x);
    const rawH = Math.abs(this.rectEnd.y - this.rectStart.y);

    const x = Math.round(Math.max(0, Math.min(imgW, rawX)));
    const y = Math.round(Math.max(0, Math.min(imgH, rawY)));
    const w = Math.round(Math.min(imgW - x, rawW));
    const h = Math.round(Math.min(imgH - y, rawH));

    if (w < 2 || h < 2) return;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = imgW;
    newCanvas.height = imgH;
    const ctx = newCanvas.getContext('2d');

    if (!isolate) {
      // Erase inside box
      ctx.drawImage(this.editor.currentCanvas, 0, 0);
      if (this.cutBackground === 'transparent') {
        ctx.clearRect(x, y, w, h);
      } else {
        ctx.fillStyle = this.getCutFillStyle(1);
        ctx.fillRect(x, y, w, h);
      }
      this.editor.pushHistory('Box Cut (Erase Inside)', newCanvas);
    } else {
      // Isolate box
      if (this.cutBackground !== 'transparent') {
        ctx.fillStyle = this.getCutFillStyle(1);
        ctx.fillRect(0, 0, imgW, imgH);
      }
      ctx.drawImage(
        this.editor.currentCanvas,
        x, y, w, h,
        x, y, w, h
      );
      this.editor.pushHistory('Box Cut (Isolate Area)', newCanvas);
    }

    this.resetSelection();
    this.editor.render();
  }

  executeLassoCut(isolate = false) {
    if (this.lassoPoints.length < 3) return;

    const imgW = this.editor.currentCanvas.width;
    const imgH = this.editor.currentCanvas.height;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = imgW;
    newCanvas.height = imgH;
    const ctx = newCanvas.getContext('2d');

    if (!isolate) {
      // Erase inside lasso
      ctx.drawImage(this.editor.currentCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
      for (let i = 1; i < this.lassoPoints.length; i++) {
        ctx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
      }
      ctx.closePath();

      if (this.cutBackground === 'transparent') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000000';
        ctx.fill();
      } else {
        ctx.fillStyle = this.getCutFillStyle(1);
        ctx.fill();
      }
      ctx.restore();
      this.editor.pushHistory('Lasso Cut (Erase Area)', newCanvas);
    } else {
      // Isolate inside lasso
      if (this.cutBackground !== 'transparent') {
        ctx.fillStyle = this.getCutFillStyle(1);
        ctx.fillRect(0, 0, imgW, imgH);
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
      for (let i = 1; i < this.lassoPoints.length; i++) {
        ctx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(this.editor.currentCanvas, 0, 0);
      ctx.restore();

      this.editor.pushHistory('Lasso Cut (Isolate Subject)', newCanvas);
    }

    this.resetSelection();
    this.editor.render();
  }

  drawOverlay(ctx, imgToScreen) {
    if (!this.editor.hasImage()) return;

    ctx.save();

    // 1. Eraser Brush circular indicator
    if (this.mode === 'brush' && this.currentMousePos) {
      const screenPt = imgToScreen(this.currentMousePos.x, this.currentMousePos.y);
      const screenRadius = (this.brushSize / 2) * this.editor.zoom;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenPt.x, screenPt.y, screenRadius, 0, Math.PI * 2);
      ctx.stroke();

      if (this.brushHardness < 95) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(screenPt.x, screenPt.y, screenRadius * (this.brushHardness / 100), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 2. Rectangle Box Selection Marquee
    if (this.mode === 'rectangle' && this.rectStart && this.rectEnd) {
      const p0 = imgToScreen(Math.min(this.rectStart.x, this.rectEnd.x), Math.min(this.rectStart.y, this.rectEnd.y));
      const p1 = imgToScreen(Math.max(this.rectStart.x, this.rectEnd.x), Math.max(this.rectStart.y, this.rectEnd.y));
      const w = p1.x - p0.x;
      const h = p1.y - p0.y;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(p0.x, p0.y, w, h);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(p0.x, p0.y, w, h);
      ctx.setLineDash([]);
    }

    // 3. Freehand Lasso Path
    if (this.mode === 'lasso' && this.lassoPoints.length > 1) {
      ctx.beginPath();
      const p0 = imgToScreen(this.lassoPoints[0].x, this.lassoPoints[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < this.lassoPoints.length; i++) {
        const pt = imgToScreen(this.lassoPoints[i].x, this.lassoPoints[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      if (this.isLassoClosed) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fill();
      }

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
