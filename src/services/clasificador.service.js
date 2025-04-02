const DeepInfraService = require('./deepinfra.service');

class ClasificadorService {
  constructor() {
    this.deepInfraService = new DeepInfraService();
  }

  async clasificarConversacion(texto) {
    const inicio = Date.now();
    
    try {
      // Preparar prompt
      const prompt = this.prepararPrompt(texto);
      
      // Obtener clasificación
      const respuesta = await this.deepInfraService.clasificar(prompt);
      
      // Procesar resultado
      const resultado = this.procesarRespuesta(respuesta);
      
      return {
        resultado,
        estadisticas: {
          tiempoProcesamiento: Date.now() - inicio,
          longitudTexto: texto.length,
          tokens: respuesta.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('Error clasificando conversación:', error);
      throw error;
    }
  }

  prepararPrompt(texto) {
    return `Por favor clasifica la siguiente conversación en categorías y subcategorías.

Conversación:
${texto}

Por favor proporciona la clasificación en el siguiente formato JSON:
{
  "categoria": "[CATEGORIA_PRINCIPAL]",
  "subcategoria": "[SUBCATEGORIA]",
  "detalle": "[DETALLE_ESPECIFICO]"
}

Donde:
- CATEGORIA_PRINCIPAL: La categoría general del tema (ej: Productos, Servicios, Soporte)
- SUBCATEGORIA: Una clasificación más específica dentro de la categoría
- DETALLE_ESPECIFICO: Detalles adicionales o contexto específico

Por favor asegúrate de:
1. Usar categorías consistentes
2. Ser específico en las subcategorías
3. Incluir detalles relevantes
4. Mantener el formato JSON exacto`;
  }

  procesarRespuesta(respuesta) {
    try {
      // Extraer JSON de la respuesta
      const texto = respuesta.choices[0].message.content;
      const match = texto.match(/\{[\s\S]*\}/);
      
      if (!match) {
        throw new Error('No se encontró JSON en la respuesta');
      }
      
      const clasificacion = JSON.parse(match[0]);
      
      // Validar estructura
      if (!clasificacion.categoria || !clasificacion.subcategoria) {
        throw new Error('Estructura JSON inválida');
      }
      
      return clasificacion;
    } catch (error) {
      console.error('Error procesando respuesta:', error);
      throw error;
    }
  }
}

module.exports = ClasificadorService;