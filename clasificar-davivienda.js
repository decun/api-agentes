require('dotenv').config();

// Importaciones
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const ClasificadorService = require('./src/services/clasificador.service');
const HierarchyService = require('./src/services/hierarchy.service');

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value !== undefined ? value : true;
  }
  return acc;
}, {});

// Configuración
const config = {
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    db: process.env.MONGODB_DB || 'chatbot',
    collection: process.env.MONGODB_COLLECTION || 'Davivienda_transcripts'
  },
  limite: args.limite ? parseInt(args.limite, 10) : (process.env.LIMITE_DOCUMENTOS ? parseInt(process.env.LIMITE_DOCUMENTOS, 10) : 100),
  fecha: args.fecha || process.env.FECHA_FILTRO || null,
  rutaSalida: args.salida || process.env.RUTA_ARCHIVO_SALIDA || './datos/clasificacion-davivienda.json',
  debug: args.debug || process.env.DEBUG_MODE === 'true',
  tenant: {
    id: process.env.TENANT_ID || 'davivienda',
    aiusecaseId: process.env.AIUSECASE_ID || 'clasificacion_conversaciones'
  }
};

// Mostrar configuración
if (config.debug) {
  console.log('📋 Configuración:');
  console.log(JSON.stringify(config, null, 2));
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando proceso de extracción, clasificación y jerarquización de conversaciones...');
  console.log(`📂 Colección: ${config.mongo.collection}`);
  console.log(`🔢 Límite: ${config.limite} documentos`);
  if (config.fecha) console.log(`📅 Fecha: ${config.fecha}`);

  let cliente;
  try {
    // Conectar a MongoDB
    console.log(`🔄 Conectando a MongoDB: ${config.mongo.uri}`);
    cliente = new MongoClient(config.mongo.uri);
    await cliente.connect();
    console.log('✅ Conexión establecida');

    const db = cliente.db(config.mongo.db);
    const coleccion = db.collection(config.mongo.collection);

    // Construir filtro
    const filtro = {};
    if (config.fecha) {
      const fecha = new Date(config.fecha);
      filtro.createdAt = { $gte: fecha, $lt: new Date(fecha.getTime() + 24*60*60*1000) };
    }

    // Consultar documentos
    console.log('🔍 Consultando documentos...');
    const documentos = await coleccion.find(filtro)
      .limit(config.limite)
      .toArray();

    console.log(`✅ Se encontraron ${documentos.length} documentos`);

    // Inicializar servicios
    const clasificador = new ClasificadorService();
    const hierarchyService = new HierarchyService(config.mongo.uri, config.debug);

    // Procesar documentos
    console.log('🔄 Procesando documentos...');
    const resultados = [];
    let contador = 0;

    for (const documento of documentos) {
      try {
        contador++;
        console.log(`\n📄 Procesando documento ${contador}/${documentos.length}`);
        
        // Extraer información de la conversación
        const conversacion = procesarConversacionDavivienda(documento);
        
        if (!conversacion || !conversacion.textoConversacion) {
          console.warn('⚠️ No se pudo extraer texto de conversación válido.');
          continue;
        }
        
        console.log(`👤 Cliente: ${conversacion.nombreCliente || 'N/A'}`);
        console.log(`🆔 ID Conversación: ${conversacion.idConversacion || 'N/A'}`);
        
        if (config.debug) {
          const ejemploTexto = conversacion.textoConversacion.substring(0, 200) + '...';
          console.log(`💬 Texto (extracto): ${ejemploTexto}`);
        }
        
        // Clasificar la conversación
        console.log('🔄 Clasificando conversación...');
        const clasificacion = await clasificador.clasificarConversacion(conversacion.textoConversacion);
        
        // Agregar resultado
        resultados.push({
          metadata: {
            idCliente: conversacion.idCliente,
            idConversacion: conversacion.idConversacion,
            timestamp: conversacion.timestamp,
            nombreCliente: conversacion.nombreCliente,
            batch: conversacion.batch
          },
          clasificacion: clasificacion.resultado,
          estadisticas: clasificacion.estadisticas
        });
        
        console.log('✅ Clasificación completada');
      } catch (error) {
        console.error(`❌ Error procesando documento:`, error.message);
        if (config.debug) console.error(error.stack);
      }
    }

    // Guardar resultados de clasificación en MongoDB
    console.log('\n💾 Guardando clasificaciones en MongoDB...');
    const analysisCollection = db.collection(`${config.tenant.id}_analysis`);
    
    for (const resultado of resultados) {
      await analysisCollection.updateOne(
        { 
          'metadata.idConversacion': resultado.metadata.idConversacion 
        },
        { 
          $set: {
            tenant_id: config.tenant.id,
            aiusecase_id: config.tenant.aiusecaseId,
            created_at: new Date(),
            ...resultado
          }
        },
        { upsert: true }
      );
    }
    
    console.log(`✅ ${resultados.length} clasificaciones guardadas en MongoDB`);

    // Guardar resultados en archivo local
    console.log(`\n💾 Guardando clasificaciones en archivo local: ${config.rutaSalida}`);
    
    // Asegurar que el directorio existe
    const directorioSalida = path.dirname(config.rutaSalida);
    if (!fs.existsSync(directorioSalida)) {
      fs.mkdirSync(directorioSalida, { recursive: true });
    }
    
    const resultadoClasificacion = {
      metadata: {
        fecha: new Date().toISOString(),
        documentosProcesados: documentos.length,
        clasificacionesExitosas: resultados.length,
        configuracion: {
          limite: config.limite,
          fecha: config.fecha
        }
      },
      resultados
    };

    fs.writeFileSync(config.rutaSalida, JSON.stringify(resultadoClasificacion, null, 2));

    // Procesar jerarquía
    console.log('\n🔄 Iniciando proceso de jerarquización...');
    
    try {
      const jerarquia = await hierarchyService.processHierarchy(
        config.tenant.id, 
        config.tenant.aiusecaseId,
        {
          fecha: config.fecha,
          batch: resultados[0]?.metadata?.batch
        }
      );
      
      console.log('✅ Jerarquía procesada exitosamente');
      if (config.debug) {
        console.log(JSON.stringify(jerarquia, null, 2));
      }
    } catch (error) {
      console.error('❌ Error procesando jerarquía:', error.message);
      if (config.debug) console.error(error.stack);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    if (config.debug) console.error(error.stack);
    process.exit(1);
  } finally {
    if (cliente) {
      await cliente.close();
      console.log('\n👋 Conexión a MongoDB cerrada');
    }
  }
}

// Ejecutar script
main();
