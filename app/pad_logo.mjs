import Jimp from 'jimp';

async function main() {
    try {
        console.log('Reading logo...');
        const logo = await Jimp.read('public/logo.png');
        
        // Use the entire original logo without cropping to prevent cutting it off
        logo.scaleToFit(384, 384);
        
        // Create 512x512 fully transparent background (0x00000000)
        const bg = new Jimp(512, 512, 0x00000000);
        
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
