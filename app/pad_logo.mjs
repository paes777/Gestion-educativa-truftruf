import Jimp from 'jimp';

async function main() {
    try {
        console.log('Reading logo...');
        const logo = await Jimp.read('public/logo.png');
        
        console.log('Original size:', logo.bitmap.width, 'x', logo.bitmap.height);
        // Scale logo to fit within 320x320 (plenty of safe space for a 512x512 maskable icon)
        logo.scaleToFit(320, 320);
        console.log('Scaled size:', logo.bitmap.width, 'x', logo.bitmap.height);
        
        // Create 512x512 white background
        const bg = new Jimp(512, 512, 0xFFFFFFFF);
        
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
