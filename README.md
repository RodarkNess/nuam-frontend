# NUAM · Gestión y trazabilidad tributaria

Interfaz web React para el mantenedor tributario; API Django en el proyecto vecino `nuam-backend`. El alcance implementado sigue el MVP de los documentos de propósito y brainstorming: expedientes, búsqueda, integridad documental, aprobaciones, RBAC y auditoría.

## Desarrollo local

```powershell
npm install
npm run dev
```

La API local usa `http://127.0.0.1:8000/api/v1` por defecto. Para cambiarla, define `VITE_API_BASE_URL` en `.env.local` (consulta `.env.example`). Configura el backend y Supabase en `nuam-backend/.env`; los valores de acceso nunca deben guardarse en Git.

El backend se ejecuta con `python manage.py runserver` desde `nuam-backend`. La guía de instalación, variables, migración aditiva y pruebas está en [`nuam-backend/README.md`](../nuam-backend/README.md).

## Roles

- **Operador:** consulta, crea y modifica expedientes; carga de archivos.
- **Supervisor:** funciones de operación, aprobaciones, borrado lógico y auditoría.
- **Auditor:** lectura de expedientes y bitácora.
- **Administrador:** acceso al panel de usuarios y asignación de roles; solo administradores pueden crear cuentas.

Los permisos se validan en la API; ocultar una opción en la interfaz no sustituye la autorización del servidor.

## Alcance y límites

Los PDF sitúan OCR, integraciones externas, operación multipaís y cargas masivas avanzadas fuera del MVP. La carga masiva está deshabilitada hasta que exista validación real de archivos y filas; no escribe datos ficticios. El envío local de 2FA usa el backend de consola hasta configurar SMTP; para entregar códigos a una bandeja real, configura las variables SMTP descritas en el README del backend.
