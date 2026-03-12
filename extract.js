const fs = require('fs');
const PDFParser = require("pdf2json");

const files = [
    "Estudiantes de 1° Básico.pdf",
    "Estudiantes de 2° Básico.pdf",
    "Estudiantes de 3° Básico.pdf",
    "Estudiantes de 4° Básico.pdf",
    "Estudiantes de 5° Básico.pdf",
    "Estudiantes de 6° Básico.pdf",
    "Estudiantes de 7° Básico.pdf",
    "Estudiantes de 8° Básico.pdf"
];

let allStudents = [];

async function parsePdf(fileName) {
    return new Promise((resolve, reject) => {
        let pdfParser = new PDFParser(this, 1);
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", pdfData => {
            const text = pdfParser.getRawTextContent();
            
            // Extraer el curso del nombre de archivo, ej: "1° Básico"
            const matchCourse = fileName.match(/Estudiantes de (\d+° Básico)/i);
            const course = matchCourse ? matchCourse[1] : fileName;
            
            const lines = text.split('\n');
            const rutPattern = /(\d{7,8}-[\dkK])/;
            
            lines.forEach(line => {
                line = line.trim();
                const rutMatch = line.match(rutPattern);
                if (rutMatch) {
                    const rut = rutMatch[1];
                    // The rest after RUT is the name
                    const rawTextAfterRut = line.substring(rutMatch.index + rut.length).trim();
                    // Some names might have other info, but mostly just ALL CAPS names
                    const cleanName = rawTextAfterRut.replace(/\s+/g, ' ');
                    
                    if (cleanName && rut) {
                        allStudents.push({
                            curso: course,
                            rut: rut,
                            nombreCompleto: cleanName,
                        });
                    }
                }
            });
            resolve();
        });
        pdfParser.loadPDF("./" + fileName);
    });
}

async function main() {
    for (const f of files) {
        if (fs.existsSync("./" + f)) {
            await parsePdf(f);
        }
    }
    fs.writeFileSync('app/src/services/students_seed.json', JSON.stringify(allStudents, null, 2));
    console.log(`Extracted ${allStudents.length} students to app/src/services/students_seed.json`);
}

main().catch(console.error);
