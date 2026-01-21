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
    getCompatibleApps: (systemScores) => {
        const validatedCategories = [];
        const { cpuScore, ramScore, gpuScore } = systemScores;

        APP_CATALOG.forEach(cat => {
            const compatibleApps = cat.apps.filter(app => {
                // Logic: System Score >= App Requirement (RR)
                // We assume RR applies to the 'bottleneck' component of the app.
                // For simplified logic: Average system score? Or all components must pass?
                // Realistically:
                // - Gaming needs GPU + CPU.
                // - Rendering needs CPU + RAM.
                // - Office needs basic everything.

                // Heuristic:
                // Weighted average vs threshold?
                // Let's use a "Bottleneck Check".
                // If App RR < 30 (Light), almost anything passes.
                // If App RR > 70 (Heavy), needs specific strength.

                // Let's try: App runs if CPU > RR-10 AND RAM > RR-10.
                // If app is 'Gaming' or 'Video', GPU > RR-15.

                const factor = 10; // Tolerance
                const cpuPass = cpuScore >= (app.rr - factor);
                const ramPass = ramScore >= (app.rr - factor);

                let gpuPass = true;
                if (cat.category.includes("Gaming") || cat.category.includes("Video") || cat.category.includes("Diseño") || cat.category.includes("Arquitectura")) {
                    gpuPass = gpuScore >= (app.rr - 20); // GPU tolerance higher for integrated chips running old stuff
                }

                return cpuPass && ramPass && gpuPass;
            });

            // Prioritize "Heaviest" apps (Higher RR) to show capabilities
            // Limit to top 4 as requested
            compatibleApps.sort((a, b) => b.rr - a.rr);
            const topApps = compatibleApps.slice(0, 4);

            validatedCategories.push({
                category: cat.category,
                apps: topApps
            });

        });

return validatedCategories;
    },

/**
 * Generates the HTML Description.
 */
generateDescriptionHtml: (ticket, systemScores, compatibleApps) => {
    // 1. Intro (Marketing Hook) - 20% "Epic"
    const brand = ticket.marca || 'Equipo';
    const model = ticket.modelo || 'Profesional';
    const type = systemScores.cpuScore > 70 ? "Potencia Pura" : "Eficiencia Empresarial";

    let intro = `<div class="product-intro">`;
    intro += `<strong>${brand.toUpperCase()} ${model.toUpperCase()}</strong>: Diseñado para ${type}. `;
    intro += `Optimizado para rendir al máximo en tus proyectos diarios. `;
    if (systemScores.ramScore > 80) intro += `Multitarea sin límites gracias a su memoria de alto rendimiento. `;
    intro += `</div><br/>`;

    // 2. Apps Sections (80% Logic)
    let appsHtml = `<div class="apps-section">`;
    compatibleApps.forEach(cat => {
        appsHtml += `<h4 class="app-category text-blue-400 font-bold mb-2">${cat.category}</h4>`;
        appsHtml += `<ul class="app-list grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">`;
        cat.apps.forEach(app => {
            appsHtml += `<li class="flex flex-col"><span class="font-bold text-white">${app.name}</span> <span class="text-xs text-gray-400">${app.description}</span></li>`;
        });
        appsHtml += `</ul>`;
    });
    appsHtml += `</div>`;

    // 3. Technical Specs List (Classic)
    let specsHtml = `<hr class="border-gray-700 my-4" />`;
    specsHtml += `<ul class="specs-compact text-sm text-gray-300 space-y-1">`;
    if (ticket.additionalInfo?.screenSize) specsHtml += `<li>🖥️ Pantalla: ${ticket.additionalInfo.screenSize} ${ticket.additionalInfo.screenRes || ''}</li>`;
    specsHtml += `<li>⚡ Procesador: ${ticket.cpuBrand || ticket.additionalInfo?.cpuBrand} ${ticket.cpuGen || ticket.additionalInfo?.cpuGen}</li>`;

    // RAM Display
    const ramDet = ticket.additionalInfo?.ram?.detalles || ticket.ram?.detalles || [];
    const isDual = ticket.additionalInfo?.ram?.dualChannel || false;
    const totalRam = ramDet.reduce((acc, r) => {
        const m = r ? r.match(/(\d+)/) : null;
        return acc + (m ? parseInt(m[1]) : 0);
    }, 0);
    specsHtml += `<li>🚀 RAM: ${totalRam > 0 ? totalRam + 'GB' : 'Configurada'} ${isDual ? '(Dual Channel Active)' : ''}</li>`;

    specsHtml += `<li>💾 Almacenamiento: ${(ticket.additionalInfo?.disco?.detalles || []).join(' + ')}</li>`;
    if (ticket.additionalInfo?.batteryHealth) specsHtml += `<li>🔋 Batería: ${ticket.additionalInfo.batteryHealth}</li>`;
    specsHtml += `</ul>`;

    return intro + appsHtml + specsHtml;
}
};
