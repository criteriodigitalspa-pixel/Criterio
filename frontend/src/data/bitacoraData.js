export const BITACORA_MODULES = [
    {
        id: 'architecture',
        title: 'Módulo 0: Arquitectura Técnica',
        version: '1.0',
        lastUpdated: '08 Dic 2025',
        category: 'structure',
        status: 'Base',
        content: `
# 📒 Bitácora de Módulo: Arquitectura Técnica

**Versión:** 1.0  
**Última Actualización:** 08 Diciembre 2025 23:57:55  
**Estado:** Producción

---

## 🏗️ 1. Definición del Módulo
Este documento define los cimientos tecnológicos sobre los que se construye el ERP. Cualquier duplicación del proyecto debe respetar estrictamente este stack para garantizar compatibilidad con los otros módulos.

---

## ⚙️ 2. Stack Tecnológico (MERN + Firebase)

### Frontend (SPA)
*   **Framework:** React 19 (vía Vite).
*   **Lenguaje:** JavaScript (ES6+).
*   **Estilos:** Tailwind CSS 3.4 (Utility-first). Usamos \`clsx\` y \`tailwind-merge\` para clases condicionales.
*   **Iconos:** Lucide React (ligeros, SVG).
*   **Routing:** React Router DOM 7.
*   **Formularios:** React Hook Form.

### Backend (Serverless)
*   **Plataforma Base:** Google Firebase.
*   **Base de Datos:** Cloud Firestore (NoSQL).
*   **Auth:** Firebase Authentication.
*   **Hosting:** Firebase Hosting (o Vercel).

### Servicios Adicionales
*   **Impresión:** Node.js (Script local puro).

---

## ⚡ 2.5. Disponibilidad del Sistema (Preguntas Frecuentes)

Es vital entender qué partes del sistema siguen vivas si apagas el computador principal:

### ✅ La Web (Frontend) - SIEMPRE ONLINE
*   **¿Dónde vive?**: En los servidores de Google (Firebase Hosting).
*   **Si apagas tu PC**: El sitio **SIGUE FUNCIONANDO**.
*   **Acceso**: Podrás entrar desde tu celular, tablet o casa para ver tickets, cambiar estados o ingresos.

### ❌ La Impresora (Print Agent) - DEPENDENCIA LOCAL
*   **¿Dónde vive?**: En tu computador físico ("backend local").
*   **Si apagas tu PC**: **NO IMPRIMIRÁ**.
*   **Comportamiento**: Si mandas a imprimir desde el celular con el PC apagado, el trabajo quedará en **"Pendiente"** en la nube. Apenas enciendas el PC y corras el agente, las etiquetas saldrán.

---

## 🖥️ 3. Estructura de Directorios
El orden de archivos es crítico para la mantenibilidad:

\`\`\`
src/
├── components/       # Bloques UI reutilizables (Botones, Tarjetas)
├── context/          # Estados globales (AuthContext)
├── data/             # Datos estáticos (Reglas, Textos Bitácora)
├── layouts/          # Estructuras de página (Sidebar, Header)
├── pages/            # Vistas principales (Login, Kanban, Config)
├── services/         # Lógica de negocio pura (firebaseService, ticketService)
│   ├── transitionRules.js  # Reglas del Kanban
│   └── printService.js     # Lógica de impresión
└── main.jsx          # Punto de entrada
\`\`\`

---

## 🛠️ 4. Prompt de Reconstrucción
> "Inicializa un proyecto React con Vite y Tailwind.
> 1.  Configura Firebase (\`firebase.js\`) exportando \`db\` y \`auth\`.
> 2.  Crea una estructura de carpetas: \`components\`, \`pages\`, \`context\`, \`services\`.
> 3.  Instala \`react-router-dom\` y configura un Router principal con rutas protegidas (\`ProtectedRoute\`) y rutas públicas (\`Login\`).
> 4.  Usa \`lucide-react\` para los íconos del Sidebar."
`
    },
    {
        id: 'kanban',
        title: 'Módulo 1: Tablero Kanban',
        version: '1.0',
        lastUpdated: '08 Dic 2025 23:57:55',
        category: 'feature',
        status: 'Estable',
        content: `
# 📒 Bitácora de Módulo: Tablero Kanban

**Versión:** 1.0  
**Última Actualización:** 08 Diciembre 2025 23:57:55  
**Estado:** Estable / Producción

---

## 🏗️ 1. Definición del Módulo
Este módulo es el corazón del sistema ERP. Su propósito es visualizar y controlar el flujo operativo de los notebooks desde que ingresan hasta que se venden/entregan. Funciona como un "Tablero de Control de Tráfico" con reglas estrictas de validación.

### A. Estructura de Datos (Las Columnas)
El tablero se divide en **7 Áreas Operativas** inmutables.

| ID | Nombre | Propósito | Reglas |
| :--- | :--- | :--- | :--- |
| **Compras** | 📥 INGRESO | Recepción | Punto de inicio. |
| **Rápido** | ⚡ RÁPIDO | < 1h | Requiere Presupuesto. |
| **Dedicado**| 🔧 DEDICADO | Complejo | Requiere Tiempo Estimado. |
| **Espera** | ⏳ ESPERA | Repuestos | Pausa el reloj. |
| **Reciclaje** | ♻️ BAJA | Desecho | Sin salida. |
| **Publicidad** | 📸 PUBLICIDAD | Venta | **Gate:** QA 100%. |
| **Despacho** | 🚚 DESPACHO | Envío | **Gate:** Specs Finales. |

| **Despacho** | 🚚 DESPACHO | Envío | **Gate:** Specs Finales. |

### B. SLA (Acuerdos de Nivel de Servicio)
Tiempos máximos permitidos antes de entrar en estado crítico ("Danger"):

| Área | Tiempo Límite | Nota |
| :--- | :--- | :--- |
| **Compras** | 2 Días | Ingreso y clasificación inicial. |
| **Servicio Rápido** | 3 Días | Limpiezas, formatos, upgrades simples. |
| **Servicio Dedicado**| 30 Días | Reparación de placa, espera de repuestos complejos. |
| **Caja Despacho** | 15 Días | Tiempo máximo en estantería de salida. |
| **Caja Publicidad** | 48 Horas | Fotografía y publicación. |
| **Caja Espera/Reciclaje** | 6 Meses | Almacenamiento a largo plazo. |

---

## ⚙️ 2. Lógica de Negocio (Reglas de Movimiento)
1. **Gates de Salida**: 
   - Nadie pasa a Publicidad sin QA 100% y Ficha Técnica.
2. **Carriles Rápidos (Free Pass)**:
   - **Exclusivo:** Movimiento entre *Publicidad* y *Despacho*.
   - **Regla:** Sin formularios, sin validaciones extra. Clic y mover.
2. **Carry Over (Arrastre)**: 
   - Si mueves un ticket con tareas pendientes, estas se copian al nuevo servicio automáticamente.
3. **Reinicio de Calidad**: 
   - Si un equipo vuelve a entrar a servicio, su QA se resetea a 0.

---

## 🖥️ 3. Componentes de Interfaz
- **Desktop**: Scroll horizontal infinito con **Aceleración por Hardware (GPU)**.
- **Micro-Interacciones**: Throttling a 60fps para el arrastre (panning) usando \`requestAnimationFrame\`.
- **Banner SLA**: Ticker rotatorio ("Marquee") en el header mostrando el Top 3 de áreas críticas con tiempos de atraso.
- **Móvil**: Stack vertical para scrollear con el dedo.
- **Tarjeta**: Tiene un botón "Mover" (➡️) explícito para pantallas táctiles.

---

## 🛠️ 4. Prompt de Reconstrucción
> "Actúa como Arquitecto de Software. Construye un Kanban con 7 columnas estáticas. Implementa Drag&Drop nativo. Crucial: Bloquea el drop en 'Publicidad' si qaProgress < 100. En móviles usa flex-col."
`
    },
    {
        id: 'tickets',
        title: 'Módulo 2: Tickets e Inventario',
        version: '1.0',
        lastUpdated: '08 Dic 2025 23:57:55',
        category: 'feature',
        status: 'Estable',
        content: `
# 📒 Bitácora de Módulo: Gestión de Tickets e Inventario

**Versión:** 1.0
**Última Actualización:** 08 Diciembre 2025 23:57:55
**Estado:** Producción

---

## 🏗️ 1. Definición del Módulo
Este módulo maneja la "Ficha Clínica" del equipo. Define cómo se crea un ticket, qué datos se capturan y cómo se identifica de forma única.

### A. El "Smart ID" (Identificador)
No usamos los IDs largos de Firebase (\`3m2n8f...\`). Usamos un ID legible para humanos:
*   **Formato:** \`AAMM-XXXX\` (Año Mes - Correlativo). Ej: \`2512-0042\`.
*   **Generación:** Transaccional. Se lee un contador atómico en Firestore (\`counters/tickets\`), se incrementa y se asigna. Garantiza que no haya duplicados incluso si dos técnicos crean ticket al mismo tiempo.

---

## ⚙️ 2. Estructura de Datos (Schema)
Un objeto Ticket tiene 3 capas de profundidad:

1.  **Datos Cliente:** Nombre, Contacto, Rut.
2.  **Datos Equipo (Ingreso):**
    *   \`tipo\` (Notebook, PC, Mac).
    *   \`marca\`, \`modelo\`.
    *   \`password\` (Clave del SO).
    *   \`cargador\` (Bool: Deja o no deja cargador).
    *   \`falla\` (Descripción del cliente).
3.  **Datos Técnicos (Evolutivos):**
    *   \`specs\`: RAM, Disco, Procesador.
    *   \`qaChecklist\`: Estado de pruebas.
    *   \`serviceActions\`: Lista de reparaciones.

---

## 🛠️ 4. Prompt de Reconstrucción
> "Crea un sistema de gestión de Tickets.
> 1.  **ID:** Implementa un generador de IDs secuenciales \`YYMM-0000\` usando transacciones de Firestore.
> 2.  **Schema:** El ticket debe tener campos para Cliente, Equipo y Falla.
> 3.  **UI:** Crea un formulario de ingreso que, al guardar, genere el ID y guarde en Firestore."
`
    },
    {
        id: 'security',
        title: 'Módulo 3: Seguridad y Roles',
        version: '1.2',
        lastUpdated: '10 Dic 2025',
        category: 'security',
        status: 'Crítico',
        content: `
# 📒 Bitácora de Módulo: Seguridad y Control de Acceso

**Versión:** 1.2
**Última Actualización:** 10 Diciembre 2025
**Estado:** Producción

---

## 🛡️ 1. Matriz de Roles (RBAC)
El sistema implementa 3 niveles de acceso. La asignación de roles es exclusiva del Administrador.

| Rol | Nombre | Permisos |
| :--- | :--- | :--- |
| **Admin** | 👑 Administrador | **Acceso Total.** Gestión de usuarios, eliminación de tickets, configuración global. |
| **Technician** | 🔧 Técnico | **Operativo.** Ver Tablero, Mover Tickets, Crear Tickets, Imprimir. NO puede borrar usuarios ni tickets. |
| **Viewer** | 👁️ Visualizador | **Solo Lectura.** Puede ver el tablero y reporte de status. Ideal para gerencia o monitores de planta. |

---

## 🔒 2. Reglas de Firestore (Security Rules)
La seguridad no depende solo del Frontend (que se puede burlar), sino que se aplica a nivel de base de datos.

### Regla A: Gestión de Usuarios (Anti-Escalación)
*   **Qué:** La colección \`users\` está bloqueada.
*   **Lógica:** Solo un usuario con \`role == 'Admin'\` puede escribir o modificar datos de otros usuarios.
*   **Efecto:** Un técnico no puede "autopromoverse" a Admin ni borrar a otros.

### Regla B: Inmutabilidad Histórica
*   **Qué:** La subcolección \`history\` es "Append-Only".
*   **Lógica:** \`allow create: if true;\`, \`allow update, delete: if false;\`.
*   **Efecto:** Nadie puede borrar su rastro. Si alguien mueve un ticket, queda grabado para siempre.

---

## 🛠️ 3. Prompt de Reconstrucción
> "Configura la seguridad de Firebase.
> 1.  **Colección Users:** Lectura pública (autenticada). Escritura SOLO si \`request.auth.token.role == 'Admin'\` (o verificando documento).
> 2.  **Colección Tickets:** Lectura autenticada. Escritura autenticada.
> 3.  **Subcolección History:** Bloquea DELETE y UPDATE. Solo permite CREATE."
`
    },
    {
        id: 'printing',
        title: 'Módulo 4: Impresión Cloud',
        version: '1.0',
        lastUpdated: '08 Dic 2025 23:57:55',
        category: 'feature',
        status: 'Estable',
        content: `
# 📒 Bitácora de Módulo: Sistema de Impresión Cloud

**Versión:** 1.0
**Última Actualización:** 08 Diciembre 2025 23:57:55
**Estado:** Estable / Producción

---

## 🏗️ 1. Definición del Módulo
Permite imprimir etiquetas térmicas directamente desde la web App, sin importar si el usuario está en un PC, Tablet o Celular. Resuelve el problema de que los navegadores web no tienen acceso directo al hardware USB.

---

## ⚙️ 2. Arquitectura "Híbrida"
Utilizamos un enfoque de **Cola en la Nube** (Cloud Queue).

### Paso A: Generación (Frontend React)
1.  **Diseño:** El componente \`PrintLabel.jsx\` renderiza la etiqueta.
2.  **Captura:** Usamos \`html2canvas\` -> Base64.
3.  **Encolado:** Subimos a Firestore \`print_jobs\`.

### Paso B: El Cliente de Impresión (Node.js Local)
Script corre en el PC con la impresora USB.
1.  **Escucha:** Monitorea \`print_jobs\` con \`status: 'pending'\`.
2.  **Descarga:** Guarda PDF temporal.
3.  **Imprime:** Ejecuta comando de sistema (Foxit Reader / LPR).
4.  **Confirma:** Actualiza status a \`printed\`.

---

## 🛠️ 4. Prompt de Reconstrucción
> "Diseña un sistema de impresión remota.
> 1.  **Frontend:** Crea un componente React que visualice una etiqueta, convierta a PDF y guarde en Firestore \`print_jobs\`.
> 2.  **Cliente Node:** Escucha esa colección. Cuando llegue un job, descarga y manda a la impresora USB."
`
    },
    {
        id: 'changelog',
        title: 'Módulo 5: Bitácora de Mantenimiento',
        version: '1.0',
        lastUpdated: '08 Dic 2025 23:57:55',
        category: 'log',
        status: 'Vivo',
        content: `
# 📒 Bitácora de Mantenimiento (Changelog)

**Versión:** 1.0  
**Última Actualización:** 08 Diciembre 2025 23:57:55  
**Estado:** Activo

---

## 🛠️ Registro de Cambios y Correcciones

Este documento registra los ajustes realizados al sistema en vivo ("Hotfixes") y las mejoras incrementales.

### [2025-12-08] Hotfix: Cierre Inesperado de Modales
*   **Problema:** Al llenar la "Ficha Técnica" o el "QA Checklist", el formulario se cerraba solo (auto-save).
*   **Diagnóstico:** \`KanbanBoard\` interpretaba el \`onUpdate\` como señal de cierre.
*   **Solución:** Desacople de lógica. Ahora el modal solo cierra explícitamente.
> 1.  Define constantes de tiempo para cada área (ej: Rapido=3d, Dedicado=30d).
> 2.  Crea una función utilitaria que reciba un ticket y retorne si cumple o no el SLA.
> 3.  En el Dashboard, agrupa todos los tickets activos y calcula el % de cumplimiento."
`
    },
    {
        id: 'incident_report_001',
        title: 'Reporte Incidente: White Screen Post-Reinicio',
        version: '1.0',
        lastUpdated: '09 Dic 2025',
        category: 'error',
        status: 'Resuelto',
        content: `
# 🚨 Reporte de Incidente Crítico: White Screen (Pantalla Blanca de la Muerte)

**Fecha Incidente:** 09 Diciembre 2025, 17:00 HRS  
**Criticidad:** ALTA (Bloqueo Total)  
**Estado Actual:** ✅ RESUELTO

---

## 🛑 1. Descripción del Problema
Tras un reinicio forzado del PC de desarrollo, la aplicación React dejó de cargar completamente, mostrando una **Pantalla en Blanco** (White Screen) sin errores visibles en la consola del navegador.
- **Síntoma:** El indicador de carga giraba infinitamente o la pantalla quedaba negra.
- **Rutas Afectadas:** Raíz (\`/\`) y rutas específicas como \`/ingreso\`.

---

## 🔍 2. Diagnóstico Técnico
Se aisló el problema utilizando una estrategia de **"Modo Seguro"** (Safe Mode), desactivando componentes uno a uno hasta recuperar la UI.

### Causa Raíz A: Corrupción en IngresoTicket.jsx
Se detectaron **Claves Duplicadas (Duplicate Keys)** en el array de items de RAM/Disco dentro del estado inicial del componente.
- **Error:** React exige \`key\` únicos. Al haber duplicados por corrupción de estado o copy-paste, React crasheaba el árbol de renderizado completo silenciosamente.

### Causa Raíz B: Conflicto de Layout CSS
El archivo \`DashboardLayout.jsx\` tenía un relleno global (\`p-4 md:p-8\`) que entraba en conflicto con los estilos de componentes internos.
- **Efecto:** Los encabezados "Sticky" (que deben pegarse arriba) flotaban en el aire, y había doble espaciado en formularios.

---

## 🛠️ 3. Solución Implementada
1.  **Refactorización IngresoTicket:** Se reescribió la lógica de inicialización de arrays para RAM y Disco, asegurando índices únicos.
2.  **Limpieza de Layout:** Se eliminó el padding global de \`DashboardLayout\`, delegando el control de espaciado a cada página (\`KanbanBoard\`, \`IngresoTicket\`, etc.).
3.  **Restauración de Dependencias:** Se verificaron y restauraron las importaciones críticas en \`App.jsx\`.

---

## 📉 4. Lecciones Aprendidas
- **Validación de Keys:** Nunca usar valores de usuario directos como \`key={valor}\`. Usar índices o IDs únicos.
- **Layouts Limpios:** Los layouts principales ("Shells") no deben imponer espaciado interno (\`padding\`). Deben ser contenedores neutros.

---
`
    },
    {
        id: 'migration',
        title: 'Módulo 6: Guía de Migración (Paso a Paso)',
        version: '1.0',
        lastUpdated: '09 Dic 2025',
        category: 'guide',
        status: 'Guía',
        content: `
# 📦 Guía de Migración de Sistema

Esta bitácora detalla los pasos exactos para mover todo el sistema (Web y Servidor de Impresión) a un nuevo computador (ej: computador de mostrador).

---

## 📋 Requisitos Previos
En el nuevo computador necesitas instalar:
1.  **Node.js (LTS):** Descargar e instalar desde [nodejs.org](https://nodejs.org/). Todo "Siguiente" -> "Siguiente".
2.  **Impresora:** Conectar la impresora térmica USB e instalar sus drivers. Asegúrate de que imprima la página de prueba de Windows.

---

## 🚚 Paso 1: Mover los Archivos
Tienes dos carpetas principales que copiar. Puedes usar un Pendrive o Google Drive.

1.  **Carpeta \`frontend\`**: Contiene la página web (la interfaz).
2.  **Carpeta \`print_agent\`**: Contiene el programa "invisible" de impresión.

*Recomendación:* Crea una carpeta \`C:\\SistemaTaller\` y pega ambas carpetas allí.

---

## 🌍 Paso 2: Configurar la Web (Frontend)
Si vas a correr la web desde ese PC (no desde internet):

1.  Abre la carpeta \`frontend\`.
2.  Clic derecho en un espacio vacío -> "Abrir en Terminal" (o PowerShell).
3.  Escribe: \`npm install\` (Solo la primera vez).
4.  Escribe: \`npm run dev\`.
5.  Se abrirá una dirección (ej: \`http://localhost:5173\`). Esa es tu App.

---

## 🖨️ Paso 3: Configurar la Impresión (Print Agent)
Para que salgan las etiquetas:

1.  Abre la carpeta \`print_agent\`.
2.  Asegúrate de que el archivo \`.env.local\` esté ahí (debe tener tus claves VITE_FIREBASE...). Si no está, cópialo desde la carpeta frontend.
3.  Clic derecho -> "Abrir en Terminal".
4.  Escribe: \`npm install\` (Solo la primera vez).
5.  Escribe: \`node index.js\`.
6.  Debe decir: **"🟢 Agente de Impresión LISTO"**.

---

## ⚡ Truco Pro: Inicio Automático
Para no tener que escribir comandos cada vez que prendes el PC:

1.  Crea un archivo nuevo de texto en el Escritorio llamdo \`INICIAR_SISTEMA.bat\`.
2.  Edítalo y pega esto (ajusta las rutas si cambiaste la carpeta):

\`\`\`batch
@echo off
start "Sistema Web" /min cmd /c "cd C:\\SistemaTaller\\frontend && npm run dev"
start "Servidor Impresion" /min cmd /c "cd C:\\SistemaTaller\\print_agent && node index.js"
echo Sistemas Iniciados...
timeout 5
start http://localhost:5173
\`\`\`

3.  Guárdalo. Ahora solo dale doble clic a ese icono y todo se encenderá solo.
`
    },
    {
        id: 'user_management_module',
        title: 'Módulo 8: Gestión de Usuarios (Admin)',
        version: '1.0',
        lastUpdated: '10 Dic 2025',
        category: 'security',
        status: 'Nuevo',
        content: `
# 📒 Bitácora de Módulo: Gestión de Usuarios
**Versión:** 1.0
**Última Actualización:** 10 Diciembre 2025
**Estado:** Activo

---

## 👥 1. Panel de Administración
Se ha implementado una interfaz visual para gestionar el equipo de trabajo sin acceder a la base de datos.
*   **Ruta:** \`/users\` (Visible solo para Admins en el Sidebar).
*   **Funciones:**
    *   **Crear:** Alta de nuevos técnicos con email/password.
    *   **Editar:** Cambiar Roles y Permisos.
    *   **Bloquear:** Desactivar acceso (Soft Delete) sin borrar historial.

---

## 🛡️ 2. Roles y Permisos (RBAC)
Definición estricta de jerarquías:

| Rol | Permisos Clave | Uso Típico |
| :--- | :--- | :--- |
| **Admin** | **TOTAL**. Puede crear/borrar usuarios y reglas. | Dueño / Jefe Taller. |
| **Technician** | **OPERATIVO**. Tickets, Movimientos, Comentarios. | Técnicos de reparación. |
| **Viewer** | **LECTURA**. Solo ver tableros y reportes. | Gerencia / Auditoría. |

---

## 🔒 3. Seguridad de Base de Datos
Para evitar "hackeos" o errores internos, se aplicaron reglas en Firebase:
*   **Anti-Escalación:** Un técnico NO puede editar su propio rol para volverse Admin.
*   **Protección de Admin:** Solo un Admin puede tocar la colección \`users\`.
*   **Acceso Mínimo:** Los técnicos solo pueden *leer* la lista de compañeros, no editarla.
`
    },
    {
        id: 'command_log',
        title: 'Módulo 9: Bitácora de Comandos (Instalación Total)',
        version: '1.0',
        lastUpdated: '10 Dic 2025',
        category: 'guide',
        status: 'Backup',
        content: `
# 📒 Bitácora de Comandos y Dependencias
**Versión:** 1.0 (Final)
**Estado:** Referencia para Reconstrucción

Esta guía contiene **TODOS** los comandos técnicos ejecutados para construir este proyecto desde cero. Úsala para migrar el sistema o enseñar a un nuevo programador.

---

## 🌎 1. Preparación del Entorno
Antes de escribir una sola línea de código, se instalaron las herramientas base.
\`\`\`bash
# 1. Instalar Node.js LTS (Motor de ejecución)
# Descargar de https://nodejs.org/

# 2. Verificar instalaciones
node -v   # Debe decir v18+
npm -v    # Gestor de paquetes
\`\`\`

---

## 📦 2. Construcción del Frontend (La Web)
Aquí se instaló React y todas las librerías visuales.

### A. Creación del Proyecto
\`\`\`bash
# Crear proyecto con Vite (Moderno y Rápido)
npm create vite@latest frontend -- --template react
cd frontend
\`\`\`

### B. Dependencias Base (Estilos y Rutas)
\`\`\`bash
# Tailwind CSS (Estilos)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# React Router (Navegación entre páginas)
npm install react-router-dom

# Utilidades de Clases (Para lógica condicional CSS)
npm install clsx tailwind-merge
\`\`\`

### C. Dependencias Funcionales (Lógica)
\`\`\`bash
# Firebase (Base de Datos y Auth)
npm install firebase

# Lucide React (Iconos: User, Ticket, Printer...)
npm install lucide-react

# Formularios (Manejo de inputs)
npm install react-hook-form

# Alertas Bonitas (Toasts)
npm install react-hot-toast
\`\`\`

### D. Herramientas Especiales (Features Avanzadas)
\`\`\`bash
# Gráficos de Estadísticas (Dashboard)
npm install chart.js react-chartjs-2

# Generación de Etiquetas (Para Impresión)
# html2canvas: Convierte DIV a Imagen
# jspdf: Convierte Imagen a PDF
# jsbarcode: Dibuja Códigos de Barras
npm install html2canvas jspdf jsbarcode
\`\`\`

---

## 🖨️ 3. Construcción del Print Agent (Servidor Local)
El programa "oculto" que conecta la Nube con el USB.

\`\`\`bash
# Crear carpeta e iniciar proyecto vacío
mkdir print_agent
cd print_agent
npm init -y

# Dependencias Críticas
# firebase: Para leer la cola de impresión
# pdf-to-printer: Para mandar comandos a Windows USB
# dotenv: Para leer claves secretas del archivo .env
npm install firebase pdf-to-printer dotenv
\`\`\`

---

## 🚀 4. Comandos de Despliegue (Subir a Internet)
Herramientas para publicar la Web App real.

\`\`\`bash
# Herramientas de Firebase (Globales)
npm install -g firebase-tools

# Login en Google
firebase login

# Iniciar proyecto (crear firebase.json)
firebase init hosting

# Construir versión optimizada
npm run build

# Subir a la nube
firebase deploy --only hosting
\`\`\`
`
    },
    {
        id: 'ux_ui_refinements',
        title: 'Módulo 10: Mejoras UX/UI',
        version: '1.5',
        lastUpdated: '11 Dic 2025',
        category: 'improvement',
        status: 'Activo',
        content: `
# 📒 Bitácora de Mejoras UX/UI

**Versión:** 1.5
**Última Actualización:** 11 Diciembre 2025
**Estado:** Producción

---

## 🎨 1. Visualización Compacta (Kanban)
Se rediseñó la tarjeta del ticket para maximizar la densidad de información sin perder legibilidad.
*   **Antes:** Tarjetas altas con mucho espacio en blanco y textos redundantes ("Sin motivo especificado").
*   **Ahora:** 
    *   Diseño "Slim" (~20% menos altura).
    *   Grilla de specs (RAM/CPU) en una sola línea compacta.
    *   Eliminación de padding innecesario.

## ⏱️ 2. Detalle de SLA (Pop-up)
Se eliminó la saturación visual de tiempos en la tarjeta principal.
*   **Solución:** Al hacer click en el indicador de tiempo (Footer de tarjeta), se abre un **Modal de Detalle**.
*   **Info:** Muestra fecha exacta de ingreso, deadline, días transcurridos y si está "A Tiempo", "Warning" o "Vencido".

## 📱 3. Experiencia Móvil
El sistema ahora es 100% operativo en smartphones.
*   **Zoom Automático:** Ajuste al 85% para ver más columnas.
*   **Grilla Doble:** En pantallas pequeñas, los tickets se ordenan en 2 columnas.
*   **Menú Consolidado:** Los filtros complejos se agruparon en un botón flotante para limpiar el header.

---
`
    },
    {
        id: 'bulk_operations',
        title: 'Módulo 11: Operaciones Masivas',
        version: '1.0',
        lastUpdated: '11 Dic 2025',
        category: 'feature',
        status: 'Nuevo',
        content: `
# 📒 Bitácora de Operaciones Masivas

**Versión:** 1.0
**Última Actualización:** 11 Diciembre 2025
**Estado:** Producción

---

## 🚀 1. Selección y Acción
Permite a los técnicos procesar lotes de equipos (ej: 10 equipos que pasan de "Ingreso" a "Rápido" juntos).
*   **Activación:** Botón "Seleccionar" en la barra superior.
*   **UI:** Barra flotante inferior (Floating Action Bar) que aparece solo al seleccionar items.
*   **Acciones:** Mover a Columna, QA Masivo.

## ✅ 2. Matriz de QA (Bulk QA)
Interfaz tipo Excel para validar múltiples equipos rápidamente.
*   **Vista:** Filas (Pruebas) x Columnas (Equipos).
*   **Interacción:**
    *   Click en celda: Marca/Desmarca.
    *   Click en cabecera Fila: Marca la prueba para TODOS los equipos.
    *   Click en cabecera Columna: Aprueba TODO el equipo.
*   **Seguridad:** Detecta si un equipo ya tenía avance y avisa para evitar sobrescritura accidental.

---
`
    },
    {
        id: 'security_granular',
        title: 'Módulo 12: Seguridad Granular (Blindaje)',
        version: '2.0',
        lastUpdated: '11 Dic 2025',
        category: 'security',
        status: 'Crítico',
        content: `
# 📒 Bitácora de Seguridad ("Blindaje")

**Versión:** 2.0 (Granular)
**Última Actualización:** 11 Diciembre 2025
**Estado:** Producción

---

## 🛡️ 1. Matriz de Permisos (No solo Roles)
Migramos de roles simples ("Admin", "Tecnico") a un sistema de permisos detallado.
*   **Estructura:** Cada usuario tiene un objeto de permisos: 
    \`{ tickets: { view: true, edit: false }, users: { view: false } ... }\`
*   **Ventaja:** Podemos tener un "Técnico Senior" que puede editar fichas pero NO ver usuarios, o un "Auditor" que puede ver usuarios pero no editar nada.

## 🔒 2. Doble Verificación
*   **Frontend:** El menú lateral y las rutas (\`ProtectedRoute\`) leen estos permisos y ocultan lo que no debes ver.
*   **Backend:** Firestore Rules valida **cada lectura y escritura** contra esta matriz. Aunque alguien intente "hackear" el frontend, la base de datos rechazará la petición si no tiene el permiso \`edit: true\` en ese módulo específico.

---
`
    },
    {
        id: 'infrastructure_roadmap',
        title: 'Módulo 13: Infraestructura & Roadmap',
        version: '1.0',
        lastUpdated: '11 Dic 2025',
        category: 'planning',
        status: 'Planificación',
        content: `
# 📒 Bitácora de Infraestructura

**Versión:** 1.0
**Última Actualización:** 11 Diciembre 2025
**Estado:** Roadmap

---

## 🏗️ 1. Separación de Ambientes
Para evitar "romper" la operación diaria con cambios nuevos.
*   **PROD (Producción):** Solo código estable. Base de datos real.
*   **DEV (Desarrollo):** Base de datos de prueba ("Sandbox"). Aquí rompemos cosas sin miedo.
*   **Estrategia:** Usar variables de entorno (\`.env\`) para que el código sepa automáticamente a qué base conectarse según si estamos en \`localhost\` o en la web.

## 🗺️ 2. Próximos Pasos (Roadmap)
1.  **Edición Masiva de Fichas:** Formulario inteligente para editar Specs de 10 equipos a la vez (detectando si son mismo modelo).
2.  **Impresión Robusta:** Migrar el agente de impresión a una tecnología más estable.
3.  **Notificaciones Push:** Avisar al celular del técnico cuando le asignan un ticket urgente.

---
`
    },
    {
        id: 'batch_mode_session',
        title: 'Módulo 14: Sesión Fixes & Modo Lote',
        version: '1.0',
        lastUpdated: '13 Dic 2025',
        category: 'planning',
        status: 'En Progreso',
        content: `
# 📒 Bitácora de Sesión - 13/12/2025

## Contexto
Sesión enfocada en resolver errores urgentes (Impresión, UX Tablero) y diseñar la nueva funcionalidad de "Ingreso por Lote".

## Cambios Realizados (Fixes)

### 1. Fix Servicio de Impresión (\`printService.js\`)
- **Error**: La vista previa de la etiqueta fallaba al no poder renderizar el componente DOM a imagen.
- **Causa**: Faltaba la importación de la librería \`html2canvas\`.
- **Solución**: Se agregó \`import html2canvas from 'html2canvas';\`.
- **Estado**: ✅ Corregido y verificado.

### 2. Fix Filtros del Tablero (\`KanbanBoard.jsx\`)
- **Error**: El menú desplegable de "Columnas" no era visible en versiones móviles.
- **Causa**: Anidamiento incorrecto dentro de un contenedor \`hidden md:flex\`.
- **Solución**: Se movió el \`Popover\` al contenedor principal del Header.
- **Estado**: ✅ Corregido.

## Diseño Funcional (En Progreso)

### 3. Nuevo Modo de Ingreso por Lote (\`IngresoTicket.jsx\`)
Diseño de lógica para ingreso masivo.

#### Requerimientos:
1.  **Campo Proveedor**: Opcional.
2.  **Modo Lote**: Checkbox que activa flujo masivo.
3.  **Seguridad**: Alerta al cambiar cantidad ("¿Misma RAM/Disco?").
\`\`\`
`
    },
    {
        id: 'smart_print_agent',
        title: 'Módulo 15: Agente de Impresión "Smart"',
        version: '2.0',
        lastUpdated: '14 Dic 2025',
        category: 'feature',
        status: 'Producción',
        content: `
# 📒 Bitácora: Agente de Impresión "Smart" (Node.js)

**Versión:** 2.0  
**Fecha:** 14 Diciembre 2025  
**Estado:** Activo - Auto-Configurable

---

## 🧠 1. Inteligencia de Detección
El script ahora es capaz de "leer" el tamaño de la etiqueta antes de imprimir y reconfigurar el controlador de la impresora al vuelo.

### Lógica de Decisión:
*   **Si (Alto > Ancho):** Asume Etiqueta Técnica (50x70mm) -> Rota 90° (Landscape) -> Imprime.
*   **Si (Ancho > Alto):** Asume Etiqueta Código (50x30mm) -> Mantiene orientación -> Imprime.

---

## 🔌 2. Prompt Cliente Node.js
> "Crea un script que escuche Firestore 'print_jobs'.
> 1.  Descarga el PDF base64.
> 2.  Usa \`pdf-to-printer\`.
> 3.  Si \`job.meta.orientation === 'landscape'\`, inyecta opciones de rotación al driver."
`
    },
    {
        id: 'native_label_system',
        title: 'Módulo 16: Sistema Etiquetas V2 (Nativo)',
        version: '2.0',
        lastUpdated: '14 Dic 2025',
        category: 'core',
        status: 'Estable',
        content: `
# 📒 Bitácora: Motor de Etiquetas Vectorial

**Versión:** 2.0  
**Fecha:** 14 Diciembre 2025  
**Contexto:** Eliminación de \`html2canvas\`.

---

## 🎨 1. De "Foto" a "Dibujo"
El sistema antiguo tomaba una "foto" a la pantalla para imprimir. Esto fallaba si el PC era lento o la pantalla estaba oculta.
El nuevo sistema **Dibuja Matemáticamente** el PDF usando coordenadas (mm).

## 🚀 2. Ventajas
- **100% Fiable:** No depende de la tarjeta gráfica ni del navegador.
- **Background:** Funciona incluso con la pestaña minimizada.
- **Calidad:** Vectores puros, código de barras nítido (no pixelado).
`
    },
    {
        id: 'ecommerce_bridge',
        title: 'Módulo 17: Puente E-commerce (Plan)',
        version: '0.1',
        lastUpdated: '19 Dic 2025',
        category: 'planning',
        status: 'Diseño',
        content: `
# 📒 Bitácora: Integración Estratégica E-commerce

**Estado:** En Diseño  
**Objetivo:** Transformar el Taller en una "Fábrica de Productos" para la web.

---

## 🌉 1. El "Puente" (The Bridge)
Conectará la base de datos operativa (Firestore) con la vitrina de ventas (WooCommerce/Shopify).
- **Trigger:** Botón "Vendido" o "Publicar" en la App.
- **Acción:** Push a API de WooCommerce.
- **Datos:** Fotos, Specs (CPU/RAM/SSD) y Precio.

## 🧠 2. IA Copywriter
Se planea integrar un modelo LLM para que **escriba la descripción de venta** automáticamente basada en las piezas del equipo.

## 📊 3. ROI en Tiempo Real
El módulo de "Ventas" calculará automáticamente:
- Costo de Adquisición.
- Costo de Reparación (Horas Técnico + Repuestos).
- Margen Real (Neto de IVA).
`
    },
    {
        id: 'sales_dashboard',
        title: 'Módulo 18: Dashboard Comercial',
        version: '1.0',
        lastUpdated: '19 Dic 2025',
        category: 'feature',
        status: 'Producción',
        content: `
# 📒 Bitácora: Dashboard Comercial (Ventas)

**Versión:** 1.0  
**Fecha:** 19 Diciembre 2025  
**Estado:** Producción (Solo Admin)

---

## 📊 1. Objetivo
Proveer una vista financiera clara de la operación, separada del flujo técnico. Estabiliza el proceso de "Venta" sacando los tickets del Kanban operativo.

## 🏗️ 2. Componentes Clave
1.  **KPI Cards:** Venta Bruta, Utilidad Neta, IVA (19%) y Costos.
2.  **Tabla de Transacciones:** Listado filtrable de tickets vendidos.
3.  **Seguridad:** Accesible estrictamente por Rol 'Admin' (\`/sales\`).

## 🔄 3. Lógica de "Vendido"
Un ticket se considera vendido y desaparece del Tablero Taller cuando:
*   Se completa el form de salida final.
*   Status = \`Closed\`.
*   CurrentArea = \`Ventas\`.
`
    },
    {
        id: 'incident_report_002',
        title: 'Reporte Incidente: Crash Firestore',
        version: '1.0',
        lastUpdated: '19 Dic 2025',
        category: 'error',
        status: 'Resuelto',
        content: `
# 🚨 Reporte de Incidente: Crash Firestore

**Fecha:** 19 Diciembre 2025  
**Criticidad:** CRÍTICA (Bloqueo de Inicio)  
**Estado:** ✅ RESUELTO

---

## 🛑 1. Descripción
La aplicación entró en un bucle de error al cargar: \`FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state\`.

## 🔍 2. Causa Raíz
Corrupción de la base de datos local (IndexedDB) de Firebase SDK por HMR.

## 🛠️ 3. Solución Implementada
Se desactivó la persistencia en disco (\`enableMultiTabIndexedDbPersistence\`) en \`firebase.js\`.
`
    }
];
