// Real-time RGB and Luminance Histogram Renderer
export class HistogramRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
  }

  update(sourceCanvas) {
    if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.25, 0); ctx.lineTo(w * 0.25, h);
    ctx.moveTo(w * 0.5, 0);  ctx.lineTo(w * 0.5, h);
    ctx.moveTo(w * 0.75, 0); ctx.lineTo(w * 0.75, h);
    ctx.stroke();

    // Downsample image for fast histogram computation
    const sampleW = Math.min(sourceCanvas.width, 300);
    const sampleH = Math.round((sourceCanvas.height / sourceCanvas.width) * sampleW);

    const off = document.createElement('canvas');
    off.width = sampleW;
    off.height = sampleH;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(sourceCanvas, 0, 0, sampleW, sampleH);

    const imgData = offCtx.getImageData(0, 0, sampleW, sampleH).data;
    const len = imgData.length;

    const rHist = new Uint32Array(256);
    const gHist = new Uint32Array(256);
    const bHist = new Uint32Array(256);

    for (let i = 0; i < len; i += 4) {
      if (imgData[i + 3] === 0) continue; // Skip transparent
      rHist[imgData[i]]++;
      gHist[imgData[i + 1]]++;
      bHist[imgData[i + 2]]++;
    }

    // Find max frequency for normalization (ignore extreme spikes)
    let maxCount = 1;
    for (let i = 2; i < 254; i++) {
      if (rHist[i] > maxCount) maxCount = rHist[i];
      if (gHist[i] > maxCount) maxCount = gHist[i];
      if (bHist[i] > maxCount) maxCount = bHist[i];
    }

    // Draw channels with soft blend
    this.drawChannel(rHist, maxCount, 'rgba(239, 68, 68, 0.55)', 'rgba(239, 68, 68, 0.85)');
    this.drawChannel(gHist, maxCount, 'rgba(34, 197, 94, 0.55)', 'rgba(34, 197, 94, 0.85)');
    this.drawChannel(bHist, maxCount, 'rgba(59, 130, 246, 0.55)', 'rgba(59, 130, 246, 0.85)');
  }

  drawChannel(hist, maxVal, fillStyle, strokeStyle) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * w;
      const count = Math.min(hist[i], maxVal);
      const y = h - (count / maxVal) * (h - 4);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
