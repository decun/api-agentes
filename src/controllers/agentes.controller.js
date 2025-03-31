const DeepInfraOpenAIService = require('../services/deepinfra-openai.service');
const { MongoClient } = require('mongodb');

class AgentesController {
  constructor() {
    this.deepInfraService = new DeepInfraOpenAIService(
      process.env.DEEPINFRA_API_KEY,
      process.env.DEEPINFRA_MODEL,
      process.env.DEBUG_MODE === 'true'
    );
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
  }

  async clasificar(req, res) {
    try {
      const { conversacion } = req.body;
      if (!conversacion) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una conversación para clasificar'
        });
      }

      const resultado = await this.deepInfraService.clasificar(conversacion);
      res.json({
        success: true,
        data: resultado
      });
    } catch (error) {
      console.error('Error en clasificación:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async jerarquizar(req, res) {
    try {
      const { clasificaciones } = req.body;
      if (!clasificaciones || !Array.isArray(clasificaciones)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de clasificaciones'
        });
      }

      // TODO: Implementar lógica de jerarquización
      res.json({
        success: true,
        message: 'Endpoint en desarrollo'
      });
    } catch (error) {
      console.error('Error en jerarquización:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async simplificar(req, res) {
    try {
      const { jerarquia } = req.body;
      if (!jerarquia) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una jerarquía para simplificar'
        });
      }

      // TODO: Implementar lógica de simplificación
      res.json({
        success: true,
        message: 'Endpoint en desarrollo'
      });
    } catch (error) {
      console.error('Error en simplificación:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async procesarFlujoCompleto(req, res) {
    try {
      const { conversacion } = req.body;
      if (!conversacion) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una conversación para procesar'
        });
      }

      // 1. Clasificar
      const clasificacion = await this.deepInfraService.clasificar(conversacion);

      // 2. Jerarquizar y 3. Simplificar (TODO)
      res.json({
        success: true,
        data: {
          clasificacion,
          jerarquia: 'Pendiente',
          simplificado: 'Pendiente'
        }
      });
    } catch (error) {
      console.error('Error en flujo completo:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async procesarLote(req, res) {
    try {
      const { conversaciones, limite = 10 } = req.body;
      if (!conversaciones || !Array.isArray(conversaciones)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de conversaciones'
        });
      }

      const resultados = [];
      const total = Math.min(conversaciones.length, limite);

      for (let i = 0; i < total; i++) {
        const resultado = await this.deepInfraService.clasificar(conversaciones[i]);
        resultados.push(resultado);
      }

      res.json({
        success: true,
        data: {
          total: resultados.length,
          resultados
        }
      });
    } catch (error) {
      console.error('Error en procesamiento por lote:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AgentesController();