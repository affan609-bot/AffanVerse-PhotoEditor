// Crop & Transform Manager
// Robust 8-handle box cropping with fixed-anchor aspect ratio constraints and rotation

export class CropManager {
  constructor(editor) {
    this.editor = editor;
    this.isActive = false;

    // Crop box coordinates in image space (0 to imgWidth, 0 to imgHeight)
    this.cropRect = null;
    this.aspectRatio = null; // null for free, or numeric (e.g., 1, 16/9, 4/3)

    // Dragging state
    this.dragTarget = null; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'move'
    this.dragStart = null;
    this.startRect = null;
  }

  start() {
    if (!this.editor.hasImage()) return;
    this.isActive = true;
    const imgW = this.editor.currentCanvas.width;
    const imgH = this.editor.currentCanvas.height;

    // Default crop box: inset by 8%
    const marginX = Math.round(imgW * 0.08);
    const marginY = Math.round(imgH * 0.08);
    this.cropRect = {
      x: marginX,
      y: marginY,
      width: Math.max(20, imgW - marginX * 2),
      height: Math.max(20, imgH - marginY * 2)
    };

    if (this.aspectRatio) {
      this.applyAspectRatioConstraint();
    }

    this.editor.render();
  }

  cancel() {
    this.isActive = false;
    this.cropRect = null;
    this.dragTarget = null;
    this.editor.render();
  }

  setAspectRatio(ratio) {
    this.aspectRatio = ratio;
    if (this.isActive && this.cropRect) {
      this.applyAspectRatioConstraint();
      this.editor.render();
    }
  }

  applyAspectRatioConstraint() {
    if (!this.aspectRatio || !this.cropRect) return;
    const imgW = this.editor.currentCanvas.width;
    const imgH = this.editor.currentCanvas.height;

    let targetW = this.cropRect.width;
    let targetH = targetW / this.aspectRatio;

    if (targetH > imgH * 0.95) {
      targetH = imgH * 0.95;
      targetW = targetH * this.aspectRatio;
    }
    if (targetW > imgW * 0.95) {
      targetW = imgW * 0.95;
      targetH = targetW / this.aspectRatio;
    }

    const cx = this.cropRect.x + this.cropRect.width / 2;
    const cy = this.cropRect.y + this.cropRect.height / 2;

    this.cropRect.width = Math.min(targetW, imgW);
    this.cropRect.height = Math.min(targetH, imgH);
    this.cropRect.x = Math.max(0, Math.min(cx - this.cropRect.width / 2, imgW - this.cropRect.width));
    this.cropRect.y = Math.max(0, Math.min(cy - this.cropRect.height / 2, imgH - this.cropRect.height));
  }

  onMouseDown(e, imgPos) {
    if (!this.isActive || !this.cropRect) return false;
    const handle = this.hitTest(imgPos);
    if (!handle) return false;

    this.dragTarget = handle;
    this.dragStart = { ...imgPos };
    this.startRect = { ...this.cropRect };
    return true;
  }

