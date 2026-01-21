import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Correct path mapping based on user input
const filePath = join('C:', 'Users', 'diego', '.gemini', 'antigravity', 'scratch', 'referencias', 'Logistica', 'Historico_Ventas.xlsx');

try {
    console.log("Reading file from:", filePath);
    const buf = readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    console.log("Sheet Name:", sheetName);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length > 0) {
        console.log("\n--- HEADERS ---");
        console.log(Object.keys(data[0]).join(", "));

        console.log("\n--- FIRST ROW SAMPLE ---");
        console.log(JSON.stringify(data[0], null, 2));

        console.log("\n--- TOTAL ROWS ---");
        console.log(data.length);

        // Analyze Stats for Key Columns if they exist (Guessing names based on user description)
        // He mentioned: Marca, Modelo, RAM, Disco, Precio Compra, Precio Venta

    } else {
        console.log("No data found.");
    }

} catch (e) {
    console.error("Error reading excel:", e);
}
