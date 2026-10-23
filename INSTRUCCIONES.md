# Control del Campo: puesta en marcha (unos 30 minutos, una sola vez)

Todo es gratis. Necesitas: tu cuenta de Google (anabalondiego@gmail.com), una cuenta de GitHub gratuita y el Gmail de Yolanda (veasrodriguezyolanda@gmail.com).

## Parte 1. Crear la base de datos en Firebase

1. Entra a https://console.firebase.google.com con tu cuenta de Google y toca **Crear un proyecto**. Nombre: `control-campo`. Desactiva Google Analytics. Toca **Crear proyecto**.
2. Menú izquierdo, **Compilación > Authentication > Comenzar**. En "Proveedores de acceso" elige **Google**, actívalo, escribe tu correo como correo de asistencia y **Guardar**.
3. **Compilación > Firestore Database > Crear base de datos**. Ubicación: `southamerica-east1` (São Paulo). Elige **Iniciar en modo de producción** y crea.
4. En Firestore, pestaña **Reglas**: borra todo el texto, pega el contenido del archivo `firestore.rules` de esta carpeta y toca **Publicar**.
5. Engranaje (arriba a la izquierda) > **Configuración del proyecto** > bajando, "Tus apps" > icono **</>** (web). Nombre `campo`, no marques Hosting, **Registrar app**. Verás un bloque `firebaseConfig` con `apiKey`, `authDomain`, `projectId`, `appId`. Déjalo a mano.
6. Abre el archivo `firebase-config.js` con el Bloc de notas, reemplaza los cuatro textos `PEGAR_AQUI` por esos valores (entre comillas) y guarda.

## Parte 2. Publicar la app con GitHub Pages

1. Crea una cuenta en https://github.com (gratis) y toca **New repository**. Nombre `campo`, visibilidad **Public**, **Create repository**.
2. En la página del repositorio toca **uploading an existing file** y arrastra TODOS los archivos de esta carpeta (ya con `firebase-config.js` completado). Abajo toca **Commit changes**.
3. **Settings > Pages**. En "Branch" elige `main` y carpeta `/ (root)` y **Save**. Espera 1 o 2 minutos: arriba aparece la dirección, algo como `https://TU-USUARIO.github.io/campo/`. Esa es la dirección de la app.
4. Vuelve a Firebase: **Authentication > Configuración > Dominios autorizados > Agregar dominio**: `TU-USUARIO.github.io` (solo eso, sin `https://` ni `/campo`).

## Parte 3. Autorizar a Yolanda

1. En Firebase, **Firestore Database > Datos > Iniciar colección**. ID de la colección: `config`. ID del documento: `roles`.
2. Agrega el campo `admins`, tipo **array**, con un elemento de texto: el Gmail de Yolanda, que es `veasrodriguezyolanda@gmail.com` (en minúsculas, tal cual). Agrega también el campo `members`, tipo array, vacío (si no deja guardar vacío, pon un correo de ejemplo). **Guardar**.
   - `admins` = personas que gestionan (Yolanda). `members` = personas que solo registran su trabajo.

## Parte 4. Probar

1. En tu teléfono abre la dirección de la app en Chrome, toca **Entrar con Google** con tu correo y escribe tu nombre. La primera vez se cargan solos los sectores y productos del campo.
2. Para instalarla: menú de Chrome (tres puntos) > **Instalar aplicación** (o "Agregar a la pantalla principal").
3. Envía la dirección a Yolanda por WhatsApp. Ella la abre en Chrome, entra con su Gmail, escribe su nombre e instala igual.

## Cosas que debes saber
- Si alguien ve "Sin acceso todavía", su correo no está en `config/roles`. Agrégalo y que vuelva a abrir.
- La clave que va en `firebase-config.js` no es secreta; la protección real son las reglas del paso 4.
- Sin señal, la app guarda en el teléfono y envía los datos al volver la conexión.
- Cuando te entregue una versión nueva, en GitHub entra al repositorio > **Add file > Upload files**, arrastra los archivos nuevos (no el `firebase-config.js`) y **Commit changes**. En el teléfono de Yolanda se actualiza sola al abrirla.
- Los datos de prueba hechos dentro de Claude no pasan a esta versión; los sectores y productos sí se cargan solos.
