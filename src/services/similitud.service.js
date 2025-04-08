const axios = require('axios');
const DeepInfraService = require('./deepinfra.service');

class SimilitudService {
  constructor() {
    this.deepInfraService = new DeepInfraService();
  }

  async encontrarSimilares(texto, clasificaciones, opciones = {}) {
    const {
      umbral = 0.7,
      limite = 5
    } = opciones;

    try {
      // Preparar el prompt para calcular similitud
      const prompt = this.prepararPromptSimilitud(texto, clasificaciones, umbral);
      
      // Obtener respuesta
      const respuesta = await this.deepInfraService.clasificar(prompt);
      
      // Procesar respuesta
      const similares = this.procesarRespuestaSimilitud(respuesta);
      
      // Limitar resultados
      return similares.slice(0, limite);
    } catch (error) {
      console.error('Error buscando similares:', error.message);
      throw new Error(`Error al buscar similares: ${error.message}`);
    }
  }

  prepararPromptSimilitud(texto, clasificaciones, umbral) {
    const clasificacionesTexto = clasificaciones
      .map((c, i) => `${i+1}. ${c.categoria} > ${c.subcategoria}: ${c.detalle || 'N/A'}`)
      .join('\n');

    return `Por favor, encuentra las clasificaciones más similares al siguiente texto de entrada.

Texto a comparar:
"""
${texto}
"""

Lista de clasificaciones disponibles:
${clasificacionesTexto}

Devuelve un array de objetos JSON con los índices de las clasificaciones similares que superen un umbral de similitud de ${umbral * 100}%.
Cada objeto debe contener "indice" (número de la clasificación) y "similitud" (valor entre 0 y 1).
No incluyas ningún texto adicional, solo responde con un array de objetos JSON válido.

Ejemplo de formato de respuesta:
[
  {"indice": 1, "similitud": 0.85},
  {"indice": 4, "similitud": 0.79}
]`;
  }

  procesarRespuestaSimilitud(respuesta) {
    try {
      const texto = respuesta.choices[0].message.content;
      
      // Buscar el array JSON en la respuesta
      const match = texto.match(/\[[\s\S]*\]/);
      if (!match) {
        throw new Error('No se encontró un array JSON en la respuesta');
      }
      
      const similitudes = JSON.parse(match[0]);
      
      // Validar estructura
      if (!Array.isArray(similitudes)) {
        throw new Error('La respuesta no es un array válido');
      }
      
      // Ordenar por similitud descendente
      return similitudes.sort((a, b) => b.similitud - a.similitud);
    } catch (error) {
      console.error('Error procesando respuesta de similitud:', error);
      return [];
    }
  }

  async agruparClasificaciones(clasificaciones) {
    try {
      // Preparar el prompt para agrupar clasificaciones
      const prompt = this.prepararPromptAgrupacion(clasificaciones);
      
      // Obtener respuesta
      const respuesta = await this.deepInfraService.clasificar(prompt);
      
      // Procesar respuesta
      return this.procesarRespuestaAgrupacion(respuesta);
    } catch (error) {
      console.error('Error agrupando clasificaciones:', error.message);
      throw new Error(`Error al agrupar clasificaciones: ${error.message}`);
    }
  }

  prepararPromptAgrupacion(clasificaciones) {
    const clasificacionesJSON = JSON.stringify(clasificaciones);

    return `Por favor, agrupa las siguientes clasificaciones en categorías y subcategorías similares.

Clasificaciones:
${clasificacionesJSON}

Genera un objeto JSON jerárquico donde:
1. Las claves principales son las categorías generales (usa nombres en MAYÚSCULAS)
2. Cada categoría contiene subcategorías como claves (usa nombres en formato NOMBRE_SUBCATEGORIA)
3. Cada subcategoría contiene un array de strings con los detalles específicos

No incluyas ningún texto adicional, solo responde con un objeto JSON válido.

Ejemplo de formato de respuesta:
{
  "CATEGORIA_A": {
    "SUBCATEGORIA_A1": [
      "Detalle específico 1 relacionado con subcategoría A1",
      "Otro detalle específico de la subcategoría A1"
    ],
    "SUBCATEGORIA_A2": [
      "Detalle relacionado con subcategoría A2",
      "Otro detalle de subcategoría A2"
    ]
  },
  "CATEGORIA_B": {
    "SUBCATEGORIA_B1": [
      "Detalle de la subcategoría B1",
      "Otro elemento de la subcategoría B1"
    ]
  }
}`;
  }

  procesarRespuestaAgrupacion(respuesta) {
    try {
      const texto = respuesta.choices[0].message.content;
      
      // Buscar el objeto JSON en la respuesta
      const match = texto.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('No se encontró un objeto JSON en la respuesta');
      }
      
      return JSON.parse(match[0]);
    } catch (error) {
      console.error('Error procesando respuesta de agrupación:', error);
      throw error;
    }
  }
}

module.exports = SimilitudService;