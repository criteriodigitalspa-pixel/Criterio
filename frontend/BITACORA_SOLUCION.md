# 🛡️ Bitácora de Solución: Sistema de Invitaciones y Sincronización

**Fecha:** 14 de Enero, 2026
**Autor:** Antigravity (IA Assistant) & Equipo de Desarrollo
**Estado:** ✅ Resuelto

---

## 1. El Problema Detectado 🚨
Los usuarios reportaban un error persistente al intentar invitar colaboradores a un Proyecto o Área de Negocio:
> *"No tienes permisos para invitar en esta área"* o *"Missing or insufficient permissions"*

Además, se generó un error crítico (`FIRESTORE INTERNAL ASSERTION FAILED`) que "crasheaba" la aplicación al recargar.

## 2. Diagnóstico Técnico 🔍

La causa raíz fue una **"Tormenta Perfecta"** de 3 factores combinados:

1.  **Reglas de Seguridad Incompletas:** Firestore estaba configurado por defecto (`allow read, write: if true`) para colecciones antiguas, pero las nuevas colecciones (`projects`, `project_areas`, `tasks`) **no existían** en las reglas, cayendo en el bloqueo por defecto (`allow write: if false`).
2.  **Sincronización "Fantasma" (Zombie Data):** Al trabajar offline o sin reglas, el sistema creaba items "Locales". Al intentar subirlos automáticamente ("Auto-Healing"), se copiaban datos corruptos antiguos (ej: `ownerId` vacío o incorrecto). Esto hacía que, aunque el item llegaba a la nube, **nadie era dueño de él**, bloqueando cualquier edición futura.
3.  **Race Condition en Listeners:** La aplicación intentaba reconectar a Firestore demasiado rápido ante cambios menores en la sesión del usuario, saturando el SDK y provocando el crash interno.

## 3. La Solución Implementada 🛠️

Se aplicó una corrección en 3 capas ("Defense in Depth"):

### Capa 1: Reglas de Seguridad (Servidor)
Se actualizaron las reglas de Firestore (`firestore.rules`) para reconocer explícitamente las nuevas estructuras:
```javascript
match /projects/{projectId} {
  allow create: if request.auth != null; // Cualquiera logueado crea
  allow update: if resource.data.ownerId == request.auth.uid; // Solo el dueño edita
}
```

### Capa 2: Auto-Reparación Inteligente (Frontend)
Se modificó `taskService.js` para curar los datos al vuelo.
- **Antes:** Copiaba ciegamente lo que había en LocalStorage (erróneo).
- **Ahora (`syncLocalArea`):** Fuerza la autoría al momento de subir.
  > *"Si YO estoy sincronizando esto ahora, YO soy el dueño (`ownerId = me`)."*

### Capa 3: Estabilidad de Conexión
Se optimizó `TaskManager.jsx` para que solo reinicie las conexiones a la base de datos si el **ID único (UID)** del usuario cambia, ignorando otros refrescos de token irrelevantes.
`useEffect(..., [user?.uid])` en lugar de `[user]`.

### Capa 4: Jerarquía Automática (Cascada)
Se implementó la herencia de permisos en dos direcciones:
1.  **Hacia Abajo (Invitación):** Al invitar a un Área, el sistema busca todos sus proyectos hijos y agrega al usuario automáticamente.
2.  **Hacia Abajo (Creación):** Al crear un **nuevo** proyecto dentro de un Área compartida, el proyecto nace automáticamente con todos los miembros del Área ya asignados.

---

## 4. Instrucciones para el Equipo 📋

Si vuelven a ver duplicados o items "pegados":
1.  **No se asusten.** El sistema ya está protegido.
2.  **Limpien Caché:** Borrar "Datos del Sitio" (Application -> Clear Site Data) una sola vez elimina los "fantasmas" antiguos.
3.  **Inviten con Confianza:** El sistema ahora detecta si el item es local y lo "promueve" a la nube automáticamente antes de enviar la invitación.

---
*Fin del reporte.*
