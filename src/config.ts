/**
 * Configuración de marca. El nombre está aquí a propósito: aún no hay dominio
 * cerrado, así que cambiarlo debe ser una sola edición.
 *
 * Los textos traducibles (tagline, claim, puntos de privacidad) están en
 * `src/i18n/locales/*`; aquí solo queda lo que no depende del idioma.
 */
export const APP = {
  /** Nombre comercial. Cambiar aquí cuando se cierre el dominio. */
  name: 'SofaPDF',
  /** Se usa en el <title> y en el pie. */
  legalName: 'SofaPDF',
  /** Dominio provisional; solo texto, no se hace ninguna petición a él. */
  domain: 'sofapdf.com',
  year: new Date().getFullYear(),
  repoUrl: '',
  /** Enlace externo: no carga nada, solo se navega si el usuario lo pulsa. */
  kofiUrl: 'https://ko-fi.com/adgllorente',
} as const
