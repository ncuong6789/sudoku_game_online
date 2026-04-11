const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const spritesDir = path.join(__dirname, '..', 'frontend', 'public', 'pikachu_sprites');
const outputDir = path.join(__dirname, '..', 'frontend', 'public', 'pikachu_sprites_hd');

// Create output directory
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Get all PNG files (0-35)
const files = [];
for (let i = 0; i <= 35; i++) {
    const filePath = path.join(spritesDir, `${i}.png`);
    if (fs.existsSync(filePath)) {
        files.push({ num: i, path: filePath });
    }
}

console.log(`Found ${files.length} sprite files to process`);

// Sharpening kernel for crisp edges
const sharpenMatrix = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
];

async function processSprites() {
    for (const file of files) {
        try {
            const inputPath = file.path;
            const outputPath = path.join(outputDir, `${file.num}.png`);
            
            // Read, upscale with sharp, apply sharpen
            await sharp(inputPath)
                .resize(128, 128, {
                    kernel: 'lanczos3',  // Better quality than default
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .sharpen({
                    sigma: 1.5,
                    m1: 0.5,
                    m2: 0.5
                })
                .png({
                    compressionLevel: 9,
                    quality: 100
                })
                .toFile(outputPath);
            
            const stats = fs.statSync(outputPath);
            console.log(`✓ Processed ${file.num}.png -> ${file.num}.png (${stats.size} bytes)`);
        } catch (err) {
            console.error(`✗ Error processing ${file.num}.png:`, err.message);
        }
    }
    
    // Copy hint.png if exists
    const hintSrc = path.join(spritesDir, 'hint.png');
    const hintDst = path.join(outputDir, 'hint.png');
    if (fs.existsSync(hintSrc)) {
        await sharp(hintSrc)
            .resize(64, 64, { kernel: 'lanczos3' })
            .sharpen({ sigma: 1.5 })
            .png({ quality: 100 })
            .toFile(hintDst);
        console.log('✓ Copied and enhanced hint.png');
    }
    
    console.log('\n✅ All sprites processed!');
    console.log(`Output directory: ${outputDir}`);
}

processSprites().catch(console.error);