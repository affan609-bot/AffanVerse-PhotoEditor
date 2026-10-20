# 🎨 AffanVerse Photo Editor

A modern, high-performance, and responsive Web Photo Editor built for precision cropping, cutting/erasing, and intelligent photo enhancement.

![AffanVerse Logo](public/affanverse-logo.jpg)

---

## 🌟 Key Features

### 1. ✂️ Crop & Transform
- **Interactive 8-Handle Crop Box**: Precision dragging with live rule-of-thirds grid.
- **Aspect Ratio Presets**: Freeform, 1:1 (Square / Avatar), 16:9 (Widescreen), 9:16 (Stories / Reels / Shorts), 4:3, and 3:2.
- **Rotation & Flips**: 90° Clockwise, 90° Counter-Clockwise, Flip Horizontally, and Flip Vertically.

### 2. 🪄 Cut & Erase
- **Precision Eraser Brush**: Erase parts of the photo with adjustable brush size, softness/hardness, and opacity. Features a circular cursor preview.
- **Bounding Box Cut**: Select any rectangular area to erase inside or isolate/cut out the subject.
- **Freehand Lasso Silhouette Cut**: Trace freeform shapes around any subject to isolate or erase with transparent PNG support.
- **Fill Backgrounds**: Transparent (checkerboard), solid white, or solid black.

### 3. ✨ Smart Auto-Enhance & Color Grading
- **One-Click Auto-Enhance**: Real-time luminance histogram analysis to stretch contrast, balance dynamic range, and boost clarity.
- **Live RGB Histogram**: Displays Red, Green, Blue, and Luminance channel distributions in real time.
- **Fine Adjustment Sliders**:
  - Brightness, Contrast, Exposure, Highlights, Shadows
  - Saturation, Vibrance, Warmth (Temperature), Tint
  - Sharpness (3x3 Laplacian convolution unsharp mask), Fast Blur, and Vignette falloff.
- **10 Film & Color Presets**: Vivid Pop, Cinematic Teal/Orange, Noir B&W, Golden Hour, Nordic Cool, Retro Film, Cyberpunk Neon, Dramatic HDR, and Antique Sepia.

### 4. 📱 Full Multi-Device Responsiveness
- **Desktop (>1024px)**: Full studio interface with side inspector and status bar.
- **Tablet (680px - 1024px)**: Compact layout with spacious canvas.
- **Mobile (320px - 680px)**: Mobile-first layout with canvas on top, bottom inspector drawer, and bottom navigation toolbar.
- **Touch & Gesture Engine**: Single-touch editing and two-finger pinch-to-zoom.

### 5. 💾 Multi-Resolution Export
- **Formats**: PNG (Lossless with alpha), JPEG (with matte background compositor), and WEBP.
- **Scale Options**: 0.5x (Half), 1x (Original resolution), and 2x (Ultra resolution).
- **Clipboard**: Direct copy to clipboard (`Ctrl+C` / Copy button).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space + Drag` | Pan canvas |
| `Mouse Scroll` | Smooth Zoom in / out |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + O` | Open image |
| `Ctrl + S` | Export image |
| `Enter` | Apply active crop |
| `Escape` | Cancel active crop / Close modal |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/affan609-bot/AffanVerse-PhotoEditor.git
cd AffanVerse-PhotoEditor

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 📄 License
MIT License. Built with ❤️ for **AffanVerse**.
