// Configuración central del servidor.
// En producción, define estas variables en el entorno.
export const PORT = process.env.PORT || 4000
export const JWT_SECRET =
  process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion'
export const TOKEN_EXPIRES_IN = '7d'
