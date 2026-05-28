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
        const w = solidWhiteBg.bitmap.width;
        const h = solidWhiteBg.bitmap.height;
        const x = (512 - w) / 2;
        const y = (512 - h) / 2;
        finalBg.composite(solidWhiteBg, x, y);
        
        // PINTAR EL RECUADRO DE BLANCO (Tapar los bordes del área escalada con blanco puro)
        // Usamos un bloque blanco para tapar 10 píxeles hacia adentro desde cada borde
        const whiteBlock = new Jimp(512, 512, '#FFFFFF');
        
        // Borde superior
        finalBg.composite(whiteBlock.clone().crop(0,0, w, 10), x, y);
        // Borde inferior
        finalBg.composite(whiteBlock.clone().crop(0,0, w, 10), x, y + h - 10);
        // Borde izquierdo
        finalBg.composite(whiteBlock.clone().crop(0,0, 10, h), x, y);
        // Borde derecho
        finalBg.composite(whiteBlock.clone().crop(0,0, 10, h), x + w - 10, y);
        
        await finalBg.writeAsync('public/logo-padded.png');
        console.log('logo-padded.png creado con bordes pintados de blanco!');
    } catch (err) {
        console.error('Error:', err);
    }
}
main();
