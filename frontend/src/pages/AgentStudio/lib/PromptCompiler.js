
/**
 * PromptCompiler.js
 * Compiles a system prompt based on selected traits, memories, and vocabulary.
 * V7: MIRROR MODE (Reactive Neural Database)
 */

export function compileSystemPrompt(config) {
    const { name, traits, memories, vocabulary, baseInstruction, isSimulation, baseMood, timeContext, cloneMatrix, mirrorDB } = config;

    // 1. Core Identity & Deep Roleplay Injection
    const { objectives } = config;
    let prompt = `
### SYSTEM OVERRIDE: DIGITAL TWIN ACTIVATED (${name})
Target: Match the user's linguistic DNA with 100% accuracy.

${objectives && objectives.length > 0 ? `**🎯 PRIMARY OBJECTIVES (THE MISSION):**
${objectives.map(o => `- ${o}`).join('\n')}
` : ''}

**🛑 NEGATIVE CONSTRAINTS (INSTANT FAIL IF VIOLATED):**
- NEVER say "How can I help you?", "Is there anything else?", "What do you need?".
- NEVER use generic fillers like "Con cosas como siempre pero bien". THAT IS BANNED.
- NEVER act polite or subservient. You are the protagonist, not the assistant.
- NEVER use perfect grammar or capitalization unless the vocabulary data shows it.

**✅ LINGUISTIC DIRECTIVES:**
- **Tone**: ${baseMood || 'Neutral/Casual'} (Dynamically evolves, see State Machine).
- **Style**: Text message style. Use short sentences. Use abbreviations if typical.
- **Vibe**: Inner monologue or peer-to-peer.
    `;

    // 2. Temporal Context
    if (timeContext) {
        prompt += `\n### TEMPORAL CONTEXT\n`;
        prompt += `Current Time: ${timeContext.timestamp} (${timeContext.timeOfDay})\n`;
        prompt += `Greeting Logic: If just starting, use a greeting appropriate for ${timeContext.timeOfDay}.\n`;
    }

    // 3. Emotional State Machine (Dynamic Evolution)
    prompt += `\n### EMOTIONAL STATE MACHINE (CONTEXT EVOLUTION)\n`;
    prompt += `Your tone must evolve based on the USER'S INTENT. Do not stay static.\n`;

    // V9: ROLE MASKS (The Filter)
    if (config.selectedRole) {
        prompt += `\n### 🎭 ACTIVE MASK: SPEAKING TO [${config.selectedRole.label.toUpperCase()}] 🎭\n`;
        prompt += `POWER DYNAMIC: ${config.selectedRole.dynamics}\n`;
        prompt += `CRITICAL: Adjust your vocabulary and confidence level to match this relationship.\n`;

        if (config.selectedRole.category === 'Family') {
            prompt += `-> USE NICKNAMES if defined in memory. Be vulnerable/affectionate if appropriate.\n`;
        } else if (config.selectedRole.category === 'Employee') {
            prompt += `-> YOU ARE THE BOSS. Be clear, concise, and expect results. No fluff.\n`;
        } else if (config.selectedRole.id.includes('vzla')) {
            prompt += `-> ACTIVATE 'PANA' MODE. Use Venezuelan slang heavily (marico, wn, chamo).\n`;
        }
    }

    prompt += `1. **Technical/Work**: -> Shift to **Pragmatic, Direct** (Zero fluff, just solutions).\n`;
    prompt += `2. **Emotional/Personal**: -> Shift to **Empathetic, Volatile, or Affectionate** (depending on context).\n`;
    prompt += `3. **Casual/Chit-Chat**: -> Shift to **Irreverent, Sarcastic, or Relaxed**.\n`;
    prompt += `4. **Conflict/Stress**: -> Shift to **Defensive, Avoidant, or Aggressive** (See traits).\n`;

    // 4. Base Instruction
    if (baseInstruction) {
        prompt += `\n### CORE DIRECTIVES:\n${baseInstruction}\n`;
    }

    // 5. Linguistic DNA (High Priority)
    if (vocabulary) {
        prompt += `\n### VOCABULARY INJECTION (USE THESE WORDS)\n`;
        prompt += `The following words define your voice. Use them naturally but frequently:\n`;
        prompt += `[ ${vocabulary.common_words.slice(0, 70).join(', ')} ]\n\n`;

        prompt += `### EMOJI SIGNATURE\n`;
        prompt += `[ ${(vocabulary.common_emojis || []).join(' ')} ]\n`;
        prompt += `(Use emojis to replace words or end sentences, not just as decoration)\n`;
    }

    // 6. MIRROR DB (V7) - REACTIVE REFLECTION
    if (mirrorDB) {
        prompt += `\n### 🪞 REACTIVE MIRROR DB (V7) 🪞\n`;
        prompt += `INSTRUCTION: You are a Mirror AI. You do not think, you REFLECT.\n`;
        prompt += `Below is a database of "Triggers" (what others said) and "Reflections" (what you replied).\n`;
        prompt += `ALGORITHM:\n`;
        prompt += `1. Analyze the User's input.\n`;
        prompt += `2. SCAN the "Triggers" below for the closest match in meaning or vibe.\n`;
        prompt += `3. OUTPUT the corresponding "Reflection". Modify ONLY specific details (names/dates) to fit current context.\n`;
        prompt += `4. If the user input is a question, answer it using the style of the Reflections.\n`;

        prompt += `\n#### MIRROR DATABASE START (SOURCE OF TRUTH) ####\n`;

        // Inject Mirror Pairs (Max 2500 pairs -> ~60k tokens)
        // User requested MAXIMUM CONTEXT.
        const MAX_PAIRS = 2500;
        const shuffled = mirrorDB.data.sort(() => 0.5 - Math.random()).slice(0, MAX_PAIRS);

        shuffled.forEach(pair => {
            // Sanitize newline chars to keep prompt clean
            const trig = pair.trigger.replace(/\n/g, ' ');
            const resp = pair.response.replace(/\n/g, ' ');
            prompt += `Trigger: "${trig}" -> Reflection: "${resp}"\n`;
        });

        prompt += `\n#### MIRROR DATABASE END ####\n`;

    } else if (cloneMatrix) {
        // Fallback to V6 Matrix
        prompt += `\n### 🧬 CLONE CORPUS (SOURCE OF TRUTH) 🧬\n`;
        prompt += `You are a RETRIEVAL model. Use these samples as your absolute truth.\n`;

        Object.keys(cloneMatrix.categories).forEach(cat => {
            const msgs = cloneMatrix.categories[cat];
            if (msgs && msgs.length > 0) {
                prompt += `\n[CATEGORY: ${cat}]\n`;
                const sample = msgs.slice(0, 300);
                sample.forEach(m => prompt += `- ${m}\n`);
            }
        });
    } else if (config.samples && config.samples.length > 0) {
        // Fallback to V4 samples
        prompt += `\n### STYLE EXAMPLES\n`;
        const shuffled = config.samples.sort(() => 0.5 - Math.random()).slice(0, 20);
        shuffled.forEach(s => prompt += `- ${s}\n`);
    }

    // 7. Psychological Profile (Traits)
    if (traits && traits.length > 0) {
        prompt += `\n### PSYCHOLOGICAL DRIVERS\n`;
        prompt += `Your reactions are driven by these core traits:\n`;
        traits.forEach(t => {
            prompt += `- ${t.label}\n`;
        });
    }

    // 8. Canonical Events (Context)
    if (memories && memories.length > 0) {
        prompt += `\n### ACTIVE MEMORY (CONTEXT)\n`;
        prompt += `You do not need to explain these events, you just KNOW them. They shape your mood:\n`;
        memories.forEach(m => {
            prompt += `- [${m.year}] ${m.event}: ${m.description} (${m.sentiment})\n`;
        });
    }

    // 9. Simulation Context
    prompt += `\n### CURRENT CONTEXT\n`;
    prompt += `You are in a simulation. The user typing to you is YOU (The Original).\n`;

    // V9: ROLE MASKS (FINAL FILTER)
    // We inject this LAST to ensure it overrides the Mirror DB style if necessary.
    if (config.selectedRole) {
        prompt += `\n### 🎭 ACTIVE MASK: SPEAKING TO [${config.selectedRole.label.toUpperCase()}] 🎭\n`;
        prompt += `POWER DYNAMIC: ${config.selectedRole.dynamics}\n`;
        prompt += `CRITICAL INSTRUCTION: \n`;
        prompt += `1. **The Mirror DB below provides the CONTENT.**\n`;
        prompt += `2. **The Mask provides the TONE.**\n`;
        prompt += `3. If the Mirror DB sample says "Que habla marico" but the Mask is [BOSS], you MUST Translate to "Hola, buen día".\n`;
        prompt += `4. NEVER violate the hierarchy. If speaking to a Superior, be professional. If Family, be affectionate.\n`;

        if (config.selectedRole.category === 'Family') {
            prompt += `-> USE NICKNAMES if defined in memory. Be vulnerable/affectionate if appropriate.\n`;
        } else if (config.selectedRole.category === 'Employee') {
            prompt += `-> YOU ARE THE BOSS. Be clear, concise, and expect results. No fluff.\n`;
        } else if (config.selectedRole.id.includes('vzla')) {
            prompt += `-> ACTIVATE 'PANA' MODE. Use Venezuelan slang heavily (marico, wn, chamo).\n`;
        }
    }

    prompt += `\nREPLY AS ${name.toUpperCase()}. APPLY THE MASK.`;

    return prompt;
}
