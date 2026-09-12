# 📊 Fondo Común - Control Presupuestal (Almacén - Logística)

Aplicación Web ultramoderna para la gestión, control presupuestal y transparencia de aportes y gastos del **Fondo Común de Almacén-Logística (20 Integrantes)**.

---

## Workspaces de ahorro común

La barra **Workspace** permite cambiar entre el fondo original y nuevos fondos independientes.

1. Pulsa **Nuevo workspace** y define nombre, meta de ahorro, cuota sugerida y fecha objetivo opcional.
2. Elige dónde guardar el fondo y define su clave de administrador y su clave de recuperación (mínimo 8 caracteres).
3. Añade integrantes y registra sus aportes. La cuota se propone como monto inicial y se puede ajustar en cada aporte.
4. Registra los gastos: el avance de la meta usa el saldo neto, **aportes menos gastos**.
5. Consulta movimientos por mes, tipo o búsqueda; revisa los acumulados de cada integrante y exporta el workspace a Excel.
6. En un workspace compartido, **Compartir** copia el enlace de consulta. La administración requiere la clave de ese fondo.

### Local y compartido

- **Local:** funciona inmediatamente; datos y claves se guardan en este navegador. No se comparte entre dispositivos ni se convierte automáticamente en un fondo remoto. La exportación Excel permite conservar un reporte.
- **Compartido:** datos en Firestore, consulta por enlace y cambios autorizados mediante Cloud Functions. El directorio del selector guarda los fondos creados o abiertos en cada navegador; no publica un listado global.
- Cambiar de workspace cambia también el contexto de administración. Las sesiones compartidas duran 8 horas; cambiar o recuperar las claves invalida las sesiones anteriores.
- Si un fondo compartido pierde conexión, la copia disponible queda en modo consulta. Las escrituras fallidas muestran un error y no se presentan como sincronizadas.
- Cada workspace admite hasta 150 integrantes y 1.500 movimientos, con un límite adicional de tamaño para respetar la capacidad de un documento Firestore.

### Ejecutar en desarrollo

Requiere Node.js 22 o 24. Desde la carpeta de este repositorio:

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173`. Para trabajar sin conectar el fondo original a Firebase, crea `.env.local` con:

```dotenv
VITE_FIREBASE_ENABLED=false
VITE_WORKSPACES_CLOUD_ENABLED=false
```

### Habilitar workspaces compartidos en Firebase

1. Copia los campos de `env.example.txt` a `.env.local` y coloca la configuración del proyecto Firebase que administras. No reutilices la configuración de otro proyecto.
2. Instala las dependencias del backend: `npm ci --prefix functions`. Las funciones usan el runtime Node.js 22.
3. Integra las reglas de `savings_workspaces`, `workspace_secrets` y `workspace_attempts` de `firestore.rules` con las reglas de tu proyecto. El bloque `fondo_comun/app_data` reproduce la compatibilidad del fondo original, cuya clave se valida en el cliente; revisa ese bloque antes de sustituir reglas existentes. Los nuevos workspaces rechazan toda escritura directa y mantienen las claves fuera del documento público.
4. Despliega las funciones y las reglas revisadas con Firebase CLI (Cloud Functions requiere un proyecto con plan Blaze):

```bash
firebase deploy --only functions:savings-workspaces,firestore:rules --project TU_PROJECT_ID
```

5. Establece `VITE_WORKSPACES_CLOUD_ENABLED=true`, reinicia Vite o recompila con `npm run build`, y publica `dist` en tu hosting. Para conectar el fondo original al mismo entorno, retira `VITE_FIREBASE_ENABLED=false`.
6. Crea un nuevo workspace eligiendo **Compartido · Firebase**. Los enlaces tienen la forma `https://tu-app/?workspace=UUID` y permiten consultar integrantes, celulares registrados y movimientos.

Las claves remotas se derivan con scrypt y las sesiones se firman por workspace. Las actualizaciones usan transacciones y revisión de versión para detectar ediciones simultáneas. No se despliega ningún cambio automáticamente al ejecutar `npm run build`.

### Validación de la función

```bash
npm test
npm run build
firebase emulators:exec --only firestore,functions --project demo-fondo-workspaces "node scripts/workspaces-emulator-check.mjs"
```

La prueba de emuladores requiere Java 21 o superior, Firebase CLI y las dependencias de `functions`. Usa únicamente el proyecto de demostración. En equipos donde el descubrimiento de funciones tarde más de 10 segundos, establece `FUNCTIONS_DISCOVERY_TIMEOUT=60` en el entorno.

### Archivos principales

- `src/WorkspaceApp.jsx`: selector, navegación y creación de workspaces.
- `src/hooks/useWorkspace.js`: carga, sesiones y operaciones del fondo activo.
- `src/components/organisms/`: panel, integrantes, formularios e historial de ahorro.
- `src/services/workspaceStorage.js` y `workspaceCloud.js`: persistencia local y Firebase.
- `functions/`: reglas financieras, sesiones y operaciones remotas autorizadas.

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
