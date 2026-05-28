import Jimp from 'jimp';

async function main() {
    try {
        console.log('Reading logo...');
        const logo = await Jimp.read('public/logo.png');
        
        // Create a solid white background of the SAME SIZE as the original logo
        const solidWhiteBg = new Jimp(logo.bitmap.width, logo.bitmap.height, '#FFFFFF');
        
        // Composite the original transparent logo onto the white background BEFORE scaling
        // This prevents black fringes caused by interpolating transparent-black pixels (rgba(0,0,0,0))
        solidWhiteBg.composite(logo, 0, 0);
        
        // Now scale the solid white version down to 384x384
        solidWhiteBg.scaleToFit(384, 384);
        
        // Create the final 512x512 maskable canvas
        const finalBg = new Jimp(512, 512, '#FFFFFF');
        
        // Composite the scaled logo into the center
        const x = (512 - solidWhiteBg.bitmap.width) / 2;
        const y = (512 - solidWhiteBg.bitmap.height) / 2;
        finalBg.composite(solidWhiteBg, x, y);
        
        await finalBg.writeAsync('public/logo-padded.png');
        console.log('logo-padded.png created with clean white interpolation!');
    } catch (err) {
        console.error('Error:', err);
    }
}
main();
