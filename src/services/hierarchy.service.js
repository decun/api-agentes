const { MongoClient, ObjectId } = require('mongodb');
const SimilitudService = require('./similitud.service');

class HierarchyService {
  constructor(mongoUri, debug = false) {
    this.mongoUri = mongoUri;
    this.debug = debug;
    this.similitudService = new SimilitudService();
  }

  async processHierarchy(tenantId, aiusecaseId, clasificaciones, filters = {}) {
    let client;
    try {
      client = await MongoClient.connect(this.mongoUri);
      const db = client.db();
      
      // Generar jerarquía usando el servicio de similitud
      const jerarquia = await this.similitudService.agruparClasificaciones(clasificaciones);
      
      // Guardar jerarquía con versionamiento
      const resultado = await this.saveHierarchyWithVersioning(db, tenantId, aiusecaseId, jerarquia, clasificaciones.length, filters);
      
      return resultado;
    } catch (error) {
      console.error('Error procesando jerarquía:', error);
      throw error;
    } finally {
      if (client) await client.close();
    }
  }

  async saveHierarchyWithVersioning(db, tenantId, aiusecaseId, hierarchy, totalClassifications, filters = {}) {
    try {
      const collection = db.collection(`${tenantId}_hierarchies`);
      
      // Obtener la última versión
      const ultimaVersion = await collection.findOne(
        { tenant_id: tenantId, aiusecase_id: aiusecaseId },
        { sort: { version: -1 } }
      );
      
      const nuevaVersion = ultimaVersion ? ultimaVersion.version + 1 : 1;
      
      // Verificar si hay una versión activa
      const versionActiva = await collection.findOne({
        tenant_id: tenantId,
        aiusecase_id: aiusecaseId,
        'metadata.active': true
      });
      
      // Preparar documento para guardar
      const documento = {
        created_at: new Date(),
        tenant_id: tenantId,
        aiusecase_id: aiusecaseId,
        version: nuevaVersion,
        hierarchy,
        metadata: {
          total_classifications: totalClassifications,
          filters: {
            fecha: filters.fecha || null,
            batch: filters.batchCustomName || filters.batch || null
          },
          status: "proposed"
        }
      };
      
      // Si no hay versión activa, activar esta versión
      if (!versionActiva) {
        documento.metadata.active = true;
        documento.metadata.activated_at = new Date();
        documento.metadata.previous_version = null;
      }
      
      // Guardar en MongoDB
      const result = await collection.insertOne(documento);
      
      if (this.debug) {
        console.log(`Jerarquía guardada en ${tenantId}_hierarchies con versión ${nuevaVersion}`);
      }
      
      return {
        success: true,
        id: result.insertedId,
        version: nuevaVersion,
        isActive: documento.metadata.active || false
      };
    } catch (error) {
      console.error('Error guardando jerarquía:', error);
      throw error;
    }
  }

  async activateHierarchy(tenantId, aiusecaseId, versionId) {
    let client;
    try {
      client = await MongoClient.connect(this.mongoUri);
      const db = client.db();
      const collection = db.collection(`${tenantId}_hierarchies`);
      
      // Encontrar la versión a activar
      const versionToActivate = await collection.findOne({
        _id: ObjectId(versionId),
        tenant_id: tenantId,
        aiusecase_id: aiusecaseId
      });
      
      if (!versionToActivate) {
        throw new Error(`No se encontró la versión ${versionId}`);
      }
      
      // Obtener la versión activa actual
      const activeVersion = await collection.findOne({
        tenant_id: tenantId,
        aiusecase_id: aiusecaseId,
        'metadata.active': true
      });
      
      const previousVersionId = activeVersion ? activeVersion._id : null;
      
      // Desactivar la versión activa actual
      if (activeVersion) {
        await collection.updateOne(
          { _id: activeVersion._id },
          { 
            $set: { 
              'metadata.active': false 
            } 
          }
        );
      }
      
      // Activar la nueva versión
      await collection.updateOne(
        { _id: ObjectId(versionId) },
        { 
          $set: { 
            'metadata.active': true,
            'metadata.activated_at': new Date(),
            'metadata.previous_version': previousVersionId,
            'metadata.status': 'active'
          } 
        }
      );
      
      return {
        success: true,
        message: `Jerarquía versión ${versionToActivate.version} activada correctamente`,
        version: versionToActivate.version
      };
    } catch (error) {
      console.error('Error activando jerarquía:', error);
      throw error;
    } finally {
      if (client) await client.close();
    }
  }

  async getHierarchies(tenantId, aiusecaseId, options = {}) {
    let client;
    try {
      client = await MongoClient.connect(this.mongoUri);
      const db = client.db();
      const collection = db.collection(`${tenantId}_hierarchies`);
      
      const query = { 
        tenant_id: tenantId, 
        aiusecase_id: aiusecaseId 
      };
      
      if (options.onlyActive) {
        query['metadata.active'] = true;
      }
      
      if (options.version) {
        query.version = options.version;
      }
      
      if (options.status) {
        query['metadata.status'] = options.status;
      }
      
      const sort = options.sort || { version: -1 };
      const limit = options.limit || 0;
      
      const jerarquias = await collection.find(query)
        .sort(sort)
        .limit(limit)
        .toArray();
      
      return jerarquias;
    } catch (error) {
      console.error('Error obteniendo jerarquías:', error);
      throw error;
    } finally {
      if (client) await client.close();
    }
  }

  async getActiveHierarchy(tenantId, aiusecaseId) {
    let client;
    try {
      client = await MongoClient.connect(this.mongoUri);
      const db = client.db();
      const collection = db.collection(`${tenantId}_hierarchies`);
      
      const activeHierarchy = await collection.findOne({
        tenant_id: tenantId,
        aiusecase_id: aiusecaseId,
        'metadata.active': true
      });
      
      return activeHierarchy;
    } catch (error) {
      console.error('Error obteniendo jerarquía activa:', error);
      throw error;
    } finally {
      if (client) await client.close();
    }
  }
}

module.exports = HierarchyService;