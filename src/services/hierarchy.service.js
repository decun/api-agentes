const { MongoClient } = require('mongodb');
const DeepInfraService = require('./deepinfra.service');

class HierarchyService {
  constructor(mongoUri, debug = false) {
    this.mongoUri = mongoUri;
    this.debug = debug;
    this.deepInfraService = new DeepInfraService();
  }

  async processHierarchy(tenantId, aiusecaseId, filters = {}) {
    let client;
    try {
      client = await MongoClient.connect(this.mongoUri);
      const db = client.db();
      
      // Obtener clasificaciones
      const pipeline = this.buildPipeline(tenantId, aiusecaseId, filters);
      const results = await db.collection(`${tenantId}_analysis`)
        .aggregate(pipeline)
        .toArray();

      // Procesar resultados
      const hierarchy = this.buildHierarchy(results);
      
      // Guardar jerarquía
      await this.saveHierarchy(db, tenantId, aiusecaseId, hierarchy);
      
      return hierarchy;
    } catch (error) {
      console.error('Error procesando jerarquía:', error);
      throw error;
    } finally {
      if (client) await client.close();
    }
  }

  buildPipeline(tenantId, aiusecaseId, filters) {
    const match = {
      tenant_id: tenantId,
      aiusecase_id: aiusecaseId
    };

    if (filters.fecha) {
      const fecha = new Date(filters.fecha);
      match.created_at = {
        $gte: fecha,
        $lt: new Date(fecha.getTime() + 24*60*60*1000)
      };
    }

    if (filters.batch) {
      match['metadata.batch'] = filters.batch;
    }

    return [
      { $match: match },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: '$clasificacion.categoria',
          count: { $sum: 1 },
          subcategorias: {
            $push: {
              nombre: '$clasificacion.subcategoria',
              detalle: '$clasificacion.detalle',
              metadata: '$metadata'
            }
          }
        }
      }
    ];
  }

  buildHierarchy(results) {
    const hierarchy = {
      total: 0,
      categorias: []
    };

    for (const result of results) {
      const categoria = {
        nombre: result._id,
        total: result.count,
        subcategorias: this.processSubcategorias(result.subcategorias)
      };

      hierarchy.categorias.push(categoria);
      hierarchy.total += result.count;
    }

    // Calcular porcentajes
    for (const categoria of hierarchy.categorias) {
      categoria.porcentaje = ((categoria.total / hierarchy.total) * 100).toFixed(2);
      
      for (const subcategoria of categoria.subcategorias) {
        subcategoria.porcentaje = ((subcategoria.total / categoria.total) * 100).toFixed(2);
      }
    }

    return hierarchy;
  }

  processSubcategorias(items) {
    const subMap = new Map();

    for (const item of items) {
      const key = item.nombre;
      
      if (!subMap.has(key)) {
        subMap.set(key, {
          nombre: key,
          total: 0,
          detalles: new Map(),
          ejemplos: []
        });
      }

      const sub = subMap.get(key);
      sub.total++;

      // Procesar detalles
      if (item.detalle) {
        if (!sub.detalles.has(item.detalle)) {
          sub.detalles.set(item.detalle, 1);
        } else {
          sub.detalles.set(item.detalle, sub.detalles.get(item.detalle) + 1);
        }
      }

      // Guardar ejemplo si hay espacio
      if (sub.ejemplos.length < 3) {
        sub.ejemplos.push(item.metadata);
      }
    }

    // Convertir a array y formatear
    return Array.from(subMap.values()).map(sub => ({
      nombre: sub.nombre,
      total: sub.total,
      detalles: Array.from(sub.detalles.entries()).map(([detalle, count]) => ({
        texto: detalle,
        cantidad: count,
        porcentaje: ((count / sub.total) * 100).toFixed(2)
      })),
      ejemplos: sub.ejemplos
    }));
  }

  async saveHierarchy(db, tenantId, aiusecaseId, hierarchy) {
    const collection = db.collection(`${tenantId}_hierarchy`);
    
    await collection.updateOne(
      {
        tenant_id: tenantId,
        aiusecase_id: aiusecaseId,
        fecha: new Date().toISOString().split('T')[0]
      },
      {
        $set: {
          hierarchy,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );
  }
}

module.exports = HierarchyService;