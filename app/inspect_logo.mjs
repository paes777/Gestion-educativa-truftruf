import Jimp from 'jimp';

async function main() {
    const logo = await Jimp.read('public/logo.png');
    const w = logo.bitmap.width;
    const h = logo.bitmap.height;
    console.log(`Original size: ${w}x${h}`);

    let minX = w, minY = h, maxX = 0, maxY = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const hex = logo.getPixelColor(x, y);
            const rgba = Jimp.intToRGBA(hex);
            // If pixel is not white and not transparent
            if (rgba.a > 10 && (rgba.r < 250 || rgba.g < 250 || rgba.b < 250)) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    console.log(`Content bounding box: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
}
main();
