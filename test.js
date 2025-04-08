// Script para probar la generación de jerarquía versionada que guarda en Transcripts_aiusecase_id
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const HierarchyService = require('./src/services/hierarchy.service');
const ClasificadorService = require('./src/services/clasificador.service');
const SimilitudService = require('./src/services/similitud.service');

// Configuración
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://decun:sixbell4455@cluster0.aixw3qc.mongodb.net/?retryWrites=true&w=majority';
const MONGODB_DB = process.env.MONGODB_DB || 'chatbot';
const TRANSCRIPT_AI_DB = 'Transcripts_aiusecase_id'; // Base de datos para las jerarquías
const TENANT_ID = 'davivienda';
const AIUSECASE_ID = 'clasificacion_conversaciones';
const BATCH_CUSTOM_NAME = process.env.BATCH_CUSTOM_NAME || 'Batch_Davivienda_2_1_270325';
const LIMITE_DOCUMENTOS = parseInt(process.env.LIMITE_DOCUMENTOS || '10', 10);
const DEBUG = process.env.DEBUG_MODE === 'true';
const ACTIVAR_AUTOMATICAMENTE = process.env.ACTIVAR_AUTO === 'true';

async function main() {
  console.log('🚀 Iniciando procesamiento y jerarquización de conversaciones...');
  console.log(`🏢 Tenant: ${TENANT_ID}`);
  console.log(`🏷️ Batch: ${BATCH_CUSTOM_NAME}`);
  console.log(`🔢 Límite de documentos: ${LIMITE_DOCUMENTOS}`);
  
  let client;
  try {
    // Conectar a MongoDB
    console.log(`\n🔄 Conectando a MongoDB: ${MONGODB_URI}`);
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Conexión establecida');

    const db = client.db(MONGODB_DB);
    const dbTranscriptAI = client.db(TRANSCRIPT_AI_DB); // Conexión a la base de datos de jerarquías
    
    // Paso 1: Clasificar conversaciones
    const clasificaciones = await clasificarLote(db);
    
    if (clasificaciones.length === 0) {
      console.error('❌ No se pudieron obtener clasificaciones. Terminando proceso.');
      return;
    }
    
    // Paso 2: Generar jerarquía a partir de las clasificaciones
    const resultado = await generarJerarquia(db, dbTranscriptAI, clasificaciones);
    
    // Paso 3: Si está configurado, activar automáticamente la versión
    if (ACTIVAR_AUTOMATICAMENTE && resultado && resultado.id) {
      await activarJerarquia(db, dbTranscriptAI, resultado.id);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    if (client) {
      console.log('\n🔄 Cerrando conexión a MongoDB...');
      await client.close();
      console.log('✅ Conexión cerrada');
    }
  }
}

async function clasificarLote(db) {
  console.log('\n📋 PASO 1: CLASIFICACIÓN DE CONVERSACIONES');
  
  try {
    const coleccionOrigen = db.collection('Davivienda_transcripts');
    
    // Construir filtro
    const filtro = { "batchCustomName": BATCH_CUSTOM_NAME };
    
    // Consultar documentos
    console.log('🔍 Consultando documentos...');
    const documentos = await coleccionOrigen.find(filtro)
      .limit(LIMITE_DOCUMENTOS)
      .toArray();

    console.log(`✅ Se encontraron ${documentos.length} documentos`);
    
    if (documentos.length === 0) {
      console.error('❌ No se encontraron documentos con el batch especificado');
      return [];
    }
    
    // Inicializar servicios
    const clasificador = new ClasificadorService();
    
    // Array para almacenar todas las clasificaciones
    const todasLasClasificaciones = [];
    
    // Procesar documentos
    console.log('🔄 Procesando documentos y clasificando conversaciones...');
    let contador = 0;
    let procesadas = 0;
    
    for (const documento of documentos) {
      try {
        contador++;
        console.log(`\n📄 Procesando documento ${contador}/${documentos.length}`);
        
        // Verificar si el documento contiene la propiedad "conversation"
        if (!documento.conversation || !Array.isArray(documento.conversation)) {
          console.warn('⚠️ El documento no contiene la propiedad "conversation" o no es un array');
          continue;
        }
        
        // Procesar cada conversación en el documento
        for (const conversacionItem of documento.conversation) {
          try {
            procesadas++;
            console.log(`\n🗣️ Procesando conversación ${procesadas} del documento ${contador}`);
            
            // Extraer texto de la conversación
            const textoConversacion = extraerTextoConversacion(conversacionItem);
            
            if (!textoConversacion) {
              console.warn('⚠️ No se pudo extraer texto de conversación válido');
              continue;
            }
            
            console.log(`🆔 ID Conversación: ${conversacionItem.conversationId}`);
            console.log(`📝 Longitud del texto: ${textoConversacion.length} caracteres`);
            
            // Clasificar la conversación
            console.log('🔄 Clasificando conversación...');
            const tiempoInicio = Date.now();
            const clasificacion = await clasificador.clasificarConversacion(textoConversacion);
            
            console.log(`✅ Clasificación completada en ${Date.now() - tiempoInicio}ms`);
            console.log(`📊 Resultado: ${clasificacion.resultado.categoria} > ${clasificacion.resultado.subcategoria}`);
            
            // Agregar metadatos a la clasificación
            const clasificacionConMetadata = {
              ...clasificacion.resultado,
              metadata: {
                idConversacion: conversacionItem.conversationId,
                clientId: conversacionItem.clientId || 0,
                batchCustomName: BATCH_CUSTOM_NAME
              }
            };
            
            // Agregar al array de clasificaciones
            todasLasClasificaciones.push(clasificacionConMetadata);
            
            // Guardar en MongoDB (opcional)
            await db.collection(`${TENANT_ID}_analysis`).updateOne(
              { 'metadata.idConversacion': conversacionItem.conversationId },
              {
                $set: {
                  tenant_id: TENANT_ID,
                  aiusecase_id: AIUSECASE_ID,
                  created_at: new Date(),
                  metadata: clasificacionConMetadata.metadata,
                  clasificacion: clasificacion.resultado,
                  estadisticas: clasificacion.estadisticas
                }
              },
              { upsert: true }
            );
            
          } catch (convError) {
            console.error(`❌ Error procesando conversación:`, convError.message);
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando documento:`, error.message);
      }
    }
    
    console.log(`\n📊 Resumen de clasificación:`);
    console.log(`   - Documentos procesados: ${contador}`);
    console.log(`   - Conversaciones procesadas: ${procesadas}`);
    console.log(`   - Clasificaciones generadas: ${todasLasClasificaciones.length}`);
    
    // Guardar todas las clasificaciones en un archivo para depuración
    const fs = require('fs');
    const nombreArchivoClasificaciones = `clasificaciones_${BATCH_CUSTOM_NAME}_${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(nombreArchivoClasificaciones, JSON.stringify(todasLasClasificaciones, null, 2));
    console.log(`\n💾 Clasificaciones guardadas en: ${nombreArchivoClasificaciones}`);
    
    return todasLasClasificaciones;
    
  } catch (error) {
    console.error('❌ Error en clasificación de lote:', error);
    return [];
  }
}

async function generarJerarquia(db, dbTranscriptAI, clasificaciones) {
  console.log('\n📋 PASO 2: GENERACIÓN DE JERARQUÍA VERSIONADA');
  
  try {
    if (clasificaciones.length === 0) {
      console.error('❌ No hay clasificaciones para generar jerarquía');
      return;
    }
    
    console.log(`🔢 Número de clasificaciones para jerarquizar: ${clasificaciones.length}`);
    
    // Extraer solo las tripletas (categoría, subcategoría, detalle)
    const tripletas = clasificaciones.map(c => ({
      categoria: c.categoria,
      subcategoria: c.subcategoria,
      detalle: c.detalle || ''
    }));
    
    console.log('📊 Ejemplo de clasificaciones:');
    tripletas.slice(0, 3).forEach((t, i) => {
      console.log(`   ${i+1}. ${t.categoria} > ${t.subcategoria} > ${t.detalle}`);
    });
    
    // Inicializar servicio de similitud
    const similitudService = new SimilitudService();
    
    // Generar jerarquía
    console.log('\n🔄 Generando jerarquía a partir de las clasificaciones...');
    const tiempoInicio = Date.now();
    const jerarquia = await similitudService.agruparClasificaciones(tripletas);
    console.log(`✅ Jerarquía generada en ${Date.now() - tiempoInicio}ms`);
    
    // Colecciones en ambas bases de datos
    const coleccionOriginal = db.collection(`${TENANT_ID}_hierarchies`);
    const coleccionHierarchies = dbTranscriptAI.collection('davivienda_hierarchies');
    const coleccionProposals = dbTranscriptAI.collection('davivienda_hierarchiesproposals');
    
    // Obtener la última versión
    const ultimaJerarquia = await coleccionOriginal.findOne(
      { tenant_id: TENANT_ID, aiusecase_id: AIUSECASE_ID },
      { sort: { version: -1 } }
    );
    
    const nuevaVersion = ultimaJerarquia ? ultimaJerarquia.version + 1 : 1;
    
    // Verificar si hay una versión activa
    const versionActiva = await coleccionOriginal.findOne({
      tenant_id: TENANT_ID,
      aiusecase_id: AIUSECASE_ID,
      'metadata.active': true
    });
    
    // Preparar documento para guardar
    const documento = {
      created_at: new Date(),
      tenant_id: TENANT_ID,
      aiusecase_id: AIUSECASE_ID,
      version: nuevaVersion,
      hierarchy: jerarquia,
      metadata: {
        total_classifications: clasificaciones.length,
        filters: {
          fecha: null,
          batch: BATCH_CUSTOM_NAME
        },
        status: "proposed"
      }
    };
    
    // Si no hay versión activa, activar esta
    if (!versionActiva) {
      documento.metadata.active = true;
      documento.metadata.activated_at = new Date();
      documento.metadata.previous_version = null;
    }
    
    // Guardar en MongoDB (base de datos original)
    console.log('💾 Guardando jerarquía versionada en MongoDB (base de datos original)...');
    const resultado = await coleccionOriginal.insertOne(documento);
    
    console.log(`✅ Jerarquía guardada con ID: ${resultado.insertedId} en ${TENANT_ID}_hierarchies`);
    
    // Guardar también en Transcripts_aiusecase_id
    console.log('💾 Guardando jerarquía en Transcripts_aiusecase_id...');
    
    // 1. Guardar en davivienda_hierarchiesproposals (siempre)
    console.log('💾 Guardando como propuesta en davivienda_hierarchiesproposals');
    const documentoProposal = {
      ...documento,
      original_id: resultado.insertedId.toString()
    };
    await coleccionProposals.insertOne(documentoProposal);
    
    // 2. Guardar en davivienda_hierarchies si es activa
    if (documento.metadata.active) {
      console.log('🟢 Guardando como jerarquía activa en davivienda_hierarchies');
      const documentoHierarchy = {
        ...documento,
        original_id: resultado.insertedId.toString()
      };
      await coleccionHierarchies.insertOne(documentoHierarchy);
    }
    
    console.log(`🔢 Versión: ${nuevaVersion}`);
    console.log(`🟢 Estado: ${documento.metadata.active ? 'Activa' : 'Propuesta'}`);
    
    // Guardar en archivo para depuración
    const fs = require('fs');
    const nombreArchivoJerarquia = `jerarquia_${BATCH_CUSTOM_NAME}_v${nuevaVersion}_${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(nombreArchivoJerarquia, JSON.stringify(jerarquia, null, 2));
    console.log(`💾 Jerarquía también guardada en: ${nombreArchivoJerarquia}`);
    
    return {
      id: resultado.insertedId,
      version: nuevaVersion,
      isActive: documento.metadata.active || false
    };
    
  } catch (error) {
    console.error('❌ Error generando jerarquía:', error);
  }
}

async function activarJerarquia(db, dbTranscriptAI, jerarquiaId) {
  console.log('\n📋 PASO 3: ACTIVACIÓN DE JERARQUÍA');
  
  try {
    console.log(`🔄 Activando jerarquía con ID: ${jerarquiaId}...`);
    
    const coleccionOriginal = db.collection(`${TENANT_ID}_hierarchies`);
    const coleccionHierarchies = dbTranscriptAI.collection('davivienda_hierarchies');
    const coleccionProposals = dbTranscriptAI.collection('davivienda_hierarchiesproposals');
    
    // Encontrar la versión a activar
    const versionToActivate = await coleccionOriginal.findOne({
      _id: new ObjectId(jerarquiaId)
    });
    
    if (!versionToActivate) {
      throw new Error(`No se encontró la jerarquía con ID ${jerarquiaId}`);
    }
    
    // Obtener la versión activa actual
    const activeVersion = await coleccionOriginal.findOne({
      tenant_id: TENANT_ID,
      aiusecase_id: AIUSECASE_ID,
      'metadata.active': true
    });
    
    const previousVersionId = activeVersion ? activeVersion._id : null;
    
    // Desactivar la versión activa actual
    if (activeVersion) {
      // Desactivar en la colección original
      await coleccionOriginal.updateOne(
        { _id: activeVersion._id },
        { 
          $set: { 
            'metadata.active': false,
            'metadata.status': 'inactive'
          } 
        }
      );
      
      // Desactivar en davivienda_hierarchies y davivienda_hierarchiesproposals
      await coleccionHierarchies.updateMany(
        { original_id: activeVersion._id.toString() },
        { 
          $set: { 
            'metadata.active': false,
            'metadata.status': 'inactive'
          } 
        }
      );
      
      await coleccionProposals.updateMany(
        { original_id: activeVersion._id.toString() },
        { 
          $set: { 
            'metadata.active': false,
            'metadata.status': 'inactive'
          } 
        }
      );
    }
    
    // Activar la nueva versión en la colección original
    await coleccionOriginal.updateOne(
      { _id: new ObjectId(jerarquiaId) },
      { 
        $set: { 
          'metadata.active': true,
          'metadata.activated_at': new Date(),
          'metadata.previous_version': previousVersionId ? previousVersionId.toString() : null,
          'metadata.status': 'active'
        } 
      }
    );
    
    // Activar en davivienda_hierarchiesproposals
    await coleccionProposals.updateMany(
      { original_id: jerarquiaId.toString() },
      { 
        $set: { 
          'metadata.active': true,
          'metadata.activated_at': new Date(),
          'metadata.previous_version': previousVersionId ? previousVersionId.toString() : null,
          'metadata.status': 'active'
        } 
      }
    );
    
    // Buscar la propuesta en proposals
    const propuestaEnProposals = await coleccionProposals.findOne({
      original_id: jerarquiaId.toString()
    });
    
    if (propuestaEnProposals) {
      // Eliminar el _id para que MongoDB genere uno nuevo
      const documentoHierarchy = { ...propuestaEnProposals };
      delete documentoHierarchy._id;
      
      // Actualizar metadatos
      documentoHierarchy.metadata.active = true;
      documentoHierarchy.metadata.activated_at = new Date();
      documentoHierarchy.metadata.previous_version = previousVersionId ? previousVersionId.toString() : null;
      documentoHierarchy.metadata.status = 'active';
      
      // Revisar si ya existe en hierarchies
      const existeEnHierarchies = await coleccionHierarchies.findOne({
        original_id: jerarquiaId.toString()
      });
      
      if (existeEnHierarchies) {
        // Actualizar si ya existe
        await coleccionHierarchies.updateOne(
          { original_id: jerarquiaId.toString() },
          { $set: documentoHierarchy }
        );
      } else {
        // Insertar si no existe
        await coleccionHierarchies.insertOne(documentoHierarchy);
      }
    } else {
      console.warn(`⚠️ No se encontró la propuesta con ID ${jerarquiaId} en davivienda_hierarchiesproposals`);
    }
    
    console.log(`✅ Jerarquía versión ${versionToActivate.version} activada correctamente`);
    
    return {
      success: true,
      message: `Jerarquía versión ${versionToActivate.version} activada correctamente`,
      version: versionToActivate.version
    };
  } catch (error) {
    console.error('❌ Error activando jerarquía:', error);
  }
}

function extraerTextoConversacion(conversacionItem) {
  try {
    // Verificar si tiene los mensajes de la conversación
    if (!conversacionItem.conversation || !Array.isArray(conversacionItem.conversation)) {
      return null;
    }
    
    // Filtrar mensajes que no son metadata
    const mensajes = conversacionItem.conversation.filter(msg => 
      msg.role !== 'metadata' && msg.content && typeof msg.content === 'string'
    );
    
    // Construir el texto de la conversación
    const textoConversacion = mensajes.map(msg => {
      const rol = msg.role === 'agent' ? 'Agente' : 'Cliente';
      return `${rol}: ${msg.content}`;
    }).join('\n');
    
    return textoConversacion;
  } catch (error) {
    console.error('Error extrayendo texto de conversación:', error);
    return null;
  }
}

// Ejecutar el script
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});