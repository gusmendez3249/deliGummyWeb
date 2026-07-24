# DeliGumy - Frontend Web

Sistema de interfaz de usuario responsiva y panel interactivo (POS y Dashboard) para la gestión comercial y de inventario de **DeliGumy**.

## 🚀 Tecnologías y Herramientas
* **Framework:** React con TypeScript
* **Herramienta de Construcción:** Vite
* **Estilos (CSS):** Tailwind CSS
* **Iconografía:** Lucide React
* **Gráficos:** Chart.js con React-Chartjs-2
* **Peticiones HTTP:** Axios

## 📋 Requisitos Previos
* Node.js v18 o superior
* npm, yarn o pnpm

## 🛠️ Instalación y Configuración

1. **Clonar el proyecto**
   ```bash
   git clone https://github.com/gusmendez3249/deliGummyWeb.git
   cd deliGummyWeb
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar el entorno**
   Por defecto, Vite utiliza un proxy hacia `http://localhost:8000` para las peticiones `/api`. Si necesitas configurar variables de entorno para producción, crea un archivo `.env` en la raíz siguiendo el estándar de Vite:
   ```env
   VITE_API_URL=https://tu-api-produccion.com
   ```

4. **Iniciar en modo desarrollo**
   El servidor arrancará en HTTPS (gracias a `@vitejs/plugin-basic-ssl`) lo que permite probar el acceso a la cámara web directamente desde celulares de forma segura:
   ```bash
   npm run dev -- --host
   ```
   Abre la dirección `https://localhost:5173` o el enlace de red local `https://192.168.x.x:5173` provisto en la consola.

5. **Construir para producción**
   Genera el bundle optimizado en la carpeta `/dist`:
   ```bash
   npm run build
   ```

## 👤 Autor
* **Cruz Mendez Juan Gustavo Angel**
