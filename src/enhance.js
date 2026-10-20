// Image Enhancement & Adjustment Engine
// High-performance scalable pixel processing with multi-level preview acceleration

export class ImageEnhancer {
  static defaultAdjustments() {
    return {
      brightness: 0,      // -100 to 100
      contrast: 0,        // -100 to 100
      exposure: 0,        // -100 to 100
      highlights: 0,      // -100 to 100
      shadows: 0,         // -100 to 100
      saturation: 0,      // -100 to 100
      vibrance: 0,        // -100 to 100
      temperature: 0,     // -100 to 100 (Cool to Warm)
      tint: 0,            // -100 to 100 (Green to Magenta)
      sharpness: 0,       // 0 to 100
      blur: 0,            // 0 to 50
      vignette: 0         // 0 to 100
    };
  }

  // Calculate image statistics and return optimal auto-enhancement adjustments
  static calculateAutoEnhance(sourceCtx, width, height) {
    const sampleW = Math.min(width, 320);
    const sampleH = Math.round((height / width) * sampleW);
    const offCanvas = document.createElement('canvas');
    offCanvas.width = sampleW;
    offCanvas.height = sampleH;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(sourceCtx.canvas, 0, 0, sampleW, sampleH);

    const data = offCtx.getImageData(0, 0, sampleW, sampleH).data;
    const len = data.length;

    let minLum = 255;
    let maxLum = 0;
    let sumLum = 0;
    let sumSat = 0;
    let nonTransparentCount = 0;

    for (let i = 0; i < len; i += 4) {
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
      sumLum += lum;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      sumSat += sat;
      nonTransparentCount++;
    }

    if (nonTransparentCount === 0) return this.defaultAdjustments();

    const avgLum = sumLum / nonTransparentCount;
    const avgSat = sumSat / nonTransparentCount;

    let brightness = 0;
    if (avgLum < 110) brightness = Math.min(25, Math.round((120 - avgLum) * 0.4));
    else if (avgLum > 165) brightness = -Math.min(20, Math.round((avgLum - 150) * 0.3));

    let contrast = 0;
    const range = maxLum - minLum;
    if (range < 190) contrast = Math.min(30, Math.round((200 - range) * 0.25));

    let vibrance = 15;
    if (avgSat < 0.35) vibrance = 25;
    else if (avgSat > 0.6) vibrance = 5;

    return {
      brightness,
      contrast: contrast + 10,
      exposure: 4,
      highlights: -10,
      shadows: 14,
      saturation: 8,
      vibrance,
      temperature: 3,
      tint: 0,
      sharpness: 16,
      blur: 0,
      vignette: 0
    };
  }

  // Fast scalable adjustment applicator
  // If maxDimension is passed, processes on a downscaled preview for real-time 60fps slider feedback
  static applyAdjustments(sourceCanvas, adjustments, maxDimension = null) {
    let width = sourceCanvas.width;
    let height = sourceCanvas.height;
    let isDownscaled = false;

    if (maxDimension && (width > maxDimension || height > maxDimension)) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      isDownscaled = true;
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(sourceCanvas, 0, 0, width, height);

    const imgData = outCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    const bVal = adjustments.brightness;
    const cVal = adjustments.contrast;
    const expVal = adjustments.exposure;
    const hlVal = adjustments.highlights;
    const shVal = adjustments.shadows;
    const satVal = adjustments.saturation;
    const vibVal = adjustments.vibrance;
    const tempVal = adjustments.temperature;
    const tintVal = adjustments.tint;

    const hasToneAdjustments = bVal !== 0 || cVal !== 0 || expVal !== 0 || hlVal !== 0 || shVal !== 0 || satVal !== 0 || vibVal !== 0 || tempVal !== 0 || tintVal !== 0;

    if (hasToneAdjustments) {
      const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));
      const exposureFactor = Math.pow(2, expVal / 70);
      const satFactor = (satVal + 100) / 100;
      const vibFactor = vibVal / 100;

      const rShift = (tempVal * 0.8) + (tintVal * 0.4);
      const gShift = -(tintVal * 0.6);
      const bShift = -(tempVal * 0.8);

      for (let i = 0; i < len; i += 4) {
        if (data[i + 3] === 0) continue;

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Exposure & Brightness
        if (expVal !== 0) {
          r *= exposureFactor;
          g *= exposureFactor;
          b *= exposureFactor;
        }
        if (bVal !== 0) {
          const shift = bVal * 1.28;
          r += shift;
          g += shift;
          b += shift;
        }

        // Contrast
        if (cVal !== 0) {
          r = contrastFactor * (r - 128) + 128;
          g = contrastFactor * (g - 128) + 128;
          b = contrastFactor * (b - 128) + 128;
        }

        // Highlights & Shadows
        if (hlVal !== 0 || shVal !== 0) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (hlVal !== 0 && lum > 128) {
            const shift = hlVal * ((lum - 128) / 127) * 0.6;
            r += shift; g += shift; b += shift;
          }
          if (shVal !== 0 && lum < 128) {
            const shift = shVal * ((128 - lum) / 128) * 0.6;
            r += shift; g += shift; b += shift;
          }
        }

