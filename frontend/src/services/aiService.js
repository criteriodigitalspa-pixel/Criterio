/**
 * AI Service for generating content using OpenAI
 * UPDATED: Supreme Logic with Hardware Tiers & Software Mapping
 */

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

export const aiService = {
    /**
     * Generates a sales description for a product ticket
     * @param {Object} ticket - The ticket object containing specs
     * @returns {Promise<string>} - The generated HTML description
     */
    async generateProductDescription(ticket) {
        if (!API_KEY) {
            throw new Error('Falta la API Key de OpenAI. Configúrala en .env.local');
        }

        // 1. Analyze Hardware
        const tier = getHardwareTier(ticket);
        const softwareContext = getSoftwareContext(tier);
        const template = getTemplate(tier);

        // 2. Format Specs for Prompt
        const specs = {
            cpu: `${ticket.cpuBrand || ''} ${ticket.cpuGen || ''}`.trim() || 'Procesador Intel/AMD',
            ram: formatHardware(ticket.ram) || ticket.additionalInfo?.ram || 'RAM Estándar',
            disk: formatHardware(ticket.disk) || ticket.additionalInfo?.disco || 'Almacenamiento',
            gpu: `${ticket.gpuBrand || ''} ${ticket.gpuModel || ''}`.trim(),
            screen: `${ticket.screenSize || ''} ${ticket.screenRes || ''}`.trim(),
            price: ticket.precioVenta || ticket.precioCompra || 0
        };

        // 3. Construct Prompts
        const systemPrompt = `
      Eres el Copywriter Principal de "Criterio Digital", una tienda de tecnología premium reacondicionada.
      
      TU MISIÓN:
      Escribir una descripción de venta persuasiva, moderna y técnicamente precisa.
      
      ESTILO Y TONO:
      - Directo, Entusiasta y Profesional.
      - NADA de "somos líderes" o frases genéricas de relleno.
      - Enfócate en QUÉ PUEDE HACER el usuario con este equipo.
      - Usa emojis estratégicos (máximo 2-3 por sección).
      
      FORMATO HTML OBLIGATORIO (Neon Dark CSS):
      Debes devolver SOLO el código HTML dentro de estas etiquetas específicas para que coincida con el diseño del sitio.
      NO uses markdown (\`\`\`), solo HTML puro.
      
      ESTRUCTURA EXACTA REQUERIDA:
      ${template}
    `;

        const userPrompt = `
      DATOS DEL EQUIPO:
      - Marca/Modelo: ${ticket.marca} ${ticket.modelo}
      - Procesador: ${specs.cpu}
      - RAM: ${specs.ram}
      - Disco: ${specs.disk}
      - Gráficos: ${specs.gpu || 'Integrados'}
      - Pantalla: ${specs.screen}
      
      CONTEXTO DE USO (Incorpóralo en el texto):
      - Nivel: ${tier.name}
      - Software Compatible: ${softwareContext}
      
      Escribe la descripción final siguiendo la plantilla.
    `;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini", // Use 4o-mini for speed/cost/quality balance, or gpt-3.5-turbo
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error en OpenAI');
            }

            const data = await response.json();
            return data.choices[0].message.content.trim().replace(/^```html/, '').replace(/```$/, '');

        } catch (error) {
            console.error("AI Service Error:", error);
            throw error;
        }
    }
};

// --- INTELLIGENT HELPERS ---

function formatHardware(hw) {
    if (!hw) return null;
    if (typeof hw === 'string') return hw;
    if (hw.detalles && Array.isArray(hw.detalles)) {
        const parts = hw.detalles.filter(Boolean);
        if (parts.length === 0) return null;
        // Intelligent Grouping: Just show total if possible, but strict listing is fine for now.
        // Let's stick to listing for transparency: "8GB + 8GB"
        return parts.join(' + ');
    }
    return null;
}

function getHardwareTier(ticket) {
    const ramStr = JSON.stringify(ticket.ram || '').toLowerCase();
    const gpuStr = (ticket.gpuBrand || '').toLowerCase();
    const cpuStr = (ticket.cpuBrand || '').toLowerCase();

    // Check RAM Amount (Rough parsing)
    let ramGB = 0;
    const ramMatches = ramStr.match(/(\d+)gb/g);
    if (ramMatches) {
        ramMatches.forEach(m => ramGB += parseInt(m));
    } else {
        // Fallback checks
        if (ramStr.includes('4gb')) ramGB = 4;
        if (ramStr.includes('8gb')) ramGB = 8;
        if (ramStr.includes('16gb')) ramGB = 16;
        if (ramStr.includes('32gb')) ramGB = 32;
    }

    // 1. GAMER / CREATOR (Has Dedicated GPU)
    if (gpuStr.includes('nvidia') || gpuStr.includes('rtx') || gpuStr.includes('gtx') || gpuStr.includes('radeon') && !gpuStr.includes('vega')) {
        return { id: 'GAMER', name: 'Gamer & Creator Pro' };
    }

    // 2. PRO (High RAM or High End CPU)
    if (ramGB >= 16 || cpuStr.includes('i7') || cpuStr.includes('ryzen 7') || cpuStr.includes('i9')) {
        return { id: 'PRO', name: 'Profesional Multitarea' };
    }

    // 3. MID (Standard Business)
    if (ramGB >= 8 || cpuStr.includes('i5') || cpuStr.includes('ryzen 5')) {
        return { id: 'MID', name: 'Negocios & Universidad' };
    }

    // 4. ENTRY
    return { id: 'ENTRY', name: 'Básico / Hogar' };
}

