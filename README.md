# API Agentes

API de clasificación jerárquica de conversaciones con soporte multi-tenant. Sistema de procesamiento y clasificación de conversaciones con integración a múltiples servicios de IA.

## Características

- Soporte multi-tenant para diferentes clientes
- Clasificación jerárquica de conversaciones
- Integración con múltiples servicios de IA (OpenAI, DeepInfra)
- Procesamiento por lotes
- Sistema de reportes y estadísticas

## Estructura del Proyecto

```
api-agentes/
├── src/
│   ├── controllers/     # Controladores de la API
│   ├── routes/         # Definición de rutas
│   ├── services/       # Servicios de negocio
│   ├── utils/          # Utilidades
│   ├── config/        # Configuraciones
│   └── index.js       # Punto de entrada
├── datos/             # Datos de ejemplo y resultados
├── tests/            # Tests unitarios y de integración
└── docs/             # Documentación adicional
```

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/decun/api-agentes.git
cd api-agentes
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. Iniciar el servidor:
```bash
npm run dev
```

## Endpoints

### Clasificación
- `POST /api/v1/tenants/{tenant_id}/conversations/classify`
- `POST /api/v1/tenants/{tenant_id}/conversations/batch`
- `GET /api/v1/tenants/{tenant_id}/conversations/stats`
- `GET /api/v1/tenants/{tenant_id}/conversations/status`

## Configuración

El proyecto utiliza las siguientes variables de entorno:

- `NODE_ENV`: Entorno de ejecución
- `PORT`: Puerto del servidor
- `MONGODB_URI`: URI de conexión a MongoDB
- `OPENAI_API_KEY`: API Key de OpenAI
- `DEEPINFRA_API_KEY`: API Key de DeepInfra

## Licencia

ISC