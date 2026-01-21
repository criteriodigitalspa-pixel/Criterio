/**
 * Motor de Generación de Contenidos Persuasivos (Sales Copy)
 * Transforma especificaciones técnicas en beneficios tangibles para el cliente.
 */

export const SalesCopyGenerator = {

    /**
     * 1. CAPA DE IDENTIDAD (Brand Identity)
     * Define el "Alma" del equipo basado en su línea comercial.
     */
    _getBrandIdentity(ticket) {
        const line = `${ticket.marca || ''} ${ticket.modelo || ''}`.toUpperCase();

        if (line.includes('THINKPAD')) return {
            style: 'Ingeniería Robusta',
            adjectives: ['Legendaria', 'Militar', 'Indestructible'],
            heroPromise: ' Diseñado para durar toda la vida.'
        };
        if (line.includes('LATITUDE') || line.includes('PRECISION')) return {
            style: 'Corporativo',
            adjectives: ['Confiable', 'Seguro', 'Empresarial'],
            heroPromise: ' El estándar de las grandes empresas.'
        };
        if (line.includes('ELITEBOOK') || line.includes('PROBOOK') || line.includes('HP')) return {
            style: 'Ejecutivo',
            adjectives: ['Elegante', 'Fino', 'Potente'],
            heroPromise: ' Equilibrio perfecto entre estilo y rendimiento.'
        };
        if (line.includes('MACBOOK') || line.includes('APPLE')) return {
            style: 'Premium',
            adjectives: ['Retina', 'Fluido', 'Creativo'],
            heroPromise: ' La herramienta definitiva para creadores.'
        };

        return { // Generic fallback
            style: 'Versátil',
            adjectives: ['Rápido', 'Eficiente', 'Moderno'],
            heroPromise: ' Tu compañero ideal para el día a día.'
        };
    },

    /**
     * 2. CAPA DE RENDIMIENTO (Performance Grid)
     * Calcula un puntaje basado en Generación y RAM para determinar el "Perfil de Usuario"
     */
    _calculateProfile(ticket) {
        const specs = this._extractSpecs(ticket);
        let score = 0;

        // CPU Gen Score
        if (specs.cpuGen.includes('8') || specs.cpuGen.includes('9') || specs.cpuGen.includes('10') || specs.cpuGen.includes('11')) score += 5;
        else if (specs.cpuGen.includes('6') || specs.cpuGen.includes('7')) score += 3;
        else score += 1;

        // RAM Score
        if (specs.ramGB >= 16) score += 5;
        else if (specs.ramGB >= 8) score += 3;
        else score += 1;

        if (score >= 8) return {
            type: 'WORKSTATION',
            title: 'Potencia Profesional',
            desc: 'Ideal para programación, edición, multitarea pesada y bases de datos.'
        };
        if (score >= 5) return {
            type: 'BUSINESS',
            title: 'Oficina Avanzada',
            desc: 'Perfecto para Excel masivo, videollamadas fluidas y decenas de pestañas.'
        };
        return {
            type: 'HOME',
            title: 'Uso Doméstico / Estudiante',
            desc: 'Optimizado para navegación, streaming, tareas escolares y teletrabajo ligero.'
        };
    },

    /**
     * 3. CAPA DE CAPACIDADES (Software Matrix)
     * Define qué software puede correr según Tier de Hardware
     */
    _getSoftwareCapabilities(specs) {
        const caps = {
            arch: { title: '🏗️ Arquitectura e Ingeniería', apps: [] },
            design: { title: '🎨 Diseño y Multimedia', apps: [] },
            dev: { title: '💻 Programación', apps: [] },
            office: { title: '📊 Administración', apps: [] },
            games: { title: '🎮 Gaming / Ocio', apps: [] }
        };

        const isHighEndCPU = specs.cpuLabel.includes('i7') || specs.cpuLabel.includes('i9') || specs.cpuLabel.includes('Ryzen 7') || specs.cpuLabel.includes('Ryzen 9') || specs.cpuLabel.includes('M1') || specs.cpuLabel.includes('M2');
        const isMidEndCPU = specs.cpuLabel.includes('i5') || specs.cpuLabel.includes('Ryzen 5');
        const isNewGen = specs.cpuGen.includes('11') || specs.cpuGen.includes('12') || specs.cpuGen.includes('13') || specs.cpuGen.includes('M1') || specs.cpuGen.includes('M2') || specs.cpuGen.includes('5000'); // 11th Gen+ / Ryzen 5000+
        const has16GB = specs.ramGB >= 16;

        // --- LOGIC TIER ---
        if (isHighEndCPU && has16GB) {
            // TIER PRO (i7 + 16GB) - The "ThinkBook" example
            caps.arch.apps = ['AutoCAD Full (Fluido)', 'Revit (Proyectos Medios)', 'SketchUp Pro', 'Lumion (Render Básico)'];
            caps.design.apps = ['Photoshop (Capas)', 'Illustrator Pro', 'Premiere Pro (1080p)', 'Figma UI/UX'];
            caps.dev.apps = ['VS Code (Full)', 'Docker / Contenedores', 'IntelliJ IDEA', 'Python / Data Science'];
            caps.office.apps = ['Excel (Macros/PowerPivot)', 'Power BI', 'Multitasking Extremo', 'Zoom + Compartir'];
            caps.games.apps = isNewGen ? ['Fortnite (Medio/60fps)', 'Valorant (Alto)', 'Sims 4 (Mods)', 'League of Legends'] : ['League of Legends', 'Minecraft', 'CS:GO', 'Roblox'];

        } else if ((isMidEndCPU && has16GB) || (isHighEndCPU && !has16GB)) {
            // TIER MID-HIGH (i5 + 16GB OR i7 + 8GB)
            caps.arch.apps = ['AutoCAD 2D (Fluido)', 'SketchUp', 'Revit (Visor/Ligero)', 'Civil 3D (Básico)'];
            caps.design.apps = ['Photoshop', 'Canva Pro', 'CapCut Desktop', 'Illustrator (Básico)'];
            caps.dev.apps = ['VS Code', 'Git / Terminal', 'XAMPP/Laragon', 'Web Development'];
            caps.office.apps = ['Excel Avanzado', 'CRM / ERP Cloud', 'Teams/Meet Fluido', 'Gestión Documental'];
            caps.games.apps = ['League of Legends', 'Minecraft', 'Roblox', 'Stardew Valley'];

        } else {
            // TIER ENTRY (i3 OR 8GB/4GB) - The "ThinkPad E14" example
            caps.arch.apps = ['AutoCAD LT / Viewer', 'SketchUp Web', 'LibreCAD', 'Visores DWG'];
            caps.design.apps = ['Photopea (Web)', 'Canva Online', 'Inkscape', 'GIMP'];
            caps.dev.apps = ['VS Code (Ligero)', 'Sublime Text', 'Python Básico', 'HTML/CSS'];
            caps.office.apps = ['Office 365', 'Google Workspace', 'Contabilidad (Nubox/Defontana)', 'Ventas/POS'];
            caps.games.apps = ['Roblox', 'Among Us', 'Juegos Web/Flash', 'Retro Emuladores'];
        }

        return caps;
    },

    generateHtml(ticket) {
        const identity = this._getBrandIdentity(ticket);
        const profile = this._calculateProfile(ticket);
        const specs = this._extractSpecs(ticket);
        const software = this._getSoftwareCapabilities(specs);

        // --- DESIGN SYSTEM CONSTANTS ---
        const colors = {
            bg: '#020617', // Slate 950
            cardBg: 'rgba(30, 41, 59, 0.7)', // Slate 800/70
            accent: '#3b82f6', // Blue 500
            neon: '#4ade80', // Green 400
            text: '#e2e8f0', // Slate 200
            muted: '#94a3b8', // Slate 400
            border: 'rgba(148, 163, 184, 0.2)'
        };

        const renderAppList = (category) => `
            <div style="flex: 1 1 200px; min-width: 200px; margin-bottom: 1rem; background: ${colors.cardBg}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 1rem; backdrop-filter: blur(10px);">
                <h4 style="font-size: 0.85rem; color: ${colors.neon}; margin: 0 0 0.75rem 0; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
                    <span style="display: block; width: 6px; height: 6px; background: ${colors.neon}; border-radius: 50%; box-shadow: 0 0 8px ${colors.neon};"></span>
                    ${category.title}
                </h4>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; color: ${colors.text};">
                    ${category.apps.map(app => `
                        <li style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed ${colors.border}; padding-bottom: 4px;">
                            <span style="color: ${colors.accent}; font-size: 1rem;">▹</span> 
                            ${app}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        return `
            <div class="cd-product-description" style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: ${colors.bg}; color: ${colors.text}; line-height: 1.6; padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                
                <!-- HERO HEADER -->
                <div style="text-align: center; margin-bottom: 3rem; position: relative;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 100px; background: ${colors.accent}; filter: blur(80px); opacity: 0.2; z-index: 0;"></div>
                    <span style="position: relative; z-index: 1; display: inline-block; padding: 4px 12px; border-radius: 99px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1rem;">
                        ${identity.style} Edition
                    </span>
                    <h1 style="position: relative; z-index: 1; margin: 0; font-size: 2.5rem; font-weight: 900; line-height: 1.1; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; color: transparent;">
                        ${ticket.marca} <span style="color: ${colors.accent};">${ticket.modelo}</span>
                    </h1>
                    <p style="position: relative; z-index: 1; font-size: 1.2rem; color: ${colors.muted}; margin-top: 1rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                        ${profile.title} • ${identity.heroPromise}
                    </p>
                </div>

                <!-- HUD SPECS GRID -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 3rem;">
                    
                    <!-- CPU -->
                    <div style="background: ${colors.cardBg}; border: 1px solid ${colors.border}; border-radius: 16px; padding: 1.5rem; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, ${colors.accent}, transparent);"></div>
                        <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🧠</span>
                        <span style="font-size: 0.75rem; text-transform: uppercase; color: ${colors.muted}; font-weight: 700; letter-spacing: 1px;">Procesador</span>
                        <strong style="display: block; font-size: 1.3rem; color: white;">${specs.cpuLabel}</strong>
                    </div>

                    <!-- RAM -->
                    <div style="background: ${colors.cardBg}; border: 1px solid ${colors.border}; border-radius: 16px; padding: 1.5rem; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #ec4899, transparent);"></div>
                        <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">⚡</span>
                        <span style="font-size: 0.75rem; text-transform: uppercase; color: ${colors.muted}; font-weight: 700; letter-spacing: 1px;">Memoria RAM</span>
                        <strong style="display: block; font-size: 1.3rem; color: white;">${specs.ramLabel}</strong>
                    </div>

                    <!-- DISK -->
                    <div style="background: ${colors.cardBg}; border: 1px solid ${colors.border}; border-radius: 16px; padding: 1.5rem; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, ${colors.neon}, transparent);"></div>
                        <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🚀</span>
                        <span style="font-size: 0.75rem; text-transform: uppercase; color: ${colors.muted}; font-weight: 700; letter-spacing: 1px;">Almacenamiento</span>
                        <strong style="display: block; font-size: 1.3rem; color: white;">${specs.diskLabel}</strong>
                    </div>
                </div>

                <!-- STORYTELLING -->
                <div style="border-left: 4px solid ${colors.accent}; padding-left: 1.5rem; margin-bottom: 3rem;">
                    <p style="font-size: 1.1rem; color: ${colors.text}; margin: 0; font-style: italic;">
                        "${profile.desc} Diseñado para quienes buscan <strong>${identity.adjectives[0]}</strong> y <strong>${identity.adjectives[1]}</strong>. 
                        Este equipo no es solo una laptop, es tu centro de operaciones."
                    </p>
                </div>

                <!-- MATRIX DE SOFTWARE -->
                <h3 style="text-align: center; color: white; margin-bottom: 2rem; font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">
                    ⚡ Capacidad de Fuego
                </h3>
                <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                    ${renderAppList(software.office)}
                    ${renderAppList(software.design)}
                    ${renderAppList(software.arch)}
                    ${renderAppList(software.dev)}
                    ${renderAppList(software.games)}
                </div>

                <!-- FOOTER TRUST -->
                 <div style="margin-top: 3rem; background: rgba(59, 130, 246, 0.1); border: 1px dashed ${colors.accent}; padding: 1.5rem; border-radius: 12px; text-align: center;">
                     <div style="display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; color: ${colors.text}; font-weight: 600; font-size: 0.9rem;">
                        <span style="display: flex; align-items: center; gap: 5px;">✅ Reacondicionado Grado A</span>
                        <span style="display: flex; align-items: center; gap: 5px;">🛡️ 6 Meses de Garantía</span>
                        <span style="display: flex; align-items: center; gap: 5px;">🚛 Envío Asegurado a Todo Chile</span>
                     </div>
                </div>
            </div>
        `;
    },

    _extractSpecs(ticket) {
        // Reuse extraction logic but robust
        const cpuBrand = ticket.additionalInfo?.cpuBrand || '';
        const cpuGen = ticket.additionalInfo?.cpuGen || '';
        const cpuLabel = `${cpuBrand} ${cpuGen}`.trim() || 'Intel Core';

        let ramGB = 0;
        let ramLabel = "N/A";
        if (ticket.ram) {
            if (ticket.ram.detalles && ticket.ram.detalles.length > 0) {
                ticket.ram.detalles.forEach(d => {
                    const match = d.match(/(\d+)GB/i);
                    if (match) ramGB += parseInt(match[1]);
                });
                ramLabel = `${ramGB}GB Dual-Channel`;
                if (!ramGB) ramLabel = ticket.ram.detalles.join(' + ');
            } else if (ticket.ram.original) {
                const match = ticket.ram.original.match(/(\d+)GB/i);
                if (match) ramGB = parseInt(match[1]);
                ramLabel = ticket.ram.original;
            }
        }

        let diskLabel = "SSD Alta Velocidad";
        if (ticket.disco && ticket.disco.detalles) {
            diskLabel = ticket.disco.detalles.join(' + ');
        }

        return { cpuBrand, cpuGen, cpuLabel, ramGB: ramGB || 8, ramLabel, diskLabel };
    }
};
