#!/usr/bin/env tsx

import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ICON_SIZE = 180;
const LOGO_SIZE = 155;
const BACKGROUND_COLOR = "#000000";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, "../public");
const svgPath = join(publicDir, "agentcmd-icon-64.svg");
const outputPath = join(publicDir, "apple-touch-icon.png");

async function generateIcon() {
  console.log("Generating apple-touch-icon.png...");

  // Read SVG source
  const svgBuffer = readFileSync(svgPath);

  // Scale SVG to desired logo size
  const scaledLogo = await sharp(svgBuffer)
    .resize(LOGO_SIZE, LOGO_SIZE)
    .png()
    .toBuffer();

  // Create black background with centered logo
  await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: BACKGROUND_COLOR,
    },
  })
    .composite([
      {
        input: scaledLogo,
        top: Math.floor((ICON_SIZE - LOGO_SIZE) / 2),
        left: Math.floor((ICON_SIZE - LOGO_SIZE) / 2),
      },
    ])
    .png({ quality: 100 })
    .toFile(outputPath);

  console.log(`✓ Generated ${outputPath}`);
  console.log(`  Size: ${ICON_SIZE}x${ICON_SIZE}px`);
  console.log(`  Logo: ${LOGO_SIZE}x${LOGO_SIZE}px (centered)`);
  console.log(`  Background: ${BACKGROUND_COLOR}`);
}

generateIcon().catch((error) => {
  console.error("Failed to generate icon:", error);
  process.exit(1);
});
