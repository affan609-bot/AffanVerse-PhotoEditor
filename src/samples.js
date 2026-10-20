// Generates beautiful procedural sample photos without external network dependencies
export function generateSampleImage(type = 'sunset') {
  const width = 1600;
  const height = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (type === 'sunset') {
    // 1. Golden Sunset & Mountain Lake
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.65);
    sky.addColorStop(0, '#1a103c');
    sky.addColorStop(0.25, '#4e1e5b');
    sky.addColorStop(0.55, '#c73e3a');
    sky.addColorStop(0.75, '#ea7333');
    sky.addColorStop(0.9, '#f9be4a');
    sky.addColorStop(1, '#ffea9f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height * 0.65);

    // Glowing Sun
    const sunGrad = ctx.createRadialGradient(width * 0.52, height * 0.52, 10, width * 0.52, height * 0.52, 180);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.2, '#fff1a8');
    sunGrad.addColorStop(0.5, 'rgba(255, 170, 60, 0.6)');
    sunGrad.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width * 0.52, height * 0.52, 180, 0, Math.PI * 2);
    ctx.fill();

    // Distant soft mountains
    ctx.fillStyle = '#672a5a';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.56);
    for (let x = 0; x <= width; x += 40) {
      const y = height * 0.52 + Math.sin(x * 0.005) * 40 + Math.cos(x * 0.012) * 25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height * 0.65);
    ctx.lineTo(0, height * 0.65);
    ctx.closePath();
    ctx.fill();

    // Midground sharp mountain peaks
    ctx.fillStyle = '#2d183b';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.65);
    const peaks = [
      [0, height * 0.55],
      [width * 0.15, height * 0.42],
      [width * 0.28, height * 0.52],
      [width * 0.42, height * 0.38],
      [width * 0.55, height * 0.49],
      [width * 0.72, height * 0.34],
      [width * 0.88, height * 0.48],
      [width, height * 0.40],
      [width, height * 0.65]
    ];
    ctx.moveTo(peaks[0][0], peaks[0][1]);
    for (let i = 1; i < peaks.length; i++) {
      ctx.lineTo(peaks[i][0], peaks[i][1]);
    }
    ctx.lineTo(width, height * 0.65);
    ctx.lineTo(0, height * 0.65);
    ctx.closePath();
    ctx.fill();

    // Lake Water
    const water = ctx.createLinearGradient(0, height * 0.65, 0, height);
    water.addColorStop(0, '#2b1b36');
    water.addColorStop(0.3, '#c25338');
    water.addColorStop(0.6, '#392138');
    water.addColorStop(1, '#0e0b16');
    ctx.fillStyle = water;
    ctx.fillRect(0, height * 0.65, width, height * 0.35);

    // Lake Sun Reflection
    const refl = ctx.createLinearGradient(width * 0.45, height * 0.65, width * 0.59, height);
    refl.addColorStop(0, 'rgba(255, 230, 150, 0.7)');
    refl.addColorStop(0.4, 'rgba(240, 130, 60, 0.4)');
    refl.addColorStop(1, 'rgba(200, 80, 50, 0)');
    ctx.fillStyle = refl;
    ctx.beginPath();
    ctx.moveTo(width * 0.49, height * 0.65);
    ctx.lineTo(width * 0.55, height * 0.65);
    ctx.lineTo(width * 0.68, height);
    ctx.lineTo(width * 0.36, height);
    ctx.closePath();
    ctx.fill();

    // Water ripple highlights
    ctx.strokeStyle = 'rgba(255, 220, 140, 0.4)';
    ctx.lineWidth = 1.5;
    for (let y = height * 0.66; y < height; y += 7) {
      const spread = (y - height * 0.65) * 0.55;
      const startX = width * 0.52 - spread * (0.8 + Math.random() * 0.4);
      const endX = width * 0.52 + spread * (0.8 + Math.random() * 0.4);
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Foreground shoreline and pine silhouettes
    ctx.fillStyle = '#0f0a14';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.85);
    ctx.quadraticCurveTo(width * 0.25, height * 0.82, width * 0.4, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Draw silhouettes of pine trees
    function drawTree(tx, ty, tHeight) {
      ctx.fillStyle = '#0a070f';
      ctx.beginPath();
      ctx.moveTo(tx, ty - tHeight);
      ctx.lineTo(tx + tHeight * 0.25, ty);
      ctx.lineTo(tx - tHeight * 0.25, ty);
      ctx.closePath();
      ctx.fill();
    }
    const treeX = [40, 80, 130, 180, 240, 310, 380, width - 60, width - 120, width - 190];
    treeX.forEach(x => {
      const h = 90 + Math.random() * 90;
      drawTree(x, height * 0.86 + (x < 400 ? (x * 0.1) : 0), h);
    });

  } else if (type === 'cyberpunk') {
    // 2. Cyberpunk Neon City
    const darkSky = ctx.createLinearGradient(0, 0, 0, height);
    darkSky.addColorStop(0, '#060814');
    darkSky.addColorStop(0.6, '#0f172a');
    darkSky.addColorStop(1, '#020617');
    ctx.fillStyle = darkSky;
    ctx.fillRect(0, 0, width, height);

    // Glowing neon fog
    const fog = ctx.createRadialGradient(width * 0.5, height * 0.7, 50, width * 0.5, height * 0.7, width * 0.6);
    fog.addColorStop(0, 'rgba(236, 72, 153, 0.25)');
    fog.addColorStop(0.4, 'rgba(6, 182, 212, 0.2)');
    fog.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, width, height);

    // Buildings
    const bldCount = 18;
    for (let i = 0; i < bldCount; i++) {
      const bx = (i / bldCount) * width + (Math.random() * 20 - 10);
      const bw = width / bldCount * 1.3;
      const bh = height * (0.4 + Math.random() * 0.45);
      const by = height - bh;

      // Building facade
      ctx.fillStyle = i % 2 === 0 ? '#0b1120' : '#070b15';
      ctx.fillRect(bx, by, bw, bh);

      // Neon edge / outline
      ctx.strokeStyle = i % 3 === 0 ? '#06b6d4' : (i % 3 === 1 ? '#ec4899' : '#8b5cf6');
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Glowing windows
      ctx.fillStyle = i % 2 === 0 ? 'rgba(6, 182, 212, 0.75)' : 'rgba(236, 72, 153, 0.75)';
      for (let wy = by + 20; wy < height - 50; wy += 28) {
        for (let wx = bx + 12; wx < bx + bw - 15; wx += 20) {
          if (Math.random() > 0.4) {
            ctx.fillRect(wx, wy, 8, 12);
          }
        }
      }
    }

    // Wet asphalt street reflection
    const road = ctx.createLinearGradient(0, height * 0.8, 0, height);
    road.addColorStop(0, '#090d16');
    road.addColorStop(0.4, '#151d2f');
    road.addColorStop(1, '#05070c');
    ctx.fillStyle = road;
    ctx.fillRect(0, height * 0.8, width, height * 0.2);

    // Neon streaks on street
    const streaks = [
      { x: width * 0.2, col: 'rgba(236, 72, 153, 0.6)', w: 80 },
      { x: width * 0.45, col: 'rgba(6, 182, 212, 0.8)', w: 120 },
      { x: width * 0.75, col: 'rgba(168, 85, 247, 0.6)', w: 90 },
      { x: width * 0.6, col: 'rgba(234, 179, 8, 0.7)', w: 70 }
    ];
    streaks.forEach(s => {
      const sg = ctx.createLinearGradient(s.x, height * 0.8, s.x, height);
      sg.addColorStop(0, s.col);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(s.x - s.w / 2, height * 0.8, s.w, height * 0.2);
    });

  } else {
    // 3. Vibrant Tropical Foliage & Flower
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#064e3b');
    bg.addColorStop(0.5, '#042f2e');
    bg.addColorStop(1, '#022c22');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Bokeh light spheres
    for (let i = 0; i < 40; i++) {
      const bx = Math.random() * width;
      const by = Math.random() * height;
      const br = 20 + Math.random() * 80;
      const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bGrad.addColorStop(0, 'rgba(52, 211, 153, 0.25)');
      bGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.08)');
      bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    // Big monster leaves
    function drawLeaf(lx, ly, angle, scale, col) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(80, -120, 220, -100, 300, 0);
      ctx.bezierCurveTo(220, 100, 80, 120, 0, 0);
      ctx.fill();
      ctx.strokeStyle = '#022c22';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(290, 0);
      ctx.stroke();
      ctx.restore();
    }

    drawLeaf(width * 0.2, height * 0.3, 0.4, 1.4, '#059669');
    drawLeaf(width * 0.8, height * 0.4, -0.6, 1.3, '#10b981');
    drawLeaf(width * 0.3, height * 0.8, -0.3, 1.5, '#047857');
    drawLeaf(width * 0.75, height * 0.85, 0.5, 1.4, '#065f46');

    // Central vibrant Hibiscus / Tropical Flower
    const cx = width * 0.5;
    const cy = height * 0.5;
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
      const rot = (i * Math.PI * 2) / petalCount;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      const pGrad = ctx.createRadialGradient(0, -90, 10, 0, -90, 160);
      pGrad.addColorStop(0, '#fb7185');
      pGrad.addColorStop(0.5, '#e11d48');
      pGrad.addColorStop(1, '#9f1239');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-90, -80, -110, -190, 0, -210);
      ctx.bezierCurveTo(110, -190, 90, -80, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    // Flower center stamen
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 45);
    centerGrad.addColorStop(0, '#fef08a');
    centerGrad.addColorStop(0.5, '#f59e0b');
    centerGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}
