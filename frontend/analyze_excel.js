import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '..', 'referencias', 'Logistica', 'Inventario_Notebooks.xlsx');

try {
    const buf = readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]]; // First sheet
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length > 0) {
        console.log("HEADERS:", Object.keys(data[0]));

        // Try to find a status column
        const possibleStatusCols = Object.keys(data[0]).filter(k =>
            k.toLowerCase().includes('status') ||
            k.toLowerCase().includes('estado') ||
            k.toLowerCase().includes('area') ||
            k.toLowerCase().includes('ubicacion')
        );

        possibleStatusCols.forEach(col => {
            const uniqueValues = [...new Set(data.map(row => row[col]))];
            console.log(`UNIQUE VALUES FOR '${col}':`, uniqueValues);
        });
    } else {
        console.log("No data found in sheet.");
    }
} catch (e) {
    console.error("Error:", e);
}
