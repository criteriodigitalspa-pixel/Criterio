import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputFile = join('C:', 'Users', 'diego', '.gemini', 'antigravity', 'scratch', 'referencias', 'Logistica', 'Historico_Ventas.xlsx');
const outputFile = join('C:', 'Users', 'diego', '.gemini', 'antigravity', 'scratch', 'frontend', 'src', 'data', 'historicalSalesDB.json');

try {
    console.log("Reading:", inputFile);
    const buf = readFileSync(inputFile);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    console.log(`Processing ${rawData.length} records...`);

    const cleanData = rawData.map(row => {
        // Normalize fields
        const marca = (row['MARCA'] || '').toString().trim().toUpperCase();
        const modelo = (row['MODELO'] || '').toString().trim().toUpperCase();
        const cpu = (row['PROCESADOR'] || '').toString().trim().toUpperCase();
        const gen = (row['GEN'] || '').toString().trim().toUpperCase();
        const ram = (row['RAM'] || '').toString().trim().toUpperCase();
        const discoTipo = (row['TIPO DISCO'] || '').toString().trim().toUpperCase();
        const discoCap = (row['CAPACIDAD'] || '').toString().trim().toUpperCase();

        const precioVenta = row['Precio Venta'] || 0;

        if (!marca || !cpu || precioVenta === 0) return null; // Skip invalid

        return {
            brand: marca,
            model: modelo,
            cpu,
            gen,
            ramRaw: ram,
            diskRaw: `${discoTipo} ${discoCap}`,
            price: precioVenta
        };
    }).filter(x => x !== null);

    // Group by Config to get Averages
    const grouped = {};
    cleanData.forEach(item => {
        // Key signature: "DELL LATITUDE I5 8VA 16GB"
        const key = `${item.brand} ${item.model} ${item.cpu} ${item.gen} ${item.ramRaw} ${item.diskRaw}`.trim();

        if (!grouped[key]) {
            grouped[key] = { count: 0, totalPrice: 0, items: [] };
        }
        grouped[key].count++;
        grouped[key].totalPrice += item.price;
        grouped[key].items.push(item);
    });

    const finalDB = Object.keys(grouped).map(key => {
        const g = grouped[key];
        const avgPrice = Math.round(g.totalPrice / g.count);
        // Use the first item to keep individual fields
        const sample = g.items[0];

        return {
            key,
            brand: sample.brand,
            model: sample.model,
            cpu: sample.cpu,
            gen: sample.gen,
            ram: sample.ramRaw,
            disk: sample.diskRaw,
            avgPrice,
            sampleCount: g.count
        };
    });

    console.log(`Extracted ${finalDB.length} unique configurations.`);

    writeFileSync(outputFile, JSON.stringify(finalDB, null, 2));
    console.log("Written to:", outputFile);

} catch (e) {
    console.error("Error:", e);
}
