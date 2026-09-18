# Happit Icons

This directory contains PWA icons for Happit.

## Icon Generation

The icons should be generated from icon.svg at the following sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512
- 192x192-maskable (with safe zone padding)
- 512x512-maskable (with safe zone padding)

For production, use a tool like:
- https://realfavicongenerator.net/
- or imagemagick: `convert icon.svg -resize 192x192 icon-192x192.png`

The current placeholder icons are simple SVG-based PNGs for development.