  onMouseMove(e, imgPos) {
    if (!this.isActive || !this.cropRect) return false;

    if (!this.dragTarget) {
      const handle = this.hitTest(imgPos);
      this.editor.setCursor(this.getCursorForHandle(handle));
      return !!handle;
    }

    const dx = imgPos.x - this.dragStart.x;
    const dy = imgPos.y - this.dragStart.y;
    const imgW = this.editor.currentCanvas.width;
    const imgH = this.editor.currentCanvas.height;
    const minSize = 25;

    let { x, y, width, height } = this.startRect;

    if (this.dragTarget === 'move') {
      x = Math.max(0, Math.min(x + dx, imgW - width));
      y = Math.max(0, Math.min(y + dy, imgH - height));
      this.cropRect = { x, y, width, height };
    } else {
      let left = x;
      let top = y;
      let right = x + width;
      let bottom = y + height;

      if (this.dragTarget.includes('w')) left = Math.min(right - minSize, Math.max(0, x + dx));
      if (this.dragTarget.includes('e')) right = Math.max(left + minSize, Math.min(imgW, x + width + dx));
      if (this.dragTarget.includes('n')) top = Math.min(bottom - minSize, Math.max(0, y + dy));
      if (this.dragTarget.includes('s')) bottom = Math.max(top + minSize, Math.min(imgH, y + height + dy));

      width = right - left;
      height = bottom - top;

      // Handle Aspect Ratio Constraints with proper Anchor
      if (this.aspectRatio) {
        if (this.dragTarget === 'e' || this.dragTarget === 'w') {
          height = width / this.aspectRatio;
          if (top + height > imgH) {
            height = imgH - top;
            width = height * this.aspectRatio;
            if (this.dragTarget === 'w') left = right - width;
          }
          bottom = top + height;
        } else if (this.dragTarget === 'n' || this.dragTarget === 's') {
          width = height * this.aspectRatio;
          if (left + width > imgW) {
            width = imgW - left;
            height = width / this.aspectRatio;
            if (this.dragTarget === 'n') top = bottom - height;
          }
          right = left + width;
        } else {
          // Diagonal handle anchoring
          if (this.dragTarget === 'se') {
            const r = width / height;
            if (r > this.aspectRatio) width = height * this.aspectRatio;
            else height = width / this.aspectRatio;
            right = Math.min(imgW, left + width);
            bottom = Math.min(imgH, top + height);
          } else if (this.dragTarget === 'nw') {
            const anchorX = right;
            const anchorY = bottom;
            const r = width / height;
            if (r > this.aspectRatio) width = height * this.aspectRatio;
            else height = width / this.aspectRatio;
            left = Math.max(0, anchorX - width);
            top = Math.max(0, anchorY - height);
          } else if (this.dragTarget === 'ne') {
            const anchorX = left;
            const anchorY = bottom;
            const r = width / height;
            if (r > this.aspectRatio) width = height * this.aspectRatio;
            else height = width / this.aspectRatio;
            right = Math.min(imgW, anchorX + width);
            top = Math.max(0, anchorY - height);
          } else if (this.dragTarget === 'sw') {
            const anchorX = right;
            const anchorY = top;
            const r = width / height;
            if (r > this.aspectRatio) width = height * this.aspectRatio;
            else height = width / this.aspectRatio;
            left = Math.max(0, anchorX - width);
            bottom = Math.min(imgH, anchorY + height);
          }
          width = right - left;
          height = bottom - top;
        }
      }

      this.cropRect = {
        x: Math.max(0, left),
        y: Math.max(0, top),
        width: Math.min(imgW - left, width),
        height: Math.min(imgH - top, height)
      };
    }

    this.editor.render();
    return true;
  }

  onMouseUp() {
    if (this.dragTarget) {
      this.dragTarget = null;
      this.dragStart = null;
      this.startRect = null;
      return true;
    }
    return false;
  }

  hitTest(imgPos) {
    if (!this.cropRect) return null;
    const { x, y, width, height } = this.cropRect;
    const scale = this.editor.zoom;
    const hitRadius = 14 / scale;

    const handles = {
      nw: { x, y },
      ne: { x: x + width, y },
      se: { x: x + width, y: y + height },
      sw: { x, y: y + height },
      n: { x: x + width / 2, y },
      s: { x: x + width / 2, y: y + height },
      w: { x, y: y + height / 2 },
      e: { x: x + width, y: y + height / 2 }
    };

    for (const [key, pt] of Object.entries(handles)) {
      if (Math.hypot(imgPos.x - pt.x, imgPos.y - pt.y) <= hitRadius) {
        return key;
      }
    }

    if (imgPos.x >= x && imgPos.x <= x + width && imgPos.y >= y && imgPos.y <= y + height) {
      return 'move';
    }

    return null;
  }

  getCursorForHandle(handle) {
    switch (handle) {
      case 'nw':
      case 'se': return 'nwse-resize';
      case 'ne':
      case 'sw': return 'nesw-resize';
      case 'n':
      case 's': return 'ns-resize';
      case 'e':
      case 'w': return 'ew-resize';
      case 'move': return 'move';
      default: return 'default';
    }
  }

