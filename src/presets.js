// Filter Presets & Looks
export const FILTER_PRESETS = [
  {
    id: 'original',
    name: 'Original',
    adjustments: {
      brightness: 0, contrast: 0, exposure: 0, highlights: 0, shadows: 0,
      saturation: 0, vibrance: 0, temperature: 0, tint: 0, sharpness: 0, blur: 0, vignette: 0
    }
  },
  {
    id: 'vivid',
    name: 'Vivid Pop',
    adjustments: {
      brightness: 5, contrast: 18, exposure: 4, highlights: -8, shadows: 12,
      saturation: 25, vibrance: 30, temperature: 4, tint: 0, sharpness: 22, blur: 0, vignette: 10
    }
  },
  {
    id: 'cinematic',
    name: 'Cinematic Teal/Orange',
    adjustments: {
      brightness: -4, contrast: 24, exposure: 2, highlights: 10, shadows: -15,
      saturation: 12, vibrance: 18, temperature: 14, tint: -8, sharpness: 20, blur: 0, vignette: 28
    }
  },
  {
    id: 'noir',
    name: 'B&W Noir',
    adjustments: {
      brightness: 4, contrast: 36, exposure: 2, highlights: 15, shadows: -25,
      saturation: -100, vibrance: -100, temperature: 0, tint: 0, sharpness: 30, blur: 0, vignette: 35
    }
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    adjustments: {
      brightness: 8, contrast: 12, exposure: 6, highlights: -5, shadows: 20,
      saturation: 20, vibrance: 25, temperature: 32, tint: 4, sharpness: 10, blur: 0, vignette: 15
    }
  },
  {
    id: 'nordic',
    name: 'Nordic Cool',
    adjustments: {
      brightness: 2, contrast: 15, exposure: 0, highlights: 8, shadows: -8,
      saturation: -18, vibrance: -10, temperature: -28, tint: 6, sharpness: 25, blur: 0, vignette: 12
    }
  },
  {
    id: 'vintage',
    name: 'Retro Film',
    adjustments: {
      brightness: 6, contrast: -12, exposure: 5, highlights: -15, shadows: 28,
      saturation: -15, vibrance: -5, temperature: 16, tint: 12, sharpness: 0, blur: 0, vignette: 24
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    adjustments: {
      brightness: -6, contrast: 32, exposure: 5, highlights: 25, shadows: -20,
      saturation: 35, vibrance: 40, temperature: -12, tint: 25, sharpness: 30, blur: 0, vignette: 30
    }
  },
  {
    id: 'dramatic',
    name: 'Dramatic HDR',
    adjustments: {
      brightness: -2, contrast: 30, exposure: 0, highlights: -25, shadows: 35,
      saturation: 15, vibrance: 20, temperature: -2, tint: 0, sharpness: 45, blur: 0, vignette: 40
    }
  },
  {
    id: 'sepia',
    name: 'Antique Sepia',
    adjustments: {
      brightness: 8, contrast: 10, exposure: 4, highlights: 0, shadows: 15,
      saturation: -70, vibrance: -60, temperature: 45, tint: 15, sharpness: 10, blur: 0, vignette: 30
    }
  }
];
