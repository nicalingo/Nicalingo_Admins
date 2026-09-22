# Sistema de Autenticación y Panel de Administración NicaLingo / Sinskira

## Descripcion
Interfaz web y de autenticación desarrollada para el sistema educativo NicaLingo bajo la identidad visual de Sinskira. Permite el acceso seguro de usuarios administradores y editores a las herramientas de gestión de contenidos y configuración del sistema, incorporando una paleta de colores corporativa y control de errores mediante componentes visuales interactivos.

## Funciones
* Autenticación segura de usuarios mediante correo electrónico y contraseña utilizando Supabase Auth.
* Control de acceso basado en roles (RBAC) para restringir el ingreso exclusivamente a cuentas con permisos de administrador o editor.
* Manejo de errores visuales interactivos a través de un modal flotante con la mascota del sistema, evitando alertas nativas del navegador.
* Alternar la visibilidad de la contraseña ingresada en el formulario de inicio de sesión mediante un icono interactivo.
* Diseño responsive adaptable tanto para dispositivos móviles como para pantallas de escritorio en formato de tarjeta horizontal.

## Estructura
* `index.html`: Vista principal que contiene la estructura del formulario de inicio de sesión y el logotipo de Sinskira.
* `stylesheet.css`: Archivo de estilos encargado de definir el diseño adaptativo, la distribución de contenedores y las variables corporativas como el Verde Salvia y el Green.
* `script.js`: Módulo JavaScript que gestiona la comunicación con Supabase, la validación de roles y la lógica del modal de errores de Coco Ups.

## Tecnologias Utilizadas
* HTML5
* CSS3 (Flexbox, Media Queries y Variables CSS)
* JavaScript (ES Modules)
* Supabase JS Client (v2)
* FontAwesome (Iconografía)

## Configuracion
1. Asegurar la ejecución del proyecto mediante un servidor local (como Live Server en Visual Studio Code).
2. Configurar las credenciales oficiales del proyecto en el archivo `script.js` con la URL y la llave pública de Supabase:
   ```javascript
   const SUPABASE_URL = 'tu-url-de-supabase';
   const SUPABASE_PUBLISH_KEY = 'tu-key-publica';