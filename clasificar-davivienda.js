require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
const DeepInfraOpenAIService = require('./src/services/deepinfra-openai.service');

// Configuración
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'Transcripts_aiusecase_id';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'Davivienda_transcripts';
const LIMITE_DEFAULT = 4;

// Inicializar servicios
const deepInfraService = new DeepInfraOpenAIService(
  process.env.DEEPINFRA_API_KEY,
  process.env.DEEPINFRA_MODEL,
  process.env.DEBUG_MODE === 'true'
);

async function procesarConversacion(doc) {
  const conversacionTexto = doc.conversation
    .map(msg => {
      if (msg.role === 'metadata') return '';
      return `${msg.role.toUpperCase()}: ${msg.content}`;
    })
    .filter(text => text)
    .join('\n');

  const clasificacion = await deepInfraService.clasificar(conversacionTexto);

  return {
    metadata: {
      idCliente: doc.clientId,
      idConversacion: doc.conversationId,
      timestamp: doc.timestamp,
      nombreCliente: doc.clientName,
      batch: doc.batchName
    },
    conversacion: conversacionTexto.substring(0, 300) + '...',
    clasificacion,
    stats: {
      tiempoProcesamiento: new Date(),
      longitudConversacion: conversacionTexto.length,
      numeroMensajes: doc.conversation.length
    }
  };
}

async function main() {
  const limite = process.argv.includes('--limite') 
    ? parseInt(process.argv[process.argv.indexOf('--limite') + 1]) 
    : LIMITE_DEFAULT;

  const debug = process.argv.includes('--debug');
  if (debug) console.log('Modo debug activado');

  try {
    // Conectar a MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    if (debug) console.log('Conectado a MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Obtener documentos
    const documentos = await collection.find().limit(limite).toArray();
    if (debug) console.log(`Encontrados ${documentos.length} documentos`);

    // Procesar cada documento
    const resultados = [];
    for (const doc of documentos) {
      if (debug) console.log(`Procesando documento ${doc.conversationId}`);
      const resultado = await procesarConversacion(doc);
      resultados.push(resultado);
    }

    // Guardar resultados
    const outputPath = path.join(__dirname, 'datos', 'clasificacion-davivienda.json');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    const output = {
      fecha: new Date(),
      total_documentos: documentos.length,
      documentos_procesados: resultados.length,
      resultados
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    if (debug) console.log(`Resultados guardados en ${outputPath}`);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();