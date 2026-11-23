# NUAM · Versión 1.0

Interfaz web React para el mantenedor tributario de NUAM en Operación Chile / SII. El frontend consume la API Django de `nuam-backend` y administra expedientes, integridad documental, aprobaciones, auditoría y usuarios.

El esquema de datos lo gestionan las migraciones de Django en `nuam-backend`; este repositorio no contiene ni requiere un esquema SQL separado.

## Desarrollo local

```powershell
npm install
npm run dev
```

La API local usa `http://127.0.0.1:8000/api/v1` por defecto. Para usar otra URL, define `VITE_API_BASE_URL` en `.env.local` según `.env.example`.

Inicia Django desde `nuam-backend`:

```powershell
python manage.py migrate
python manage.py runserver
```

La configuración de variables, Supabase, Storage y migraciones se describe en [`nuam-backend/README.md`](../nuam-backend/README.md). Las credenciales privadas nunca deben guardarse en Git.

## Funcionalidades de la versión 1.0

- Autenticación JWT y verificación en dos pasos.
- CRUD completo de expedientes tributarios con borrado lógico.
- Búsqueda por RUT, folio, emisor, año, tipo y estado.
- Carga masiva habilitada desde archivos `.xlsx` y `.csv`, con límite de 25 MB, vista previa de errores y confirmación en base de datos.
- Carga y descarga de PDF de hasta 25 MB con verificación SHA-256.
- Bandeja de aprobaciones con decisión, comentario obligatorio y actualización del expediente.
- Bitácora de auditoría con exportación real a CSV.
- Administración de cuentas, roles y estado activo.

## Despliegue en Vercel

En producción, el frontend puede usar el proxy `api/v1/[...path].js` o conectarse directamente al backend.

Configura estas variables en el proyecto de Vercel del frontend:

- `NUAM_BACKEND_URL`: URL pública del backend Django.
- Opcional: `VITE_API_BASE_URL`: URL directa del backend, incluyendo `/api/v1`.

Ejemplo:

```text
NUAM_BACKEND_URL=https://tu-backend.vercel.app
VITE_API_BASE_URL=https://tu-backend.vercel.app/api/v1
```

No uses una URL de Supabase como `VITE_API_BASE_URL`; Django expone todos los endpoints de `/api/v1`.

## Roles

- **admin:** administra usuarios, roles y cuentas.
- **operador:** consulta, crea y modifica expedientes y participa en cargas masivas.
- **supervisor:** gestiona expedientes, resuelve aprobaciones y consulta la auditoría.

Los permisos se verifican en el backend. Ocultar una opción en la interfaz no sustituye la autorización del servidor.

## Operación Chile / SII

La aplicación usa como contexto exclusivo Chile y mantiene trazabilidad completa de registros, aprobaciones, descargas y cambios. Los documentos originales se conservan y su integridad se verifica mediante SHA-256.
