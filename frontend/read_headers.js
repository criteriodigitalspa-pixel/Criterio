// Retrying with CommonJS just in case or renaming to mjs
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));


// Adjust path to where we moved the file
// frontend is inside scratch, and referencias is inside scratch. So we go up one level.
const filePath = join(__dirname, '..', 'referencias', 'Logistica', 'Ingreso.xlsx');

try {
    const buf = readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get range
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const headers = [];

    // Read first row (headers)
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = { c: C, r: 0 };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        const cell = sheet[cellRef];
        if (cell && cell.v) headers.push(cell.v);
    }

    console.log("EXCEL HEADERS FOUND:");
    console.log(JSON.stringify(headers, null, 2));

} catch (e) {
    console.error("Error reading excel:", e);
}
