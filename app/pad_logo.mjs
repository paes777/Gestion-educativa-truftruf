import Jimp from 'jimp';

async function main() {
    try {
        console.log('Reading logo...');
        const logo = await Jimp.read('public/logo.png');
        
        console.log('Original size:', logo.bitmap.width, 'x', logo.bitmap.height);
        
        // Autocrop removes all pure white/transparent outer space until it hits the gray border
        logo.autocrop();
        
        // Now crop 10 pixels inward from all sides to eliminate the gray border itself
        logo.crop(10, 10, logo.bitmap.width - 20, logo.bitmap.height - 20);
        
        // Increase size by 20% (from 320 to 384)
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
