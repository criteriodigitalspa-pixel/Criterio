// Import all profiles globally (Vite glob import)
const profilesFiles = import.meta.glob('../data/profiles/*.json', { eager: true });

export const loadData = () => {
    const years = Object.keys(profilesFiles).map(path => {
        const data = profilesFiles[path].default || profilesFiles[path];
        return processProfile(data);
    }).sort((a, b) => a.year - b.year); // Sort by year

    return years;
};

// Heuristic Analysis to turn Text -> Numbers
const processProfile = (profile) => {
    const traits = profile.psyche?.traits || [];
    const summary = profile.psyche?.summary_of_self || "";
    const text = (traits.join(" ") + " " + summary).toLowerCase();

    // Scoring Logic (Simple Keyword Counting)
    let stress = 0;
    let professionalism = 0;
    let happiness = 0;

    const stressKeywords = ["estrés", "ansiedad", "frustra", "abrumad", "cansad", "presión", "dificil", "fallar", "mierda", "verga", "odio", "triste"];
    const proKeywords = ["experto", "foco", "trabajo", "empleo", "carrera", "resolver", "lider", "gestión", "datos", "colaborar", "equipo", "técnico", "cliente", "ventas"];
    const happyKeywords = ["amor", "familia", "feliz", "alegría", "celebrar", "apoyo", "amigo", "divertid", "relaj", "gracias", "fabi", "bebe", "te amo"];

    stressKeywords.forEach(k => { if (text.includes(k)) stress += 10; });
    proKeywords.forEach(k => { if (text.includes(k)) professionalism += 10; });
    happyKeywords.forEach(k => { if (text.includes(k)) happiness += 10; });

    // Normalize roughly to 0-100 scale based on relative density
    // This is arbitrary but useful for visualization
    const total = stress + professionalism + happiness + 1; // avoid /0

    return {
        year: profile.year,
        raw: profile,
        metrics: {
            stress: Math.min(100, stress),
            professionalism: Math.min(100, professionalism),
            happiness: Math.min(100, happiness)
        },
        dominant: getDominantMood(stress, professionalism, happiness)
    };
};

const getDominantMood = (s, p, h) => {
    if (s > p && s > h) return "Stressed";
    if (p > s && p > h) return "Focused";
    return "Balanced";
};
