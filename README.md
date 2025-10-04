# 🏓 Pong Online Multiplayer

Un juego de Pong completo con modo multijugador online usando WebSockets.

## 🚀 Características

- **Modo Local**: Jugador vs CPU y Jugador vs Jugador
- **Modo Online**: Multijugador en tiempo real
- **Sistema de Salas**: Crear y unirse a salas de juego
- **Sincronización en Tiempo Real**: WebSockets para gameplay fluido
- **Interfaz Moderna**: Diseño responsivo y atractivo

## 📦 Instalación

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm (incluido con Node.js)

### Pasos de Instalación

1. **Instalar las dependencias del servidor:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor:**
   ```bash
   npm start
   ```
   
   O para desarrollo con auto-recarga:
   ```bash
   npm run dev
   ```

3. **Acceder al juego:**
   Abre tu navegador y ve a `http://localhost:3000`

## 🎮 Cómo Jugar

### Modo Local
- **Jugador vs CPU**: Usa WASD para moverte
- **Jugador vs Jugador**: Jugador 1 usa WASD, Jugador 2 usa las flechas

### Modo Online
1. Ingresa tu nombre de jugador
2. **Crear Sala**: Crea una nueva sala y comparte el código con un amigo
3. **Unirse a Sala**: Ingresa el código de sala o selecciona una sala disponible
4. ¡Una vez que ambos jugadores estén conectados, el juego comenzará automáticamente!

### Controles
- **W/S** o **↑/↓**: Mover paleta arriba/abajo
- **Barra Espaciadora**: Pausar/Reanudar juego
- **Botones de Control**: Pausar, Reiniciar, Volver al Menú

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5 Canvas, CSS3, JavaScript ES6
- **Backend**: Node.js, Express.js
- **WebSockets**: Socket.io para comunicación en tiempo real
- **Sincronización**: Game loop del servidor para estado consistente

## 📁 Estructura del Proyecto

```
pong-online/
├── package.json          # Dependencias y scripts
├── server.js             # Servidor WebSocket y lógica de salas
├── index.html            # Interfaz del juego
├── style.css             # Estilos y animaciones
├── script.js             # Lógica del cliente y WebSocket
└── README.md             # Este archivo
```

## 🔧 Configuración del Servidor

El servidor se ejecuta por defecto en el puerto 3000. Puedes cambiarlo estableciendo la variable de entorno `PORT`:

```bash
PORT=8080 npm start
```

## 🌐 Despliegue

Para desplegar en producción:

1. **Heroku**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   heroku create tu-app-name
   git push heroku main
   ```

2. **Railway/Render**: Conecta tu repositorio y despliega automáticamente

3. **VPS**: Usa PM2 para mantener el servidor corriendo:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "pong-server"
   ```

## 🐛 Solución de Problemas

### El servidor no inicia
- Verifica que Node.js esté instalado: `node --version`
- Instala las dependencias: `npm install`
- Verifica que el puerto 3000 esté libre

### No se puede conectar online
- Verifica que el servidor esté ejecutándose
- Revisa la consola del navegador para errores
- Asegúrate de estar en la misma red o usa una URL pública

### Lag en el juego online
- El servidor sincroniza a 60 FPS
- Verifica tu conexión a internet
- Si el servidor está remoto, puede haber latencia natural

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Algunas ideas para mejorar:

- Mejorar la IA del CPU
- Añadir efectos de sonido
- Implementar sistema de puntuación global
- Añadir más modos de juego
- Crear torneos online

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Puedes usarlo libremente para proyectos personales y comerciales.

---

¡Disfruta jugando Pong online! 🏓