  drawOverlay(ctx, imgToScreen) {
    if (!this.isActive || !this.cropRect) return;

    const imgW = this.editor.currentCanvas.width;
    const imgH = this.editor.currentCanvas.height;

    const p0 = imgToScreen(0, 0);
    const p1 = imgToScreen(imgW, imgH);
    const c0 = imgToScreen(this.cropRect.x, this.cropRect.y);
    const c1 = imgToScreen(this.cropRect.x + this.cropRect.width, this.cropRect.y + this.cropRect.height);

    ctx.save();

    // Dark mask outside crop box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(p0.x, p0.y, p1.x - p0.x, c0.y - p0.y);
    ctx.fillRect(p0.x, c1.y, p1.x - p0.x, p1.y - c1.y);
    ctx.fillRect(p0.x, c0.y, c0.x - p0.x, c1.y - c0.y);
    ctx.fillRect(c1.x, c0.y, p1.x - c1.x, c1.y - c0.y);

    // Crop box outline
    const boxW = c1.x - c0.x;
    const boxH = c1.y - c0.y;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(c0.x, c0.y, boxW, boxH);

    // Rule of thirds grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const thirdW = boxW / 3;
    const thirdH = boxH / 3;

    ctx.beginPath();
    ctx.moveTo(c0.x + thirdW, c0.y);
    ctx.lineTo(c0.x + thirdW, c1.y);
    ctx.moveTo(c0.x + thirdW * 2, c0.y);
    ctx.lineTo(c0.x + thirdW * 2, c1.y);
    ctx.moveTo(c0.x, c0.y + thirdH);
    ctx.lineTo(c1.x, c0.y + thirdH);
    ctx.moveTo(c0.x, c0.y + thirdH * 2);
    ctx.lineTo(c1.x, c0.y + thirdH * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 8 resize handles
    const handleSize = 10;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;

    const handles = [
      [c0.x, c0.y],
      [c0.x + boxW / 2, c0.y],
      [c1.x, c0.y],
      [c1.x, c0.y + boxH / 2],
      [c1.x, c1.y],
      [c0.x + boxW / 2, c1.y],
      [c0.x, c1.y],
      [c0.x, c0.y + boxH / 2]
    ];

    handles.forEach(([hx, hy]) => {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    });

    // Dimension label
    const infoText = `${Math.round(this.cropRect.width)} × ${Math.round(this.cropRect.height)} px`;
    ctx.font = '12px Inter, sans-serif';
    const textWidth = ctx.measureText(infoText).width;
    const tagX = c0.x + boxW / 2 - (textWidth + 16) / 2;
    const tagY = Math.max(10, c0.y - 28);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, textWidth + 16, 22, 4);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(infoText, tagX + 8, tagY + 15);

    ctx.restore();
  }

  applyCrop() {
    if (!this.isActive || !this.cropRect) return;

    const rx = Math.round(Math.max(0, this.cropRect.x));
    const ry = Math.round(Math.max(0, this.cropRect.y));
    const rw = Math.round(Math.min(this.editor.currentCanvas.width - rx, this.cropRect.width));
    const rh = Math.round(Math.min(this.editor.currentCanvas.height - ry, this.cropRect.height));

    if (rw <= 0 || rh <= 0) return;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = rw;
    croppedCanvas.height = rh;
    const ctx = croppedCanvas.getContext('2d');

    ctx.drawImage(
      this.editor.currentCanvas,
      rx, ry, rw, rh,
      0, 0, rw, rh
    );

    this.editor.pushHistory('Crop Image', croppedCanvas);
    this.isActive = false;
    this.cropRect = null;
    this.editor.fitToScreen();
  }

  rotate(degrees) {
    if (!this.editor.hasImage()) return;
    const src = this.editor.currentCanvas;
    const rad = (degrees * Math.PI) / 180;
    const isQuarter = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = isQuarter ? src.height : src.width;
    newCanvas.height = isQuarter ? src.width : src.height;

    const ctx = newCanvas.getContext('2d');
    ctx.translate(newCanvas.width / 2, newCanvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);

    this.editor.pushHistory(`Rotate ${degrees}°`, newCanvas);
    if (this.isActive) this.start();
    else this.editor.fitToScreen();
  }

  flip(horizontal = true) {
    if (!this.editor.hasImage()) return;
    const src = this.editor.currentCanvas;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = src.width;
    newCanvas.height = src.height;

    const ctx = newCanvas.getContext('2d');
    ctx.translate(horizontal ? newCanvas.width : 0, horizontal ? 0 : newCanvas.height);
    ctx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
    ctx.drawImage(src, 0, 0);

    this.editor.pushHistory(horizontal ? 'Flip Horizontal' : 'Flip Vertical', newCanvas);
    if (this.isActive) this.start();
    else this.editor.render();
  }
}
