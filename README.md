# 📊 Fondo Común - Control Presupuestal (Almacén - Logística)

Aplicación Web ultramoderna para la gestión, control presupuestal y transparencia de aportes y gastos del **Fondo Común de Almacén-Logística (20 Integrantes)**.

---

## 🌟 Características Principales

* 📊 **Control de Aportes Quincenales**: Gestión de cuotas fijas de $10.000 COP por quincena (Cortes el Día 5 y Día 20).
* 💬 **Chat Directo WhatsApp**: Al presionar sobre el número de celular de cualquier integrante se abre el chat directo por WhatsApp con un mensaje de saludo predefinido.
* 🏆 **Barra de Meta Colectiva del Mes**: Indicador en tiempo real del progreso de recaudación mensual ($400.000 COP meta por mes).
* ⚠️ **Módulo Dedicado de Pendientes por Pagar**: Aísla con 1 clic a las personas que tienen saldos pendientes en el mes activo.
* 💸 **Registro Transparente de Gastos**: Detalle de egresos con fecha, categoría, concepto y monto.
* 🔐 **Panel de Administrador Seguro**: Modificación protegida de pagos, gastos y credenciales.
* 🔑 **Cambio y Recuperación de Contraseña**: Permite al administrador actualizar su clave y su Clave Secreta de Recuperación.
* 📁 **Exportación a Excel**: Descarga de reportes actualizados en formato `.xlsx`.
* 🛡️ **Resistencia a Errores & ErrorBoundary**: Interfaz blindada a prueba de fallos con soporte offline mediante `localStorage`.

---

## 📖 Instructivo de Uso

### 👥 1. Instructivo para Integrantes / Usuarios Públicos

1. **Consultar Aportes del Mes**:
   - En la página principal, selecciona el mes a auditar (ej. *Julio*) en el menú desplegable.
   - Observa la tabla donde verás quiénes están al día y quiénes tienen cuotas pendientes ($10.000 COP).
2. **Chat Directo con Integrantes (Exclusivo Administrador)**:
   - Haz clic sobre el número celular de cualquier participante para abrir un chat de WhatsApp con mensaje predefinido (Requiere inicio de sesión como Administrador).
3. **Ver Integrantes Pendientes**:
   - Haz clic en el botón u opción **"Ver Pendientes"** para consultar únicamente la lista de compañeros con saldo pendiente.
4. **Enviar Recordatorio de Pago (Exclusivo Administrador)**:
   - Presiona **"Recordatorio"** junto al nombre de una persona pendiente para enviarle la información de su cuota (Exclusivo para el Administrador).
5. **Ver Gastos Justificados**:
   - Ingresa a la pestaña **"Registro de Gastos"** para fiscalizar en qué se ha invertido el dinero del fondo.
6. **Descargar Copia en Excel**:
   - En la barra superior, haz clic en **"Exportar Excel"** para guardar el informe oficial en tu PC o teléfono.

---

### 🔐 2. Instructivo para el Administrador

1. **Iniciar Sesión**:
   - Haz clic en **"Acceso Administrador"** en la barra superior e ingresa tu contraseña confidencial.
2. **Marcar o Cambiar Pagos**:
   - Con el modo admin activo, haz clic directamente sobre cualquier casilla de cuota (Día 5 o Día 20) en la tabla para marcarla como **Pagado ($10.000)** o **Pendiente**.
3. **Registrar un Nuevo Gasto**:
   - Presiona **"Registrar Nuevo Gasto"** en la sección de gastos o admin e ingresa el concepto y valor.
4. **Cambiar Contraseña**:
   - Una vez iniciada la sesión, presiona el botón **"Cambiar Clave"** en la barra superior.
   - Te permite actualizar tu contraseña y definir tu **Clave Secreta de Recuperación**.
5. **Recuperar Contraseña Olvidada**:
   - En la ventana de login, presiona **"¿Olvidaste tu contraseña?"** e ingresa tu clave secreta de recuperación para restablecer el acceso de forma segura.

---

## 🚀 Despliegue Online 100% Gratuito

### Opción A: Despliegue en Vercel (Recomendado)
1. Instala Vercel CLI o conecta tu repositorio en [vercel.com](https://vercel.com).
2. Ejecuta en la terminal:
   ```bash
   npx vercel
   ```
3. Obtendrás un enlace público permanente tipo `https://tu-fondo-comun.vercel.app` de forma 100% gratuita.

### Opción B: Despliegue en Netlify
1. Compila la aplicación: `npm run build`.
2. Sube la carpeta `dist` generada a [Netlify Drop](https://app.netlify.com/drop).
