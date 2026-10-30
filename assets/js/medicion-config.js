// Preparación local. Activar solo después de revisión, aprobación y receptor comprobado.
// No poner contraseñas, API keys ni secretos en este archivo público.
export const measurementConfig = Object.freeze({
  enabled: false,
  // Identificador público de una propiedad GA4 existente y autorizada, si se elige esa vía.
  // Este código no instala Google Analytics ni crea/configura cuentas o propiedades.
  existingGa4MeasurementId: ""
});
