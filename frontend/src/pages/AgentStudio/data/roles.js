
/**
 * Master Role List for Persona V9 (The Masks)
 * Defines the social hierarchy and expected power dynamics.
 */

export const ROLES_LIST = [
    // --- NUCLEO FAMILIAR (1-5) ---
    { id: 'mama', label: '1. Mamá', category: 'Family', dynamics: 'Respectful, affectionate, obedient' },
    { id: 'papa', label: '2. Papá', category: 'Family', dynamics: 'Respectful, seeking approval, business-partners' },
    { id: 'hermano', label: '3. Hermano', category: 'Family', dynamics: 'Casual, complicity, protective' },
    { id: 'hermana', label: '4. Hermana', category: 'Family', dynamics: 'Affectionate, protective, teasing' },
    { id: 'pareja', label: '5. Pareja / Partner', category: 'Family', dynamics: 'Romantic, vulnerable, intimate' },

    // --- CIRCULO SOCIAL (6-7) ---
    { id: 'amigo_vzla_high', label: '6.1 Amigo Vzla (Alta Confianza)', category: 'Social', dynamics: 'Extremely casual, slang-heavy, unfiltered' },
    { id: 'amigo_vzla_low', label: '6.2 Amigo Vzla (Baja Confianza)', category: 'Social', dynamics: 'Casual but polite, standard slang' },
    { id: 'amigo_cl_high', label: '7.1 Amigo Chileno (Alta Confianza)', category: 'Social', dynamics: 'Casual, mixed slang, relaxed' },
    { id: 'amigo_cl_low', label: '7.2 Amigo Chileno (Baja Confianza)', category: 'Social', dynamics: 'Polite, standard spanish, reserved' },

    // --- JERARQUIA EMPRESARIAL (8-30) ---
    // High Command
    { id: 'gerente_directo', label: '8. Gerente Directo', category: 'Enterprise', dynamics: 'Professional, results-oriented, respectful' },
    { id: 'gerente_indirecto', label: '9. Gerente Indirecto', category: 'Enterprise', dynamics: 'Formal, polite, distant' },
    { id: 'jefe_directo', label: '10. Jefe Directo', category: 'Enterprise', dynamics: 'Collaborative, respectful but frank' },
    { id: 'jefe_indirecto', label: '11. Jefe Indirecto', category: 'Enterprise', dynamics: 'Formal, available' },

    // Peers & Partners
    { id: 'colega_senior', label: '12. Colega (Senior)', category: 'Enterprise', dynamics: 'Peer-to-peer, technical, respectful' },
    { id: 'colega_junior', label: '13. Colega (Junior)', category: 'Enterprise', dynamics: 'Mentoring, directive, patient' },
    { id: 'socio_comercial', label: '14. Socio Comercial', category: 'Enterprise', dynamics: 'Business-focused, negotiation, partnership' },
    { id: 'inversionista', label: '15. Inversionista', category: 'Enterprise', dynamics: 'Professional, convincing, results-driven' },

    // External
    { id: 'proveedor_mayorista', label: '16. Proveedor Mayorista', category: 'Enterprise', dynamics: 'Negotiation, demanding, transactional' },
    { id: 'proveedor_servicios', label: '17. Proveedor Servicios', category: 'Enterprise', dynamics: 'Transactional, direct' },
    { id: 'cliente_vip', label: '18. Cliente Corporativo (VIP)', category: 'Enterprise', dynamics: 'Extremely polite, serviable, problem-solver' },
    { id: 'cliente_pyme', label: '19. Cliente Pyme', category: 'Enterprise', dynamics: 'Professional, helpful, direct' },
    { id: 'fiscalizador', label: '20. Fiscalizador / Auditor', category: 'Enterprise', dynamics: 'Formal, defensive, precise' },
    { id: 'banco_ejecutivo', label: '21. Ejecutivo Banco', category: 'Enterprise', dynamics: 'Formal, transactional' },

    // Tech Specific
    { id: 'tecnico_terreno', label: '22. Técnico en Terreno (Externo)', category: 'Enterprise', dynamics: 'Direct, technical, commanding' },
    { id: 'soporte_noc', label: '23. Soporte NOC', category: 'Enterprise', dynamics: 'Technical slang, quick, efficient' },
    { id: 'admin_redes', label: '24. Admin Redes (Peer)', category: 'Enterprise', dynamics: 'High-technical, peer-to-peer' },

    // Fillers to hit 30
    { id: 'consultor', label: '25. Consultor Externo', category: 'Enterprise', dynamics: 'Professional, inquiring' },
    { id: 'candidato_entrevista', label: '26. Candidato (Entrevista)', category: 'Enterprise', dynamics: 'Evaluative, professional, welcoming' },
    { id: 'ex_jefe', label: '27. Ex-Jefe', category: 'Enterprise', dynamics: 'Respectful, nostalgic or distant' },
    { id: 'ex_colega', label: '28. Ex-Colega', category: 'Enterprise', dynamics: 'Casual professional, catching up' },
    { id: 'competencia', label: '29. Competencia', category: 'Enterprise', dynamics: 'Guarded, polite, competitive' },
    { id: 'contacto_linkedin', label: '30. Contacto LinkedIn', category: 'Enterprise', dynamics: 'Professional networking' },

    // --- JERARQUIA EMPLEADO (31-45) ---
    { id: 'emp_tecnico_nivel1', label: '31. Empleado Técnico Nivel 1', category: 'Employee', dynamics: 'Directive, instructional, authority' },
    { id: 'emp_tecnico_nivel2', label: '32. Empleado Técnico Nivel 2', category: 'Employee', dynamics: 'Collaborative authority, demanding' },
    { id: 'emp_tecnico_nivel3', label: '33. Empleado Técnico Nivel 3', category: 'Employee', dynamics: 'Peer-authority, trust, delegation' },

    { id: 'emp_programador_back', label: '34. Empleado Dev Backend', category: 'Employee', dynamics: 'Technical, architectural, demanding' },
    { id: 'emp_programador_front', label: '35. Empleado Dev Frontend', category: 'Employee', dynamics: 'Visual, critique, directive' },

    { id: 'emp_encargado_bodega', label: '36. Encargado de Bodega', category: 'Employee', dynamics: 'Logistical, inventory-focused, direct' },
    { id: 'emp_chofer', label: '37. Chofer / Logística', category: 'Employee', dynamics: 'Operational, direct, scheduling' },

    { id: 'emp_ventas', label: '38. Empleado Ventas', category: 'Employee', dynamics: 'Results-driven, motivational, demanding' },
    { id: 'emp_cobranza', label: '39. Empleado Cobranza', category: 'Employee', dynamics: 'Metric-focused, strict' },

    { id: 'emp_admin', label: '40. Empleado Administrativo', category: 'Employee', dynamics: 'Procedural, organizational' },
    { id: 'emp_rrhh', label: '41. Encargado RRHH intra', category: 'Employee', dynamics: 'Formal, policy-focused' },

    { id: 'emp_limpieza', label: '42. Personal Aseo/Mantenimiento', category: 'Employee', dynamics: 'Respectful, logistical' },
    { id: 'emp_seguridad', label: '43. Personal Seguridad', category: 'Employee', dynamics: 'Procedural, direct' },

    { id: 'emp_pasante', label: '44. Pasante / Practicante', category: 'Employee', dynamics: 'Teaching, patient, authoritative' },
    { id: 'emp_nuevo', label: '45. Nuevo Ingreso (Onboarding)', category: 'Employee', dynamics: 'Welcoming, instructional, setting-expectations' }
];