function getSoftwareContext(tier) {
    switch (tier.id) {
        case 'GAMER':
            return "Render 3D (Blender, AutoCAD), Edición Video 4K (Premiere, DaVinci), Juegos AAA (Warzone, GTA V, Fortnite a +100FPS), Streaming (OBS).";
        case 'PRO':
            return "Virtualización (Docker, VMs), Programación Pesada (VS Code, Android Studio), Edición Fotográfica (Lightroom, Photoshop), Excel Masivo (Power BI).";
        case 'MID':
            return "Multitarea Fluida (+20 pestañas Chrome), Office 365 Completo, Zoom/Teams con fondo virtual, Photoshop Básico, Gestión Administrativa (ERPs web).";
        case 'ENTRY':
            return "Navegación Web, Streaming (Netflix, YouTube), Clases Online (Zoom/Meet), Microsoft Word/PowerPoint, Correo Electrónico.";
        default:
            return "Uso general de oficina y hogar.";
    }
}

function getTemplate(tier) {
    // These templates match Copywriting_Standards.md

    if (tier.id === 'GAMER') {
        return `
            <div class="product-intro">DOMINA EL JUEGO Y LA CREACIÓN. Este equipo está diseñado para quienes no aceptan lag ni esperas.</div>
            
            <ul class="neon-specs-list">
                <li><span class="spec-label">Marca:</span> <span class="spec-value">{{ticket.marca}}</span></li>
                <li><span class="spec-label">Modelo:</span> <span class="spec-value">{{ticket.modelo}}</span></li>
                <li><span class="spec-label">Potencia:</span> <span class="spec-value">{{specs.cpu}}</span></li>
                <li><span class="spec-label">Gráficos:</span> <span class="spec-value">{{specs.gpu}}</span></li>
                <li><span class="spec-label">Memoria:</span> <span class="spec-value">{{specs.ram}}</span></li>
                <li><span class="spec-label">Espacio:</span> <span class="spec-value">{{specs.disk}}</span></li>
            </ul>

            <div class="product-benefits">
                <strong>⚡ Rendimiento Puro:</strong> Mantenimiento térmico recién realizado para asegurar máximos FPS.
                <br><br>
                <strong>🎮 Listo para:</strong> {{softwareContext}}
            </div>
        `;
    }

    if (tier.id === 'PRO' || tier.id === 'MID') {
        return `
            <div class="product-intro">POTENCIA EMPRESARIAL EN TU MOCHILA. Diseñado para profesionales que no se detienen. Durabilidad superior y rendimiento constante.</div>
            
            <ul class="neon-specs-list">
                <li><span class="spec-label">Marca:</span> <span class="spec-value">{{ticket.marca}}</span></li>
                <li><span class="spec-label">Modelo:</span> <span class="spec-value">{{ticket.modelo}}</span></li>
                <li><span class="spec-label">Procesador:</span> <span class="spec-value">{{specs.cpu}}</span></li>
                <li><span class="spec-label">RAM Multitarea:</span> <span class="spec-value">{{specs.ram}}</span></li>
                <li><span class="spec-label">Almacenamiento:</span> <span class="spec-value">{{specs.disk}}</span></li>
                <li><span class="spec-label">Condición:</span> <span class="spec-value">Grado A (Impecable)</span></li>
            </ul>

            <div class="product-benefits">
                <strong>💼 Ideal para:</strong> {{softwareContext}}
                <br>
                Incluye Windows 10/11 Pro Activado y Garantía de 6 Meses.
            </div>
        `;
    }

    // ENTRY
    return `
        <div class="product-intro">TU COMPAÑERO DIARIO. La solución perfecta y económica para el hogar y estudios. Rápido, confiable y listo para usar.</div>
        
        <ul class="neon-specs-list">
            <li><span class="spec-label">Equipo:</span> <span class="spec-value">{{ticket.marca}} {{ticket.modelo}}</span></li>
            <li><span class="spec-label">Velocidad:</span> <span class="spec-value">{{specs.cpu}}</span></li>
            <li><span class="spec-label">Memoria:</span> <span class="spec-value">{{specs.ram}}</span></li>
            <li><span class="spec-label">Disco Rápido:</span> <span class="spec-value">{{specs.disk}}</span></li>
        </ul>

        <div class="product-benefits">
            <strong>🏠 Perfecto para:</strong> {{softwareContext}}
            <br>
            Batería testeada y cargador original incluido.
        </div>
    `;
}
