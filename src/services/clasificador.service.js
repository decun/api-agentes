const DeepInfraService = require('./deepinfra.service');
const { MongoClient } = require('mongodb');

class ClasificadorService {
  constructor() {
    this.deepInfraService = new DeepInfraService();
    // Inicializar MongoClient solo si existe la URI
    if (process.env.MONGODB_URI) {
      this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    }
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
      // Manejo de errores simplificado
      throw new Error(`Error al clasificar: ${error.message}`);
    }
  }

  prepararPrompt(texto) {
    return `Por favor clasifica la siguiente conversación en categorías y subcategorías.

Conversación:
${texto}

Por favor proporciona la clasificación SOLAMENTE en el siguiente formato JSON sin texto adicional antes o después:
{
  "categoria": "[CATEGORIA_PRINCIPAL]",
  "subcategoria": "[SUBCATEGORIA]",
  "detalle": "[DETALLE_ESPECIFICO]"
}
Respeta el formato de la clasificacion con _ y mayusculas
No incluyas ningún texto adicional, comentarios, explicaciones o análisis fuera del JSON.
No uses comillas simples, usa ÚNICAMENTE comillas dobles para claves y valores.
No uses caracteres especiales o caracteres de escape innecesarios.
Recuerda que tienes la libertad de conocimiento para clasificar, no te limites a las categorias que te proporcione el prompt, si no que clasifica con la libertad de conocimiento que tengas.
El contexto en general de esta clasificacion es que eres un chatbot que primero va a generar una clasificacion de la conversacion y despues va a generar una jerarquia de la clasificacion para poder pasar denuevo por aqui y poder inyectar una nueva clasficacion pero mas precisa

Donde:
- CATEGORIA_PRINCIPAL: La categoría general del tema 
- SUBCATEGORIA: Una clasificación más específica dentro de la categoría
- DETALLE_ESPECIFICO: Detalles adicionales o contexto específico(No mas de cuatro palabras)`;
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
      throw new Error(`Error procesando respuesta: ${error.message}`);
    }
  }

  async guardarClasificacion(tenantId, aiusecaseId, metadata, clasificacion, estadisticas) {
    // Verificar si MongoDB está configurado
    if (!this.mongoClient) {
      console.warn('MongoDB no está configurado. No se guardará la clasificación.');
      return false;
    }
    
    let client;
    try {
      client = await this.mongoClient.connect();
      const db = client.db();
      const collection = db.collection(`${tenantId}_analysis`);
      
      await collection.updateOne(
        { 
          'metadata.idConversacion': metadata.idConversacion 
        },
        { 
          $set: {
            tenant_id: tenantId,
            aiusecase_id: aiusecaseId,
            created_at: new Date(),
            metadata,
            clasificacion,
            estadisticas
          }
        },
        { upsert: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error guardando clasificación en MongoDB:', error);
      throw error;
    } finally {
      if (client) await client.close();
    }
  }
}

module.exports = ClasificadorService;