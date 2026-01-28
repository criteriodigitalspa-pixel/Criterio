export const DEMO_ACTIONS = [
    {
        name: "Consultar Stock",
        trigger: "check_inventory",
        description: "Verifica si hay disponibilidad de un producto específico en el almacén.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "product_name": { "type": "string" },\n    "sku": { "type": "string" }\n  }\n}',
        enabled: true
    },
    {
        name: "Agendar Reunión",
        trigger: "schedule_meeting",
        description: "Reserva un espacio en el calendario del vendedor para una demo o charla.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "client_email": { "type": "string" },\n    "date_time": { "type": "string" }\n  }\n}',
        enabled: true
    },
    {
        name: "Crear Ticket Soporte",
        trigger: "create_ticket",
        description: "Genera un caso de soporte técnico en Jira/Zendesk cuando el usuario reporta un problema.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "issue_summary": { "type": "string" },\n    "severity": { "type": "string", "enum": ["low", "high"] }\n  }\n}',
        enabled: true
    },
    {
        name: "Estado de Pedido",
        trigger: "order_status",
        description: "Informa al cliente en qué etapa logística se encuentra su compra.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "order_id": { "type": "string" }\n  }\n}',
        enabled: true
    },
    {
        name: "Calcular Cuota Prestamo",
        trigger: "calculate_loan",
        description: "Calculadora financiera para estimar pagos mensuales.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "amount": { "type": "number" },\n    "months": { "type": "integer" }\n  }\n}',
        enabled: true
    },
    {
        name: "Base de Conocimiento",
        trigger: "kb_search",
        description: "Busca en la documentación oficial respuestas a preguntas técnicas complejas.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "query": { "type": "string" }\n  }\n}',
        enabled: true
    },
    {
        name: "Escalar a Humano",
        trigger: "escalate_agent",
        description: "Transfiere la conversación inmediatamente a un operador humano.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "reason": { "type": "string" }\n  }\n}',
        enabled: true
    },
    {
        name: "Generar Cotización",
        trigger: "send_quote",
        description: "Envía un PDF con el presupuesto formal al correo del cliente.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "items": { "type": "array" },\n    "email": { "type": "string" }\n  }\n}',
        enabled: true
    },
    {
        name: "Actualizar CRM",
        trigger: "update_crm",
        description: "Actualiza los datos de contacto o preferencias del cliente en la base de datos.",
        schema: '{\n  "type": "object",\n  "properties": {\n    "field": { "type": "string" },\n    "value": { "type": "string" }\n  }\n}',
        enabled: true
    },
    {
        name: "Reporte Diario",
        trigger: "generate_report",
        description: "Compila las métricas del día y las envía al supervisor (Admin Only).",
        schema: '{\n  "type": "object",\n  "properties": {\n    "date": { "type": "string" }\n  }\n}',
        enabled: true
    }
];

export const DEMO_USERS = [
    {
        name: "Cliente Nuevo (Lead)",
        phoneNumber: "5491112345678",
        // Needs dynamic ID mapping in component
        role: "standard"
    },
    {
        name: "Cliente VIP",
        phoneNumber: "5491198765432",
        role: "vip"
    },
    {
        name: "Admin Sistema",
        phoneNumber: "5491100000000",
        role: "admin"
    }
];
