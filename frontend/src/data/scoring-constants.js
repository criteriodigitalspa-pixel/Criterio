export const CPU_SCORES = {
    // Keys exactly matching 'hardware-constants.js' (Array.from... `${i + 1}ª Gen`)
    "Intel Core i3": {
        "1ª Gen": 15, "2ª Gen": 18, "3ª Gen": 22, "4ª Gen": 25, "5ª Gen": 28,
        "6ª Gen": 32, "7ª Gen": 35, "8ª Gen": 45, "9ª Gen": 50, "10ª Gen": 55,
        "11ª Gen": 65, "12ª Gen": 75, "13ª Gen": 80, "14ª Gen": 85
    },
    "Intel Core i5": {
        "1ª Gen": 20, "2ª Gen": 25, "3ª Gen": 30, "4ª Gen": 35, "5ª Gen": 40,
        "6ª Gen": 45, "7ª Gen": 50, "8ª Gen": 65, "9ª Gen": 70, "10ª Gen": 75,
        "11ª Gen": 80, "12ª Gen": 85, "13ª Gen": 90, "14ª Gen": 95
    },
    "Intel Core i7": {
        "1ª Gen": 30, "2ª Gen": 35, "3ª Gen": 40, "4ª Gen": 45, "5ª Gen": 50,
        "6ª Gen": 60, "7ª Gen": 70, "8ª Gen": 80, "9ª Gen": 85, "10ª Gen": 90,
        "11ª Gen": 92, "12ª Gen": 95, "13ª Gen": 98, "14ª Gen": 100
    },
    "Intel Core i9": {
        // Starts at 9th Gen in constants
        "9ª Gen": 90, "10ª Gen": 92, "11ª Gen": 95, "12ª Gen": 98, "13ª Gen": 100, "14ª Gen": 100
    },
    "AMD Ryzen 3": {
        "Series 3000": 50, "Series 4000": 60, "Series 5000": 70, "Series 7000": 80
    },
    "AMD Ryzen 5": {
        "Series 3000": 60, "Series 4000": 70, "Series 5000": 80, "Series 6000": 85, "Series 7000": 90
    },
    "AMD Ryzen 7": {
        "Series 3000": 75, "Series 4000": 85, "Series 5000": 90, "Series 6000": 95, "Series 7000": 100
    },
    "AMD Ryzen 9": {
        "Series 5000": 95, "Series 6000": 98, "Series 7000": 100
    },
    "Apple Silicon": {
        "M1": 80, "M1 Pro/Max": 90, "M2": 90, "M2 Pro/Max": 95, "M3": 95, "M3 Pro/Max": 100
    },
    // Fallbacks
    "Intel Celeron": 15,
    "Intel Pentium": 20,
    "Intel Atom": 10,
    "Intel Xeon": 70
};

export const GPU_SCORES = {
    // Integrated - Match precise strings from hardware-constants
    "Gráficos Integrados Intel UHD": 30, // Bumped to allow basic CAD/BI
    "Gráficos Integrados Intel Iris": 35,
    "Intel Iris Xe": 40, // Common short name
    "Iris Xe": 40,
    "Gráficos Integrados AMD Radeon": 25,
    "Gráficos Integrados AMD Vega": 35,

    // NVIDIA Entry
    "GT 710M": 10, "GT 730M": 15, "GT 840M": 20, "GT 940MX": 25,
    "MX110": 20, "MX130": 25, "MX150": 35, "MX330": 40, "MX450": 45,

    // NVIDIA GTX
    "GTX 950M": 40, "GTX 960M": 45, "GTX 1050": 50, "GTX 1050 Ti": 55,
    "GTX 1060": 65, "GTX 1650": 60, "GTX 1660 Ti": 75,

    // NVIDIA RTX
    "RTX 2060": 80, "RTX 3050": 70, "RTX 3060": 85, "RTX 3070": 90,
    "RTX 4050": 80, "RTX 4060": 90, "RTX 4080": 98, "RTX 4090": 100,

    // Workstation
    "T1000": 60, "RTX A2000": 75
};

