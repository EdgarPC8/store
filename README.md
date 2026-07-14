# Store (SoftEd)

App SoftEd basada en la plantilla EdDeli.

- **Backend:** `backend/` — API Express + Sequelize + MySQL  
  - Prefijo API: `storeapi`  
  - Base de datos: `store`  
  - Puerto local por defecto: `3002`
- **Frontend:** la UI es la **compilación** (build estático). Colocá el output en `frontend/` (o servilo con Apache/`BASE_PATH=/store/`).

## Arranque rápido (backend)

```bash
# 1. Crear BD (MySQL)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Configurar entorno
cp backend/.env.example backend/.env

# 3. Dependencias + API
cd backend
npm install
npm run dev
```

Health check: `http://127.0.0.1:3002/storeapi/` (según rutas montadas).

## Entitlement (gestor SoftEd)

Mismo flujo que EdDeli: el gestor hace `PUT /storeapi/subscription/entitlement` con `GESTOR_SYNC_SECRET`.
