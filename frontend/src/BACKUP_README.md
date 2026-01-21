# Bitácora de Respaldo - Etiqueta Ingreso (50x30mm)
**Fecha:** 16 de Diciembre 2025
**Estado:** FUNCIONANDO PERFECTO (0° Rotación)

## Descripción
El usuario confirmó que la impresión de la etiqueta de ingreso (Simple/50x30mm) funciona perfectamente con la configuración actual (Rotación 0° en impresora y PDF).

Para garantizar que este funcionamiento no se pierda por futuros cambios, se ha creado un respaldo inmutable del componente.

## Archivos de Respaldo
- **Componente Blindado:** `src/components/PrintLabelInitial_WORKING_BACKUP.jsx`
- **Uso:** En caso de emergencia o si la versión principal se rompe, restaurar el contenido de este archivo en `PrintLabelInitial.jsx`.

## Instrucciones para Restaurar
1. Copiar todo el código de `PrintLabelInitial_WORKING_BACKUP.jsx`.
2. Pegarlo en `src/components/PrintLabelInitial.jsx`.
3. No modificar la lógica de renderizado ni los estilos base.

## Notas Técnicas
- El componente asume que la rotación se maneja externamente o no es necesaria si el papel está configurado correctamente en el driver.
- Dimensiones base: 400px x 240px (aprox 50x30mm).
- Código de barras: CODE128.
