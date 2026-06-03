// Generates the app icon + splash source images for @capacitor/assets from the
// Atelier brand (clay tile, cream serif "C"). Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import fs from 'fs';

fs.mkdirSync('assets', { recursive: true });

const CLAY = '#b9572f';
const CREAM = '#fbf6ec';
const PAPER = '#f6f0e4';
const INK = '#2a211a';

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${CLAY}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif" font-size="660" font-weight="700" fill="${CREAM}">C</text>
</svg>`;

const splash = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
  <rect width="2732" height="2732" fill="${bg}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif" font-size="820" font-weight="700" fill="${fg}">C</text>
</svg>`;

await sharp(Buffer.from(icon)).png().toFile('assets/icon.png');
await sharp(Buffer.from(splash(PAPER, CLAY))).png().toFile('assets/splash.png');
await sharp(Buffer.from(splash(INK, CREAM))).png().toFile('assets/splash-dark.png');
console.log('Generated assets/icon.png, splash.png, splash-dark.png');
