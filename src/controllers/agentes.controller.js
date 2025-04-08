const ClasificadorService = require('../services/clasificador.service');
const HierarchyService = require('../services/hierarchy.service');

class AgentesController {
  constructor() {
    this.clasificadorService = new ClasificadorService();
    this.hierarchyService = new HierarchyService(
      process.env.MONGODB_URI,
      process.env.DEBUG_MODE === 'true'
    );
  }

  async clasificar(req, res) {
    try {
      const { conversacion, tenant_id = 'default', aiusecase_id = 'clasificacion_conversaciones', metadata = {} } = req.body;
      
      if (!conversacion) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una conversación para clasificar'
        });
      }

      const resultado = await this.clasificadorService.clasificarConversacion(conversacion);
      
      // Guardar en MongoDB solo si está configurado y hay metadatos
      if (process.env.MONGODB_URI && metadata.idConversacion) {
        try {
          await this.clasificadorService.guardarClasificacion(
            tenant_id,
            aiusecase_id,
            metadata,
            resultado.resultado,
            resultado.estadisticas
          );
        } catch (dbError) {
          console.error('Error al guardar en MongoDB:', dbError);
          // No fallar la respuesta si falla MongoDB
        }
      }
      
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
      const { tenant_id = 'default', aiusecase_id = 'clasificacion_conversaciones', filters = {} } = req.body;
      
      const jerarquia = await this.hierarchyService.processHierarchy(tenant_id, aiusecase_id, filters);
      
      res.json({
        success: true,
        data: jerarquia
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
      const clasificacion = await this.clasificadorService.clasificarConversacion(conversacion);

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
        const resultado = await this.clasificadorService.clasificarConversacion(conversaciones[i]);
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