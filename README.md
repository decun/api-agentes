# API de Clasificación de Conversaciones

API para clasificación jerárquica de conversaciones con soporte multi-tenant. Sistema de procesamiento y clasificación de conversaciones con integración a múltiples servicios de IA.

## Características

- Clasificación automática de conversaciones usando IA
- Soporte para múltiples tenants
- Jerarquización de resultados
- Integración con MongoDB
- Procesamiento por lotes
- Modo debug para desarrollo

## Instalación

```bash
npm install
```

## Configuración

Crea un archivo `.env` con las siguientes variables:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=chatbot
MONGODB_COLLECTION=transcripts
DEEPINFRA_API_KEY=your_api_key
DEEPINFRA_MODEL=your_model
DEBUG_MODE=false
```

## Uso

```bash
node clasificar-davivienda.js --limite=100 --fecha=2024-03-31 --debug
```

### Opciones

- `--limite=N`: Número de documentos a procesar
- `--fecha=YYYY-MM-DD`: Filtrar por fecha
- `--debug`: Activar modo debug

## Estructura del Proyecto

```
├── src/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   └── utils/
├── datos/
├── clasificar-davivienda.js
├── generar-jerarquia.js
└── package.json
```

## Licencia

ISC
