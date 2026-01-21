// Valid Options Constants (Should match those in IngresoTicket/AdditionalInfoModal)
const VALID_RAM_OPTIONS = ["4GB", "8GB", "16GB", "32GB", "64GB", "128GB"];
const VALID_DISK_OPTIONS = [
    "128GB SSD", "240GB SSD", "256GB SSD", "480GB SSD",
    "500GB SSD", "512GB SSD", "1TB SSD", "500GB HDD", "1TB HDD"
];
const VALID_SCREEN_SIZES = ["11.6\"", "12.5\"", "13.3\"", "14.0\"", "15.6\"", "16.0\"", "17.3\""];
const VALID_BATTERY_HEALTH = ["0-20% (Mala)", "21-40% (Regular)", "41-60% (Aceptable)", "61-80% (Buena)", "81-100% (Excelente)"];

// --- Helpers ---
const matchesKeyword = (line, keywords) => {
    const lower = line.toLowerCase();
    return keywords.some(k => lower.startsWith(k.toLowerCase()));
};

const extractValue = (line) => {
    if (line.includes(':')) {
        return line.split(':')[1].trim();
    }
    return '';
};

const parseScreen = (line, data) => {
    let raw = extractValue(line);
    if (!raw && line.includes('x')) raw = line.trim(); // Handle "1920 x 1080" direct line

    // Heuristic for resolution to inches? Or just trust "14.0"" logic?
    // v45 log shows "1920 x 1080" in Pantalla field. 
    // We can't map resolution to inches 1:1, but we can store it or guess.
    // Existing logic expects strings like "14.0\"".
    // If we only have resolution, maybe we shouldn't set screenSize (inches) or set a default?
    // Let's match if the string contains one of the VALID_SCREEN_SIZES.
    const matched = VALID_SCREEN_SIZES.find(s => line.includes(s) || raw.includes(s));
    if (matched) data.screenSize = matched;
};

const parseResolution = (line, data) => {
    const val = extractValue(line);
    const resMatch = val.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (resMatch) {
        const w = parseInt(resMatch[1]);
        const h = parseInt(resMatch[2]);
        const resStr = `${w}x${h}`;
        // HOMOLOGATION
        if (resStr === '1366x768') data.resolution = "HD (1366x768)";
        else if (resStr === '1600x900') data.resolution = "HD+ (1600x900)";
        else if (resStr === '1920x1080') data.resolution = "FHD (1920x1080)";
        else if (resStr === '2560x1440') data.resolution = "2K (2560x1440)";
        else if (resStr === '3840x2160') data.resolution = "4K (3840x2160)";
        else data.resolution = resStr;
    } else {
        parseScreen(line, data);
    }
};

const parseBattery = (line, data) => {
    if (line.includes('Salud') || line.includes('Health')) {
        const percMatch = line.match(/(\d+)%/);
        if (percMatch) {
            const p = parseInt(percMatch[1]);
            if (p <= 20) data.batteryHealth = VALID_BATTERY_HEALTH[0];
            else if (p <= 40) data.batteryHealth = VALID_BATTERY_HEALTH[1];
            else if (p <= 60) data.batteryHealth = VALID_BATTERY_HEALTH[2];
            else if (p <= 80) data.batteryHealth = VALID_BATTERY_HEALTH[3];
            else data.batteryHealth = VALID_BATTERY_HEALTH[4];
        }
    }
};