export const RAM_SCORES = {
    4: 30,
    8: 55, // Bumped slightly for basic multitasking
    12: 65,
    16: 80, // Standard 'Good'
    20: 85,
    24: 90,
    32: 95,
    64: 100,
    128: 100
};

export const APP_CATALOG = [
    {
        category: "Ofimática y Productividad",
        apps: [
            { name: "Google Workspace", rr: 10, description: "Docs, Sheets, Slides en la nube." },
            { name: "Microsoft Office 365", rr: 20, description: "Estándar profesional de oficina." },
            { name: "LibreOffice", rr: 15, description: "Suite ofimática open source ligera." },
            { name: "Notion / Obsidian", rr: 25, description: "Gestión de conocimiento y notas." },
            { name: "Microsoft Teams", rr: 30, description: "Colaboración empresarial intensa." },
            { name: "Zoom HD", rr: 30, description: "Videoconferencias fluidas." },
            { name: "Navegación Multitasking", rr: 35, description: "Múltiples pestañas y web apps." },
            { name: "Gestión PDF (Acrobat)", rr: 25, description: "Edición y firma de documentos." },
            { name: "Microsoft Project", rr: 40, description: "Gestión de proyectos complejos." },
            { name: "Microsoft Visio", rr: 35, description: "Diagramación profesional." }
        ]
    },
    {
        category: "Ingeniería, Arquitectura y Datos",
        apps: [
            { name: "AutoCAD 2D", rr: 50, description: "Diseño de planos técnicos." },
            { name: "AutoCAD 3D", rr: 65, description: "Modelado tridimensional básico." },
            { name: "Revit BIM", rr: 75, description: "Arquitectura y construcción BIM." },
            { name: "SketchUp Pro", rr: 55, description: "Modelado 3D rápido intuitivo." },
            { name: "SolidWorks", rr: 80, description: "Diseño mecánico industrial." },
            { name: "Civil 3D", rr: 75, description: "Ingeniería civil y topografía." },
            { name: "Lumion / V-Ray", rr: 85, description: "Renderizado fotorrealista." },
            { name: "KNIME Analytics", rr: 50, description: "Ciencia de datos visual." },
            { name: "Power BI Desktop", rr: 45, description: "Inteligencia de negocios." },
            { name: "Tableau", rr: 50, description: "Visualización de datos masivos." },
            { name: "Matlab / Simulink", rr: 60, description: "Cálculo matemático avanzado." },
            { name: "SPSS Statistics", rr: 40, description: "Análisis estadístico." }
        ]
    },
    {
        category: "Diseño Gráfico y Fotografía",
        apps: [
            { name: "Canva Pro", rr: 25, description: "Diseño web rápido." },
            { name: "Adobe Photoshop", rr: 55, description: "Retoque fotográfico estándar." },
            { name: "Adobe Illustrator", rr: 60, description: "Diseño vectorial y branding." },
            { name: "Adobe InDesign", rr: 50, description: "Maquetación editorial." },
            { name: "CorelDRAW", rr: 45, description: "Ilustración vectorial clásica." },
            { name: "Adobe Lightroom", rr: 50, description: "Revelado digital masivo." },
            { name: "Figma (App)", rr: 45, description: "Diseño UI/UX colaborativo." },
            { name: "Inkscape", rr: 35, description: "Vectorial open source ligero." },
            { name: "GIMP / Paint.NET", rr: 30, description: "Edición de imagen básica." }
        ]
    },
    {
        category: "Programación y Desarrollo",
        apps: [
            { name: "Visual Studio Code", rr: 35, description: "Editor de código ligero." },
            { name: "Web Dev Fullstack", rr: 45, description: "Node.js, React, Docker." },
            { name: "Python Data Science", rr: 50, description: "Pandas, NumPy, Scikit-learn." },
            { name: "IntelliJ IDEA", rr: 65, description: "Desarrollo Java robusto." },
            { name: "Eclipse / NetBeans", rr: 50, description: "IDEs clásicos." },
            { name: "Docker Desktop", rr: 70, description: "Contenedores y microservicios." },
            { name: "Android Studio", rr: 80, description: "Emulación móvil nativa." },
            { name: "Unity 3D", rr: 70, description: "Desarrollo de videojuegos." },
            { name: "Unreal Engine 5", rr: 90, description: "Motores gráficos avanzados." },
            { name: "VirtualBox / VMware", rr: 60, description: "Virtualización de o.s." },
            { name: "GitKraken / Postman", rr: 40, description: "Herramientas dev." }
        ]
    },
    {
        category: "Edición Multimedia y Audio",
        apps: [
            { name: "Adobe Premiere Pro", rr: 75, description: "Edición de video profesional." },
            { name: "After Effects", rr: 85, description: "Motion graphics y VFX." },
            { name: "DaVinci Resolve", rr: 80, description: "Colorización de cine." },
            { name: "CapCut Desktop", rr: 45, description: "Edición ágil para redes." },
            { name: "Sony Vegas", rr: 60, description: "Edición de video clásica." },
            { name: "OBS Studio", rr: 65, description: "Streaming y grabación." },
            { name: "Handbrake", rr: 70, description: "Transcodificación de video." },
            { name: "FL Studio", rr: 55, description: "Producción musical (DAW)." },
            { name: "Ableton Live", rr: 65, description: "Producción de audio en vivo." },
            { name: "Audacity", rr: 20, description: "Edición de audio básica." },
            { name: "VLC Media Player", rr: 10, description: "Reproducción universal." }
        ]
    },
    {
        category: "Gaming: eSports y Clásicos",
        apps: [
            { name: "League of Legends", rr: 45, description: "MOBA competitivo." },
            { name: "Valorant", rr: 60, description: "Shooter táctico fluido." },
            { name: "Counter-Strike 2", rr: 65, description: "FPS competitivo moderno." },
            { name: "Dota 2", rr: 55, description: "Estrategia en tiempo real." },
            { name: "Fortnite (Comp)", rr: 65, description: "Battle Royale modo rendimiento." },
            { name: "Minecraft Java", rr: 40, description: "Con mods ligeros." },
            { name: "Roblox", rr: 35, description: "Plataforma de juegos." },
            { name: "Rocket League", rr: 50, description: "Fútbol con autos." },
            { name: "GTA San Andreas", rr: 25, description: "Clásico mundo abierto." },
            { name: "Age of Empires II DE", rr: 40, description: "Estrategia clásica HD." },
            { name: "World of Warcraft", rr: 50, description: "MMORPG masivo." }
        ]
    },
    {
        category: "Gaming: Alta Demanda (AAA)",
        apps: [
            { name: "Call of Duty: Warzone", rr: 85, description: "Battle Royale pesado." },
            { name: "GTA V", rr: 70, description: "Mundo abierto detallado." },
            { name: "Red Dead Redemption 2", rr: 90, description: "Gráficos ultra realistas." },
            { name: "Cyberpunk 2077", rr: 95, description: "Ray Tracing y next-gen." },
            { name: "Elden Ring", rr: 85, description: "Mundo abierto exigente." },
            { name: "Forza Horizon 5", rr: 80, description: "Simulación de carreras." },
            { name: "Hogwarts Legacy", rr: 85, description: "Aventura gráfica pesada." },
            { name: "Flight Simulator", rr: 95, description: "Simulación aérea realista." },
            { name: "Apex Legends", rr: 75, description: "Battle Royale rápido." },
            { name: "The Sims 4 (Full)", rr: 45, description: "Simulación social con exp." }
        ]
    }
];
