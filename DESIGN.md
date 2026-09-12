# Fondo Común — Workspaces

## Overview

Extensión de la aplicación existente para gestionar fondos de ahorro independientes.
Conserva la identidad navy/cyan y el acceso al fondo original mediante el selector.
La interfaz está en español y presenta importes en pesos colombianos (COP).
Los fondos compartidos ofrecen consulta por enlace y administración por clave del fondo, sin cuentas individuales.
Los fondos locales se identifican en el selector y mediante el estado de guardado.
La secuencia principal es seleccionar fondo, consultar saldo y meta, y revisar o administrar movimientos.

## Colors

- Fondo base: `#0b0f19`; superficie del workspace: `#121a2b`.
- Texto principal: `#f8fafc`; texto secundario: `#94a3b8`.
- Cyan heredado para acentos, foco y pestaña activa: `#06b6d4`.
- Botón primario: `#0e7490`; hover: `#155e75`; texto: `#ffffff`.
- Contraste del texto blanco: 5,358:1 en reposo y 7,267:1 en hover; ambos cumplen AA para texto normal.
- Aportes y estados positivos: `#6ee7b7`; gastos y errores: `#fda4af`.
- Advertencia de fecha: `#fcd34d`; barra de progreso: `#10b981`.
- Bordes heredados: blanco al 8 % de opacidad.

## Typography

- Familias declaradas: Inter para la interfaz y Outfit para encabezados y saldo, con respaldo sans-serif.
- Título del fondo: `clamp(1.65rem, 3vw, 2.4rem)`.
- Saldo principal: `clamp(2rem, 4vw, 3.5rem)`, peso 700 y altura de línea 1,2.
- Importes y totales usan cifras tabulares; los campos del diálogo usan texto de `1rem`.
- El texto auxiliar utiliza tamaños entre `0.8rem` y `0.9rem`.

## Layout

- Barra superior con selector y acciones de apertura y creación; ancho máximo de 1400 px.
- Contenido centrado de hasta 1280 px: cabecera, resumen de ahorro, acciones y registro.
- Resumen en dos columnas en escritorio; a 900 px o menos se apila y los indicadores forman dos columnas.
- A 600 px o menos, el contenido tiene márgenes interiores laterales de `1rem`, las acciones se redistribuyen y los formularios pasan a una columna.
- Los movimientos móviles colocan el importe debajo del concepto y mantienen la acción a la derecha.
- Diálogos de hasta 560 px, limitados por el viewport, con desplazamiento vertical interno.
- Radios heredados: 8 px en controles pequeños, 14 px en botones y campos, 20 px en paneles y diálogos.

## Components

- Selector de workspace con etiqueta y enlace de salto al contenido activo.
- Cabecera con nombre, estado de sincronización, exportación y acceso o salida de administrador; compartir aparece en fondos remotos.
- Resumen con saldo neto, meta, importe restante, progreso, fecha opcional y desglose de aportes, gastos, cuota e integrantes.
- Registro con vistas de movimientos e integrantes, búsqueda y filtros por tipo y mes.
- Acciones administrativas para registrar aportes y gastos, gestionar integrantes, configurar y cambiar claves.
- Diálogos para creación, apertura, acceso, edición y enlace de consulta.
- Mensajes de estado y error mediante `role="status"` y `role="alert"`; progreso con nombre accesible.
- Botones del workspace y controles de formulario con altura mínima de 44 px; foco visible de 2 px.
- Las reglas de movimiento reducido desactivan animaciones y transiciones dentro de la extensión.
