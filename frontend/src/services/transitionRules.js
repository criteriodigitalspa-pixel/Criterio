export const TRANSITION_RULES = {
    // --- SERVICIO RÁPIDO & DEDICADO UNIFIED RULES ---

    // 1. ENTRY (From Compras)
    "Compras->Servicio Rapido": {
        title: "⚡ Ingreso a Servicio Rápido",
        description: "Defina acciones, costos y tiempos.",
        fields: [
            {
                id: "serviceActions",
                label: "Acciones, Costos y Tiempos",
                type: "action_builder",
                required: true,
                helper: "Desglose el presupuesto y tiempo por cada acción.",
                options: [
                    "Otros",
                    "Cambio de RAM/ROM"
                ]
            }
        ]
    },

    // User requested "Servicio Dedicado" to have the SAME entry form
    "Compras->Servicio Dedicado": {
        title: "🛠️ Ingreso a Servicio Dedicado",
        description: "Defina acciones complejas, costos y tiempos.",
        fields: [
            {
                id: "serviceActions",
                label: "Acciones y Presupuesto (Dedicado)",
                type: "action_builder",
                required: true,
                helper: "Desglose las reparaciones complejas.",
                options: [
                    "Otros",
                    "Cambio de RAM/ROM"
                ]
            }
        ]
    },

    // 2. EXIT (To Publicidad OR Despacho) - UNIFIED
    "Servicio Rapido->Caja Publicidad": {
        title: "✅ Resolución de Servicio Rápido",
        description: "Valide tareas y hardware.",
        fields: [
            { id: "resolutionCheck", label: "Checklist", type: "action_resolver", required: true },
            { id: "hardwareSwaps", label: "Hardware", type: "hardware_swaps", required: false }
        ]
    },
    "Servicio Rapido->Caja Despacho": {
        title: "✅ Resolución de Servicio Rápido",
        description: "Valide tareas y hardware.",
        fields: [
            { id: "resolutionCheck", label: "Checklist", type: "action_resolver", required: true },
            { id: "hardwareSwaps", label: "Hardware", type: "hardware_swaps", required: false }
        ]
    },

    // Mirrored for Servicio Dedicado
    "Servicio Dedicado->Caja Publicidad": {
        title: "✅ Resolución de Servicio Dedicado",
        description: "Valide reparaciones y hardware final.",
        fields: [
            { id: "resolutionCheck", label: "Checklist", type: "action_resolver", required: true },
            { id: "hardwareSwaps", label: "Hardware", type: "hardware_swaps", required: false }
        ]
    },
    "Servicio Dedicado->Caja Despacho": {
        title: "✅ Resolución de Servicio Dedicado",
        description: "Valide reparaciones y hardware final.",
        fields: [
            { id: "resolutionCheck", label: "Checklist", type: "action_resolver", required: true },
            { id: "hardwareSwaps", label: "Hardware", type: "hardware_swaps", required: false }
        ]
    },

    // --- INTER-SERVICE TRANSITIONS ---
    "Servicio Rapido->Servicio Dedicado": {
        title: "🔄 Transición entre Servicios",
        description: "Revise las acciones realizadas antes de derivar.",
        fields: [
            { id: "resolutionCheck", label: "Revisión de Acciones Previas", type: "action_resolver", required: true },
            { id: "motivoDerivacion", label: "Motivo de Derivación", type: "textarea", required: true }
        ]
    },
    "Servicio Dedicado->Servicio Rapido": {
        title: "🔄 Transición entre Servicios",
        description: "Revise las acciones realizadas antes de derivar.",
        fields: [
            { id: "resolutionCheck", label: "Revisión de Acciones Previas", type: "action_resolver", required: true },
            { id: "motivoDerivacion", label: "Motivo de Derivación", type: "textarea", required: true }
        ]
    },

    // --- MOVIMIENTOS A ESPERA (Desde Servicios) ---
    "Servicio Rapido->Caja Espera": {
        title: "⏳ Mover a Espera",
        description: "Revise avance y explique el motivo de la espera.",
        fields: [
            { id: "resolutionCheck", label: "Avance de Acciones", type: "action_resolver", required: true },
            { id: "budgetStatus", label: "Estado del Repuesto", type: "budget_status_selector", required: true },
            { id: "budgetCost", label: "Costo Repuesto ($)", type: "number", required: true },
            {
                id: "motivoEspera",
                label: "Motivo de Espera",
                type: "select",
                options: ["Esperando Repuesto", "Esperando Aprobación", "Esperando Pago", "En Observación", "Otro"],
                required: true
            },
            { id: "obsEspera", label: "Detalle / Observación", type: "textarea", required: false }
        ]
    },
    "Servicio Dedicado->Caja Espera": {
        title: "⏳ Mover a Espera",
        description: "Revise avance y explique el motivo de la espera.",
        fields: [
            { id: "resolutionCheck", label: "Avance de Acciones", type: "action_resolver", required: true },
            { id: "budgetStatus", label: "Estado del Repuesto", type: "budget_status_selector", required: true },
            { id: "budgetCost", label: "Costo Repuesto ($)", type: "number", required: true },
            {
                id: "motivoEspera",
                label: "Motivo de Espera",
                type: "select",
                options: ["Esperando Repuesto", "Esperando Aprobación", "Esperando Pago", "En Observación", "Taller Externo", "Otro"],
                required: true
            },
            { id: "obsEspera", label: "Detalle / Observación", type: "textarea", required: false }
        ]
    },

    // --- DEVOLUCIÓN INMEDIATA (Compras -> Despacho) ---


    // --- CAJA RECICLAJE (Baja) ---
    "Compras->Caja Reciclaje": {
        title: "♻️ Baja de Equipo",
        description: "Autorizar desarme o reciclaje.",
        fields: [
            {
                id: "motivoBaja",
                label: "Motivo de Baja",
                type: "select",
                options: ["Irreparable", "Costo Prohibitivo", "Obsoleto", "Donante de Repuestos"],
                required: true
            }
        ]
    },

    // --- SALIDAS DE PUBLICIDAD ---
    "Compras->Caja Espera": {
        title: "⏳ Mover a Espera",
        description: "Indique por qué el equipo queda en espera antes de ingresar a taller.",
        fields: [
            { id: "budgetStatus", label: "Estado del Repuesto", type: "budget_status_selector", required: true },
            { id: "budgetCost", label: "Costo Repuesto ($)", type: "number", required: true },
            {
                id: "motivoEspera",
                label: "Motivo de Espera",
                type: "select",
                options: ["Falta Información Cliente", "Esperando Aprobación", "Esperando Repuesto (Stock)", "Otro"],
                required: true
            },
            { id: "obsEspera", label: "Detalle / Observación", type: "textarea", required: false }
        ]
    },

    "Caja Publicidad->Caja Despacho": {
        title: "✅ Publicidad Finalizada",
        description: "Equipo listo para entrega.",
        fields: []
    },
    "Caja Publicidad->Servicio Rapido": {
        title: "🔙 Devolver a Taller",
        description: "El equipo vuelve a revisión.",
        fields: [{ id: "motivoRetorno", label: "Motivo", type: "textarea", required: true }]
    },
    "Caja Publicidad->Servicio Dedicado": {
        title: "🔙 Devolver a Taller",
        description: "El equipo vuelve a revisión.",
        fields: [{ id: "motivoRetorno", label: "Motivo", type: "textarea", required: true }]
    },

    // --- SALIDAS DE DESPACHO ---
    "Caja Despacho->Servicio Rapido": {
        title: "⚠️ Garantía / Reingreso",
        description: "El cliente devuelve el equipo.",
        fields: [{ id: "motivoGarantia", label: "Falla Reportada", type: "textarea", required: true }]
    },
    "Caja Despacho->Servicio Dedicado": {
        title: "⚠️ Garantía / Reingreso",
        description: "El cliente devuelve el equipo.",
        fields: [{ id: "motivoGarantia", label: "Falla Reportada", type: "textarea", required: true }]
    }
};
