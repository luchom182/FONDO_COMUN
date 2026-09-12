# Fondo Común

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Integrantes de fondos de ahorro colectivo y sus administradores. Los integrantes consultan; el administrador registra aportes y gastos con una clave propia del workspace.

## Product Purpose

Gestionar varios fondos independientes en una misma aplicación, conocer el ahorro disponible y su avance hacia una meta, y compartir la consulta mediante un enlace.

## Operating Context

Aplicación React/Vite existente, en español y pesos colombianos, con Firebase y almacenamiento local. El fondo original de Almacén-Logística dispone de cuotas quincenales, cumpleaños, recordatorios por WhatsApp, gastos y exportación Excel.

## Capabilities and Constraints

- Cada workspace tiene nombre, meta, cuota, integrantes y movimientos propios.
- El usuario confirmó fondos independientes y administración por clave, sin cuentas individuales de integrantes.
- Se mantiene el fondo original y su historial.
- Los fondos compartidos requieren persistencia remota y autorización de las escrituras; los fondos locales se identifican explícitamente como tales.
- El diseño de la nueva funcionalidad hereda los componentes y la identidad de la aplicación existente.
