/** Variables de despliegue del API (backend/.env). */
export const PORT = Number(process.env.PORT || 3002);

export const API_PREFIX = String(process.env.API_PREFIX || "storeapi").replace(/^\/+|\/+$/g, "");
