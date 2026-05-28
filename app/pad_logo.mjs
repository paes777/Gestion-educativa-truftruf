import Jimp from 'jimp';

async function main() {
    try {
        console.log('Reading logo...');
        const logo = await Jimp.read('public/logo.png');
        
        console.log('Original size:', logo.bitmap.width, 'x', logo.bitmap.height);
        // Crop 20 pixels from all sides to remove the gray border
        logo.crop(20, 20, logo.bitmap.width - 40, logo.bitmap.height - 40);
        
        // Increase size by 20% (320 * 1.2 = 384)
        logo.scaleToFit(384, 384);
        console.log('Scaled size:', logo.bitmap.width, 'x', logo.bitmap.height);
        
        // Create 512x512 white background (using string to guarantee opaque white)
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
