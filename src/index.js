const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Importar utilidades
const { errorHandler, notFoundHandler } = require('./utils/error-handler');

// Rutas
const agentesRoutes = require('./routes/agentes.routes');

// Configuración de variables de entorno
dotenv.config();

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.use(morgan('dev'));

// Rutas
app.use('/api/agentes', agentesRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.json({
    message: 'API Agentes - Sistema de clasificación jerárquica',
    status: 'online'
  });
});

// Manejo de rutas no encontradas
app.use(notFoundHandler);

// Manejo de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;