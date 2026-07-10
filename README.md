# FAITE - Sabor con Calle

Aplicación web reestructurada para separar el Frontend del Backend, mejorando el mantenimiento, modularidad y permitiendo que la base de datos de productos sea dinámica.

## Estructura de Directorios

El proyecto ahora está dividido en módulos limpios:

- **`frontend/`**: Contiene todo el código del lado del cliente.
  - `index.html`: Estructura HTML estructurada y limpia.
  - `css/style.css`: Estilos de diseño, tarjetas, pestañas y modales.
  - `js/app.js`: Lógica interactiva del carrito de compras, programación de hora de pedidos y llamadas a la API.
  - `assets/`: Logotipos y favicon oficiales.
- **`backend/`**: Servidor en Python.
  - `app.py`: Servidor web Flask. Sirve la web y expone las APIs del menú, horarios y libro de reclamaciones.
  - `data/menu.json`: Base de datos local en JSON con los platos del menú y configuraciones de personalización.
  - `data/complaints/`: Directorio donde se guardan de manera segura los registros del libro de reclamaciones en formato JSON.
- **`run.py`**: Script en la raíz para instalar dependencias automáticamente e iniciar el servidor.
- **`requirements.txt`**: Dependencias de Python necesarias.

---

## Cómo Ejecutar el Proyecto

### Requisito previo
Tener instalado **Python 3**.

### Ejecución Directa (Recomendado)
Para arrancar el backend y servir la web al mismo tiempo:

1. Ejecute el siguiente comando en su terminal:
   ```bash
   python3 run.py
   ```
2. Abra su navegador web en:
   **[http://localhost:5001](http://localhost:5001)**

*(El script instalará automáticamente `Flask` si es la primera vez que se ejecuta).*

### Ejecución Local del Frontend (Desarrollo)
Si prefiere modificar y probar el frontend de manera directa sin pasar por el servidor web, puede abrir directamente el archivo:
- `frontend/index.html` en su navegador (mediante doble clic o arrastrando el archivo).

El JavaScript (`frontend/js/app.js`) detectará automáticamente el protocolo `file://` y realizará solicitudes a `http://127.0.0.1:5001` para consultar el menú e interactuar con el backend, por lo que el servidor backend también debería estar en ejecución si desea ver los platos del menú y usar el Libro de Reclamaciones.