export const parseSpecsFile = (text) => {
    const data = {
        brand: '',
        model: '',
        cpu: '',
        cpuBrand: '',  // New: Robust Parsed
        cpuGen: '',    // New: Robust Parsed 
        ram: '',       // Will be strict matched
        ramDetails: '',
        ramList: [],   // Multi-slot support
        gpu: '',       // New: GPU Name (Raw)
        gpuBrand: '',  // New: Parsed for Form
        gpuModel: '',  // New: Parsed for Form
        vram: '',      // New: VRAM Amount
        resolution: '', // New: 1920x1080 etc
        disk: '',      // Will be strict matched
        diskList: [],  // Multi-disk support
        serial: '',
        screenSize: '',
        batteryHealth: '',
        qa: {
            camera: 'NO',
            audio: 'NO',
            keyboard: 'NO',
            wifi: 'NO'
        }
    };

    try {
        const lines = text.split('\n');
        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('[0]')) continue; // Ignore version line



            // Section Detection (Robust & Flexible V45)
            // Handle both legacy (INFORMACION) and new (IDENTIFICACION) headers
            if (trimmed.includes('[1] INFORMACION') || trimmed.includes('[1] SYSTEM') || trimmed.includes('[1] IDENTIFICACION')) currentSection = 'SYSTEM';
            else if (trimmed.includes('[2] PROCESADOR') || trimmed.includes('[2] PROCESSOR')) currentSection = 'CPU';
            else if (trimmed.includes('[2] POTENCIA')) currentSection = 'HARDWARE'; // Consolidated section support
            else if (trimmed.includes('[3] MEMORIA') || trimmed.includes('[3] MEMORY')) currentSection = 'RAM';
            else if (trimmed.includes('[4] DISCOS') || trimmed.includes('[4] DISK')) currentSection = 'DISK';
            else if (trimmed.includes('[3] CONECTIVIDAD')) currentSection = 'CONN'; // V45 Conn
            else if (trimmed.includes('[4] BATERIA')) currentSection = 'BATT'; // V45 Batt
            else if (trimmed.includes('[5] QA CHECKLIST')) currentSection = 'QA';

            // --- SYSTEM SECTION ---
            if (currentSection === 'SYSTEM') {
                // Brand (Handle "Marca : HP" or "Marca: HP")
                if (matchesKeyword(trimmed, ['Marca', 'System Manufacturer', 'Vendor', 'Fabricante'])) {
                    data.brand = extractValue(trimmed);
                }
                // Model
                if (matchesKeyword(trimmed, ['Modelo', 'System Model', 'Product', 'Producto'])) {
                    // Limit to 20 chars as requested for ERP compatibility
                    // Smart Truncate: Cut at 20, then back up to last space to avoid cutting words
                    let m = extractValue(trimmed);
                    if (m.length > 20) {
                        let sub = m.substring(0, 20);
                        const lastSpace = sub.lastIndexOf(' ');
                        if (lastSpace > 0) {
                            sub = sub.substring(0, lastSpace);
                        }
                        data.model = sub.trim();
                    } else {
                        data.model = m;
                    }
                }
                // Serial
                if (matchesKeyword(trimmed, ['Serial', 'Serial Number', 'Numero de Serie', 'Service Tag'])) {
                    const s = extractValue(trimmed);
                    if (s && s !== 'Error' && s !== 'To be filled by O.E.M.') data.serial = s;
                }
                // Screen Size (Now in CONECTIVIDAD or SYSTEM)
                if (matchesKeyword(trimmed, ['Pantalla', 'Screen'])) {
                    parseResolution(trimmed, data);
                }
                // Battery Health (Legacy)
                parseBattery(trimmed, data);
            }

            // --- HARDWARE (POTENCIA) & CPU SECTION ---
            // Allow CPU parsing in both 'CPU' and 'HARDWARE' sections from POTENCIA
            if (currentSection === 'CPU' || currentSection === 'HARDWARE') {
                if (matchesKeyword(trimmed, ['Procesador', 'Processor', 'Name', 'CPU'])) {
                    // Clean up "Intel(R) Core(TM)" -> "Intel Core"
                    let cpuRaw = extractValue(trimmed);
                    cpuRaw = cpuRaw.replace(/\(R\)/g, '').replace(/\(TM\)/g, '').replace(/@.*/, '').trim();
                    data.cpu = cpuRaw;

                    // --- ROBUST CPU PARSING ---
                    const upper = cpuRaw.toUpperCase();

                    // 1. INTEL DETECTION
                    if (upper.includes('INTEL')) {
                        if (upper.includes('I9')) data.cpuBrand = 'Intel Core i9';
                        else if (upper.includes('I7')) data.cpuBrand = 'Intel Core i7';
                        else if (upper.includes('I5')) data.cpuBrand = 'Intel Core i5';
                        else if (upper.includes('I3')) data.cpuBrand = 'Intel Core i3';
                        else if (upper.includes('ULTRA 5')) data.cpuBrand = 'Intel Core Ultra 5';
                        else if (upper.includes('ULTRA 7')) data.cpuBrand = 'Intel Core Ultra 7';
                        else if (upper.includes('ULTRA 9')) data.cpuBrand = 'Intel Core Ultra 9';
                        else if (upper.includes('XEON')) data.cpuBrand = 'Intel Xeon';
                        else if (upper.includes('PENTIUM')) data.cpuBrand = 'Intel Pentium';
                        else if (upper.includes('CELERON')) data.cpuBrand = 'Intel Celeron';
                        else data.cpuBrand = 'Intel Core Generic';

                        // Intel Gen Logic: Look for number after hyphen inside model identifier
                        // Ex: i7-1065G7 -> 10, i5-8250U -> 8, i7-4770 -> 4
                        const genMatch = cpuRaw.match(/-(\d{1,2})\d{2}/);
                        // regex explanation: - then 1 or 2 digit number (the gen) followed by 2 more digits
                        if (genMatch) {
                            // HOMOLOGATION: Use 'ª Gen' instead of 'th Gen'
                            data.cpuGen = `${genMatch[1]}ª Gen`;
                        }
                    }
                    // 2. AMD DETECTION
                    else if (upper.includes('AMD')) {
                        if (upper.includes('RYZEN 9')) data.cpuBrand = 'AMD Ryzen 9';
                        else if (upper.includes('RYZEN 7')) data.cpuBrand = 'AMD Ryzen 7';
                        else if (upper.includes('RYZEN 5')) data.cpuBrand = 'AMD Ryzen 5';
                        else if (upper.includes('RYZEN 3')) data.cpuBrand = 'AMD Ryzen 3';
                        else if (upper.includes('ATHLON')) data.cpuBrand = 'AMD Athlon';
                        else data.cpuBrand = 'AMD Generic';

                        // AMD Gen Logic: Ryzen 5 5600U -> 5000 Series
                        // Look for 4 digits starting with 1-9 after Ryzen X
                        const seriesMatch = cpuRaw.match(/Ryzen \d\s+(\d)\d{3}/) || cpuRaw.match(/(\d)\d{3}[A-Z]/); // Fallback for just model number
                        if (seriesMatch) {
                            data.cpuGen = `${seriesMatch[1]}000 Series`;
                        } else {
                            // Check for older AMD
                            const legacyMatch = cpuRaw.match(/A(\d+)-/); // A10, A8
                            if (legacyMatch) data.cpuGen = `A${legacyMatch[1]} Series`;
                        }
                    } else {
                        data.cpuBrand = 'Other';
                        data.cpuGen = 'Unknown';
                    }
                }

                // GPU & VRAM Matching
                if (matchesKeyword(trimmed, ['GPU', 'Grafica', 'Video'])) {
                    let fullGpu = extractValue(trimmed);

                    // Extract VRAM if present: "Intel Iris ... (VRAM: 1 GB)"
                    // Log example: "Intel(R) Iris(R) Plus Graphics (VRAM: 1 GB (Integrada))"
                    const vramMatch = fullGpu.match(/\(VRAM:\s*([^)]+)\)/i);
                    if (vramMatch) {
                        let rawVram = vramMatch[1].trim();

                        // FIX: Detect Integrated graphics explicitly OR standard Intel Integrated
                        const isIntel = fullGpu.toUpperCase().includes('INTEL');
                        const isIntegrated = rawVram.toUpperCase().includes('INTEGRADA') || fullGpu.toUpperCase().includes('INTEGRADA');

                        if (isIntegrated || (isIntel && !fullGpu.toUpperCase().includes('ARC'))) {
                            data.vram = 'Shared';
                            // Normalize Intel GPU Names
                            if (isIntel) {
                                if (fullGpu.includes('Iris')) data.gpuModel = "Gráficos Integrados Intel Iris";
                                else if (fullGpu.includes('UHD')) data.gpuModel = "Gráficos Integrados Intel UHD";
                                else if (fullGpu.includes('HD')) data.gpuModel = "Gráficos Integrados Intel HD";
                                else data.gpuModel = "Gráficos Integrados Intel UHD";
                                data.gpuBrand = "Intel";
                            }
                        } else {
                            // Extract clear number
                            let gbVal = rawVram.match(/(\d+)\s*GB/i);
                            if (gbVal) data.vram = `${gbVal[1]}GB`;
                            else data.vram = rawVram;
                        }
                    } else {
                        data.vram = 'Shared';
                    }
                    if (!data.gpuModel) data.gpuModel = fullGpu.split('(')[0].trim();
                    if (!data.gpuBrand) data.gpuBrand = fullGpu.includes('NVIDIA') ? 'NVIDIA GeForce' : (fullGpu.includes('AMD') ? 'AMD Radeon' : 'Intel');
                    data.gpu = fullGpu;
                }
            }

            // --- RAM SECTION (and HARDWARE) ---
            if (currentSection === 'RAM' || currentSection === 'HARDWARE') {
                // 1. Total RAM line detection
                if (trimmed.includes('Total') || trimmed.includes('Size') || trimmed.includes('Capacity') || trimmed.startsWith('RAM Total')) {
                    const gbMatch = trimmed.match(/(\d+)\s*GB/i);
                    if (gbMatch) {
                        const val = gbMatch[1] + "GB";
                        if (VALID_RAM_OPTIONS.includes(val)) {
                            // Only set if not already set (prevent overwrite by sub-slots misinterpretation?)
                            // Actually, strictly trust "Total" line.
                            data.ram = val;
                        }
                    }

                    // 2. Parse Details / Slots from the same line if possible (e.g., "(8 GB ... + 8 GB ...)")
                    if (trimmed.includes('(') && trimmed.includes(')')) {
                        const detailsPart = trimmed.substring(trimmed.indexOf('(') + 1, trimmed.lastIndexOf(')'));
                        data.ramDetails = detailsPart; // Store raw string for UI if needed

                        // Split by '+' to find slots
                        const slots = detailsPart.split('+').map(s => s.trim());
                        data.ramList = slots.map(slotStr => {
                            const gMatch = slotStr.match(/(\d+)\s*GB/i);
                            if (gMatch) return gMatch[1] + "GB";
                            return slotStr; // Fallback
                        });
                    }
                }
                // Catch details in parens or DDR if not found in Total line
                if (!data.ramList.length && (trimmed.includes('DDR') || trimmed.includes('MHz'))) {
                    data.ramDetails = trimmed;
                }
            }

            // --- DISK SECTION (and HARDWARE) ---
            if (currentSection === 'DISK' || currentSection === 'HARDWARE') {
                // Detection logic: Look for GB size + SSD/HDD/NVMe
                // Support multiple disks lines
                // IGNORE USB DISKS as requested
                if (trimmed.toUpperCase().includes('USB')) {
                    continue; // Skip correctly
                } else if ((trimmed.startsWith('-') || trimmed.startsWith('*'))) {
                    const sizeMatch = trimmed.match(/\((\d+)\s*GB\)/);
                    if (sizeMatch) {
                        const sizeGB = parseInt(sizeMatch[1]);
                        const isSSD = trimmed.toUpperCase().includes('SSD') || trimmed.toUpperCase().includes('NVME');
                        const type = isSSD ? 'SSD' : 'HDD';

                        // Heuristic match
                        const closest = VALID_DISK_OPTIONS.find(opt => {
                            const optSize = parseInt(opt);
                            const optType = opt.includes('SSD') ? 'SSD' : (opt.includes('HDD') ? 'HDD' : '');
                            return optType === type && Math.abs(optSize - sizeGB) < 50;
                        });
                        if (closest) {
                            if (!data.disk) data.disk = closest; // Primary disk
                            data.diskList.push(closest); // Add to list
                        } else {
                            // Fallback Add raw if no match?
                            data.diskList.push(`${sizeGB}GB ${type}`);
                        }
                    }
                }
            }

            // --- NEW SECTIONS V45 ---
            if (currentSection === 'CONN') {
                if (matchesKeyword(trimmed, ['Pantalla', 'Screen'])) {
                    parseResolution(trimmed, data);
                }
            }
            if (currentSection === 'BATT') {
                // Battery Parsing - Strict Health Detection to avoid "Charge" (Carga)
                if (matchesKeyword(trimmed, ['Salud', 'Health', 'Vida'])) {
                    const battMatch = trimmed.match(/(\d+)%/);
                    if (battMatch) {
                        const p = parseInt(battMatch[1]);
                        if (p <= 20) data.batteryHealth = "0-20% (Mala)";
                        else if (p <= 40) data.batteryHealth = "21-40% (Regular)";
                        else if (p <= 60) data.batteryHealth = "41-60% (Aceptable)";
                        else if (p <= 80) data.batteryHealth = "61-80% (Buena)";
                        else data.batteryHealth = "81-100% (Excelente)";
                    }
                }
                parseBattery(trimmed, data);
            }

            if (currentSection === 'QA') {
                if (trimmed.includes('Camara') && trimmed.includes('OK')) data.qa.camera = 'OK';
                if (trimmed.includes('Microfono') && trimmed.includes('OK')) data.qa.audio = 'OK';
                if (trimmed.includes('Teclado') && trimmed.includes('OK')) data.qa.keyboard = 'OK';
                // Keyboard sometimes "SI" or "OK" - BUT ignore "Luz" feature check
                if (trimmed.includes('Teclado') && trimmed.includes('SI') && !trimmed.includes('Luz')) data.qa.keyboard = 'OK';
            }
        }
    } catch (e) {
        console.error("Error parsing specs file:", e);
    }

    return data;
};
