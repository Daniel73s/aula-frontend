export const environment = {
  production: true,
  // Si el frontend y el backend comparten dominio (con proxy inverso), deja los valores por defecto.
  // Si el backend está en otro dominio, sustituye por su URL pública, sin barra final. Ejemplo:
  //   apiUrl: 'https://aula-backend.onrender.com/api',
  //   socketUrl: 'https://aula-backend.onrender.com',
  apiUrl: 'https://aula-backend-dgf9.onrender.com/api',
  socketUrl: 'https://aula-backend-dgf9.onrender.com',
};
