const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const spritesheetPath = path.join(__dirname, '..', 'frontend', 'public', 'pikachu_sprites', 'PikachuIcon1024.png');
const outputDir = path.join(__dirname, '..', 'frontend', 'public', 'pikachu_sprites_hd_from_sheet');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function extractSprites() {
    // Get metadata
    const metadata = await sharp(spritesheetPath).metadata();
    console.log(`Sprite sheet: ${metadata.width}x${metadata.height}`);
    
    // Assume 6x6 grid = 36 sprites (like the original 0-35)
    const cols = 6;
    const rows = 6;
    const spriteWidth = Math.floor(metadata.width / cols);
    const spriteHeight = Math.floor(metadata.height / rows);
    
    console.log(`Grid: ${cols}x${rows}, sprite size: ${spriteWidth}x${spriteHeight}`);
    
    let count = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const num = row * cols + col;
            if (num > 35) break;
            
            const left = col * spriteWidth;
            const top = row * spriteHeight;
            
            await sharp(spritesheetPath)
                .extract({ left, top, width: spriteWidth, height: spriteHeight })
                .resize(128, 128, { kernel: 'lanczos3', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .sharpen({ sigma: 1.5 })
                .png({ quality: 100 })
                .toFile(path.join(outputDir, `${num}.png`));
            
            count++;
        }
    }
    
    console.log(`✅ Extracted ${count} sprites to ${outputDir}`);
}

extractSprites().catch(console.error);