        // Temperature & Tint
        if (tempVal !== 0 || tintVal !== 0) {
          r += rShift;
          g += gShift;
          b += bShift;
        }

        // Saturation & Vibrance
        if (satVal !== 0 || vibVal !== 0) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (satVal !== 0) {
            r = lum + (r - lum) * satFactor;
            g = lum + (g - lum) * satFactor;
            b = lum + (b - lum) * satFactor;
          }
          if (vibVal !== 0) {
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const currentSat = (maxC - minC) / (maxC + 0.001);
            const boost = (1 - currentSat) * vibFactor;
            r += (r - lum) * boost;
            g += (g - lum) * boost;
            b += (b - lum) * boost;
          }
        }

        data[i] = r < 0 ? 0 : (r > 255 ? 255 : r);
        data[i + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
        data[i + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
      }

      outCtx.putImageData(imgData, 0, 0);
    }

    // Detail & FX
    if (adjustments.sharpness > 0) {
      this.applySharpen(outCtx, width, height, adjustments.sharpness);
    }
    if (adjustments.blur > 0) {
      const radius = Math.round(adjustments.blur * 0.25 * (isDownscaled ? (width / sourceCanvas.width) : 1));
      this.applyFastBlur(outCtx, width, height, Math.max(1, radius));
    }
    if (adjustments.vignette > 0) {
      this.applyVignette(outCtx, width, height, adjustments.vignette);
    }

    return outCanvas;
  }

  // 3x3 Convolution Sharpening
  static applySharpen(ctx, width, height, strength) {
    const src = ctx.getImageData(0, 0, width, height).data;
    const dstData = ctx.createImageData(width, height);
    const dst = dstData.data;

    const factor = (strength / 100) * 0.65;
    const centerWeight = 1 + 4 * factor;

    for (let y = 0; y < height; y++) {
      const yPrev = (y > 0 ? y - 1 : 0) * width;
      const yCurr = y * width;
      const yNext = (y < height - 1 ? y + 1 : y) * width;

      for (let x = 0; x < width; x++) {
        const xPrev = x > 0 ? x - 1 : 0;
        const xNext = x < width - 1 ? x + 1 : x;

        const idx = (yCurr + x) * 4;
        const idxT = (yPrev + x) * 4;
        const idxB = (yNext + x) * 4;
        const idxL = (yCurr + xPrev) * 4;
        const idxR = (yCurr + xNext) * 4;

        for (let c = 0; c < 3; c++) {
          const val = centerWeight * src[idx + c] - factor * (src[idxT + c] + src[idxB + c] + src[idxL + c] + src[idxR + c]);
          dst[idx + c] = val < 0 ? 0 : (val > 255 ? 255 : val);
        }
        dst[idx + 3] = src[idx + 3];
      }
    }
    ctx.putImageData(dstData, 0, 0);
  }

  // Separable fast box blur
  static applyFastBlur(ctx, width, height, radius) {
    if (radius <= 0) return;
    const imgData = ctx.getImageData(0, 0, width, height);
    const src = imgData.data;
    const dst = new Uint8ClampedArray(src.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        for (let k = -radius; k <= radius; k++) {
          const nx = Math.min(Math.max(x + k, 0), width - 1);
          const idx = (rowOffset + nx) * 4;
          r += src[idx];
          g += src[idx + 1];
          b += src[idx + 2];
          a += src[idx + 3];
          count++;
        }
        const outIdx = (rowOffset + x) * 4;
        dst[outIdx] = r / count;
        dst[outIdx + 1] = g / count;
        dst[outIdx + 2] = b / count;
        dst[outIdx + 3] = a / count;
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        for (let k = -radius; k <= radius; k++) {
          const ny = Math.min(Math.max(y + k, 0), height - 1);
          const idx = (ny * width + x) * 4;
          r += dst[idx];
          g += dst[idx + 1];
          b += dst[idx + 2];
          a += dst[idx + 3];
          count++;
        }
        const outIdx = (y * width + x) * 4;
        src[outIdx] = r / count;
        src[outIdx + 1] = g / count;
        src[outIdx + 2] = b / count;
        src[outIdx + 3] = a / count;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // Radial Vignette
  static applyVignette(ctx, width, height, strength) {
    const maxRadius = Math.sqrt(width * width + height * height) * 0.55;
    const innerRadius = maxRadius * (1 - (strength / 100) * 0.6);
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, innerRadius,
      width / 2, height / 2, maxRadius
    );
    const alpha = (strength / 100) * 0.75;
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
