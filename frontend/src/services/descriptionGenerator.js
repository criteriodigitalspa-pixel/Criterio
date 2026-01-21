import { CPU_SCORES, GPU_SCORES, RAM_SCORES, APP_CATALOG } from '../data/scoring-constants';

export const descriptionGenerator = {

    /**
     * Calculates the Performance Score (1-100) for CPU, RAM, and GPU.
     */
    calculateSystemScore: (ticket, ramInfo, diskInfo) => {
        // 1. CPU Score
        let cpuScore = 30; // Base baseline
        const brand = ticket.cpuBrand || ticket.additionalInfo?.cpuBrand;
        const gen = ticket.cpuGen || ticket.additionalInfo?.cpuGen;

        if (brand && CPU_SCORES[brand]) {
            const brandData = CPU_SCORES[brand];
            if (typeof brandData === 'number') {
                cpuScore = brandData;
            } else if (gen && brandData[gen]) {
                cpuScore = brandData[gen];
            } else {
                // Fallback avg for brand if gen missing
                const scores = Object.values(brandData).filter(v => typeof v === 'number');
                if (scores.length > 0) cpuScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            }
        }

        // 2. RAM Score
        // Get total GB
        let totalRam = 0;
        const ramDetails = ramInfo?.detalles || ticket.ram?.detalles || ticket.additionalInfo?.ram?.detalles || [];
        ramDetails.forEach(r => {
            if (!r) return;
            // Relaxed regex to catch "16GB", "16 GB", "16", etc.
            const match = r.match(/(\d+)/);
            if (match) totalRam += parseInt(match[1]);
        });

        // If 0, try 'ram' string field legacy
        if (totalRam === 0 && ticket.ram && typeof ticket.ram === 'string') {
            const match = ticket.ram.match(/(\d+)GB/i);
            if (match) totalRam += parseInt(match[1]);
        }

        let ramScore = RAM_SCORES[totalRam] || (totalRam > 32 ? 95 : totalRam * 2.5);
        if (ramScore > 100) ramScore = 100;

        // Dual Channel Bonus (user request PR logic)
        // If dualChannel checkbox is true OR if slots >= 2 and logic implies parallel (usually enabled by default on 2 sticks)
        // We use the explicit checkbox state if available
        const isDualChannel = ramInfo?.dualChannel || ticket.additionalInfo?.ram?.dualChannel || false;
        if (isDualChannel && totalRam >= 8) {
            ramScore += 10; // Bonus
        }
        if (ramScore > 100) ramScore = 100;


        // 3. GPU Score
        let gpuScore = 15; // Integrated base
        const gpuBrand = ticket.gpuBrand || ticket.additionalInfo?.gpuBrand;
        const gpuModel = ticket.gpuModel || ticket.additionalInfo?.gpuModel;

        if (gpuModel) {
            // Try exact match
            if (GPU_SCORES[gpuModel]) {
                gpuScore = GPU_SCORES[gpuModel];
            } else {
                // Fuzzy match
                const keys = Object.keys(GPU_SCORES);
                const match = keys.find(k => gpuModel.includes(k));
                if (match) gpuScore = GPU_SCORES[match];
            }
        }
        // Fallback checks
        if (gpuBrand === 'Apple' || (brand === 'Apple Silicon')) gpuScore = 60; // M-series graphics are strong

        return { cpuScore, ramScore, gpuScore };
    },

    /**
     * Returns a list of compatible apps based on scores.
     */
    getCompatibleApps: (systemScores, hasDedicatedGpu) => {
        const validatedCategories = [];
        const { cpuScore, ramScore, gpuScore } = systemScores;

        APP_CATALOG.forEach(cat => {
            let compatibleApps = cat.apps.filter(app => {
                let factor = 10;

                // Rule: If Dedicated GPU, massively relax CPU/RAM reqs for Engineering/Architecture
                // This ensures CAD apps appear even on older but capable workstation CPUs
                if (hasDedicatedGpu && (cat.category.includes("Ingeniería") || cat.category.includes("Arquitectura"))) {
                    factor = 50; // Virtually forces inclusion if GPU is present
                }

                const cpuPass = cpuScore >= (app.rr - factor);
                const ramPass = ramScore >= (app.rr - factor);

                let gpuPass = true;
                if (cat.category.includes("Gaming") || cat.category.includes("Video") || cat.category.includes("Diseño") || cat.category.includes("Arquitectura")) {
                    // Stricter GPU requirement for AAA Gaming
                    if (cat.category.includes("AAA")) {
                        gpuPass = gpuScore >= (app.rr - 10); // Strict
                    } else {
                        gpuPass = gpuScore >= (app.rr - 20); // Lenient for eSports/CAD
                    }
                }
                return cpuPass && ramPass && gpuPass;
            });

            // LOGIC RULES:
            // 1. Gaming AAA: If empty or very few compatible, skip entirely?
            if (cat.category.includes("Alta Demanda (AAA)") && compatibleApps.length === 0) {
                return; // Skip category
            }

            // 2. Gaming eSports & Classics: Min 5. If Dedicated GPU -> 7
            // 3. Cad/Engineering: If Dedicated GPU -> 7 (Limit)
            let limit = 4; // Default
            if (cat.category.includes("Gaming")) {
                limit = hasDedicatedGpu ? 7 : 5;
            } else if (cat.category.includes("Arquitectura") || cat.category.includes("Ingeniería")) {
                // Force Include CAD if we have a GPU, even if "compatibleApps" check slightly failed? 
                // Actually better to just increase limit if they passed.
                limit = hasDedicatedGpu ? 7 : 5;
            }

            compatibleApps.sort((a, b) => b.rr - a.rr);
            const topApps = compatibleApps.slice(0, limit);

            if (topApps.length > 0) {
                validatedCategories.push({
                    category: cat.category,
                    apps: topApps
                });
            }
        });

        // DYNAMIC REORDERING (User Rule: Gaming & CAD FIRST if GPU present)
        if (hasDedicatedGpu) {
            validatedCategories.sort((a, b) => {
                const getScore = (catName) => {
                    if (catName.includes("Gaming")) return 3; // Top Priority
                    if (catName.includes("Ingeniería") || catName.includes("Arquitectura")) return 2; // High Priority
                    if (catName.includes("Diseño")) return 1; // Medium
                    return 0; // Default (Office, etc)
                };
                return getScore(b.category) - getScore(a.category);
            });
        }

        return validatedCategories;
    },

    /**
     * Generates the HTML Description.
     */
    generateDescriptionHtml: (ticket, systemScores, compatibleApps) => {
        const brand = ticket.marca || 'Equipo';
        const model = ticket.modelo || 'Profesional';

        // --- 1. INTRO (Marketing Hook + RAPIDISIMA Rule) ---
        // Rule 2: "RAPIDISMA Y EXQUISITA" emphasis - HUMANIZED
        let introText = `<strong>${brand.toUpperCase()} ${model.toUpperCase()}</strong>: `;
        introText += `Lo que más destaca de este equipo es la velocidad. La sensación al usarlo es <strong>rapidísima y exquisita</strong>; todo abre al instante. `;
        introText += `Está configurado para que puedas trabajar con muchos programas abiertos a la vez sin que se sienta lento. `;
        introText += `Es ideal si buscas un equipo que simplemente responda rápido y no te haga esperar. `;

        if (systemScores.ramScore > 80) introText += `Una maquina para trabajar en serio. `;

        let intro = `<div class="product-intro text-sm text-gray-200 mb-4 leading-relaxed border-l-4 border-blue-500 pl-3">
            ${introText}
        </div>`;

        // --- 2. APPS SECTIONS ---
        let appsHtml = `<div class="apps-section space-y-4">`;
        compatibleApps.forEach(cat => {
            appsHtml += `<div>`;
            appsHtml += `<h4 class="app-category text-blue-400 font-bold mb-2 uppercase tracking-wide border-b border-gray-700 pb-1">${cat.category}</h4>`;
            appsHtml += `<ul class="app-list grid grid-cols-1 md:grid-cols-2 gap-2">`;
            cat.apps.forEach(app => {
                appsHtml += `<li class="flex flex-col bg-gray-800/30 p-1.5 rounded border border-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <span class="font-bold text-white text-xs">${app.name}</span> 
                    <span class="text-[10px] text-gray-400 leading-tight">${app.description}</span>
                </li>`;
            });
            appsHtml += `</ul>`;
            appsHtml += `</div>`;
        });
        appsHtml += `</div>`;

        // --- 3. TECHNICAL SPECS ---
        let specsHtml = `<div class="mt-6 pt-4 border-t border-gray-700">`;
        specsHtml += `<h4 class="text-xs font-bold text-gray-500 uppercase mb-2">Especificaciones Clave</h4>`;
        specsHtml += `<ul class="specs-compact text-sm text-gray-300 space-y-1 font-mono">`;
        if (ticket.additionalInfo?.screenSize) specsHtml += `<li>🖥️ PANTALLA: <span class="text-white">${ticket.additionalInfo.screenSize} ${ticket.additionalInfo.screenRes || ''}</span></li>`;
        specsHtml += `<li>⚡ PROCESADOR: <span class="text-white">${ticket.cpuBrand || ticket.additionalInfo?.cpuBrand} ${ticket.cpuGen || ticket.additionalInfo?.cpuGen}</span></li>`;

        // RAM Display
        const ramDet = ticket.additionalInfo?.ram?.detalles || ticket.ram?.detalles || [];
        const isDual = ticket.additionalInfo?.ram?.dualChannel || false;
        const totalRam = ramDet.reduce((acc, r) => {
            const m = r ? r.match(/(\d+)/) : null;
            return acc + (m ? parseInt(m[1]) : 0);
        }, 0);
        specsHtml += `<li>🚀 MEMORIA RAM: <span class="text-white">${totalRam > 0 ? totalRam + 'GB' : 'Configurada'} ${isDual ? '(Dual Channel)' : ''}</span></li>`;

        specsHtml += `<li>💾 ALMACENAMIENTO: <span class="text-white">${(ticket.additionalInfo?.disco?.detalles || []).join(' + ')}</span></li>`;
        if (ticket.additionalInfo?.batteryHealth) specsHtml += `<li>🔋 BATERÍA: <span class="text-white">${ticket.additionalInfo.batteryHealth}</span></li>`;
        specsHtml += `</ul>`;
        specsHtml += `</div>`;

        return intro + appsHtml + specsHtml;
    }
};
