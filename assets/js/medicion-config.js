// Configuración local; la publicación requiere una autorización separada.
// No poner contraseñas, API keys ni secretos en este archivo público.
export const measurementConfig = Object.freeze({
  enabled: true,
  // ID público de medición, nunca una llave API o un secreto.
  ga4MeasurementId: "G-Y7STNGLS94",
  loadGoogleTag: true
});
