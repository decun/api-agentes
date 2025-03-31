const { OpenAI } = require('openai');
const { safeJSONParse } = require('../utils/json-utils');

class DeepInfraOpenAIService {
  constructor(apiKey, model = 'meta-llama/Llama-2-70b-chat-hf', debug = false) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepinfra.com/v1/openai',
    });
    this.model = model;
    this.debug = debug;
  }

  async generarRespuesta(prompt, options = {}) {
    const startTime = Date.now();
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'Eres un asistente experto en clasificación de conversaciones.' },
          { role: 'user', content: prompt }
        ],
        ...options
      });

      if (this.debug) {
        const endTime = Date.now();
        console.log('Tiempo de respuesta:', endTime - startTime, 'ms');
        console.log('Tokens utilizados:', response.usage);
      }

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error al generar respuesta:', error);
      throw error;
    }
  }

  async manejarStreaming(prompt, callback, options = {}) {
    try {
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'Eres un asistente experto en clasificación de conversaciones.' },
          { role: 'user', content: prompt }
        ],
        stream: true,
        ...options
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) callback(content);
      }
    } catch (error) {
      console.error('Error en streaming:', error);
      throw error;
    }
  }

  async clasificar(conversacion) {
    const prompt = `Por favor, clasifica la siguiente conversación según su temática principal y subtemas. Responde en formato JSON con la siguiente estructura:

{
  "tema_principal": "string",
  "subtemas": ["string"],
  "confianza": float,
  "explicacion": "string"
}

Conversación:
${conversacion}`;

    try {
      const respuesta = await this.generarRespuesta(prompt);
      return this.extraerJSON(respuesta);
    } catch (error) {
      console.error('Error al clasificar:', error);
      throw error;
    }
  }

  extraerJSON(texto) {
    try {
      // Buscar el primer '{' y el último '}'
      const inicio = texto.indexOf('{');
      const fin = texto.lastIndexOf('}') + 1;
      if (inicio === -1 || fin === 0) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }
      const jsonStr = texto.slice(inicio, fin);
      return safeJSONParse(jsonStr);
    } catch (error) {
      console.error('Error al extraer JSON:', error);
      throw error;
    }
  }
}

module.exports = DeepInfraOpenAIService;