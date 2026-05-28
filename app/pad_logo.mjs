import Jimp from 'jimp';

async function main() {
    try {
        console.log('Reading logo...');
        const logo = await Jimp.read('public/logo.png');
        
        // Manual crop based on precise pixel measurements of the border
        // Content bounds: minX=79, minY=12, maxX=1533, maxY=1684
        // Crop 30 pixels inside the content bounds to obliterate any edge artifact
        const cropX = 79 + 30;
        const cropY = 12 + 30;
        const cropW = (1533 - 79) - 60;
        const cropH = (1684 - 12) - 60;
        
        logo.crop(cropX, cropY, cropW, cropH);
        
        logo.scaleToFit(384, 384);
        
        // Create 512x512 fully opaque white background
        const bg = new Jimp(512, 512, '#FFFFFF');
        
        // Composite logo into the center
        const x = (512 - logo.bitmap.width) / 2;
        const y = (512 - logo.bitmap.height) / 2;
        bg.composite(logo, x, y);
        
        await bg.writeAsync('public/logo-padded.png');
        console.log('logo-padded.png created successfully!');
    } catch (err) {
        console.error('Error:', err);
    }
}
main();
