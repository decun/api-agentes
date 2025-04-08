# API de Clasificación de Conversaciones

API para clasificación jerárquica de conversaciones con soporte multi-tenant. Sistema de procesamiento y clasificación de conversaciones con integración a múltiples servicios de IA.

## Características

- Clasificación automática de conversaciones usando IA
- Soporte para múltiples tenants
- Jerarquización y versionado de resultados
- Integración con MongoDB
- Sincronización de jerarquías entre bases de datos
- Procesamiento por lotes
- Modo debug para desarrollo

## Instalación

```bash
npm install
```

## Configuración

Crea un archivo `.env` con las siguientes variables (hay un archivo `.env.example` como referencia):

```env
# API y modelo
DEEPINFRA_API_KEY=your_api_key
DEEPINFRA_MODEL=your_model
JERARQUIZADOR_MODEL=your_model

# Configuración MongoDB
MONGODB_URI=mongodb://your_connection_string
MONGODB_DB=chatbot
MONGODB_DB_NAME=Transcripts_aiusecase_id

# Configuración de procesamiento
DEBUG_MODE=false
BATCH_CUSTOM_NAME=your_batch_name
LIMITE_DOCUMENTOS=10
ACTIVAR_AUTO=true
```

## Uso

### Generación y sincronización de jerarquías

El script principal para clasificar conversaciones y generar jerarquías:

```bash
node test.js
```

Este script realiza las siguientes acciones:

1. Conecta a MongoDB usando las credenciales configuradas
2. Busca y clasifica conversaciones del batch especificado en la variable `BATCH_CUSTOM_NAME`
3. Genera una jerarquía a partir de las clasificaciones utilizando el servicio de similitud
4. Guarda la jerarquía en ambas bases de datos:
   - Base de datos original (`chatbot`): colección `davivienda_hierarchies`
   - Base de datos de transcripciones (`Transcripts_aiusecase_id`):
     - Colección `davivienda_hierarchies` (solo jerarquías activas)
     - Colección `davivienda_hierarchiesproposals` (todas las jerarquías)
5. Opcionalmente activa la jerarquía generada si `ACTIVAR_AUTO=true`

## Variables de entorno importantes

- `MONGODB_URI`: URI de conexión a MongoDB
- `MONGODB_DB`: Base de datos principal (default: "chatbot")
- `LIMITE_DOCUMENTOS`: Número de documentos a procesar en cada ejecución
- `BATCH_CUSTOM_NAME`: Nombre del lote de documentos a procesar
- `ACTIVAR_AUTO`: Si es "true", activa automáticamente la jerarquía generada

## Estructura del Proyecto

```
├── src/
│   ├── controllers/   # Controladores de la API
│   ├── routes/        # Rutas de la API
│   ├── services/      # Servicios para clasificación y jerarquización
│   └── utils/         # Utilidades y helpers
├── test.js            # Script principal para clasificación y jerarquización
├── .env               # Variables de entorno (crear a partir de .env.example)
└── package.json       # Dependencias del proyecto
```

## Bases de datos

El sistema trabaja con dos bases de datos principales:
- `chatbot`: Base de datos principal para análisis y jerarquías
- `Transcripts_aiusecase_id`: Base de datos para transcripciones e interfaz con otros sistemas

### Colecciones importantes

- `davivienda_hierarchies`: Jerarquías activas
- `davivienda_hierarchiesproposals`: Todas las jerarquías (propuestas y activas)
- `davivienda_analysis`: Resultados de análisis y clasificaciones
- `Davivienda_transcripts`: Transcripciones originales de conversaciones

## Licencia

ISC
