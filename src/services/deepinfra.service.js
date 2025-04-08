const axios = require('axios');

class DeepInfraService {
  constructor() {
    // Verificar que la API key está disponible
    this.apiKey = process.env.DEEPINFRA_API_KEY;
    if (!this.apiKey) {
      console.error('Error: DEEPINFRA_API_KEY no está definida en las variables de entorno');
    }
    
    this.model = process.env.DEEPINFRA_MODEL;
    this.baseUrl = 'https://api.deepinfra.com/v1/openai';
  }

  async clasificar(prompt) {
    // Verificar nuevamente que la API key está disponible
    if (!this.apiKey) {
      throw new Error('DEEPINFRA_API_KEY no está definida. Por favor configura esta variable de entorno.');
    }
    
    try {
      console.log(`Usando modelo: ${this.model}`);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: 'Eres un experto en clasificación de conversaciones.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      // Manejo de errores más limpio
      if (error.response) {
        // El servidor respondió con un código de estado que no está en el rango 2xx
        console.error('Error de API:', {
          status: error.response.status,
          mensaje: error.response.data.error || error.response.data.detail || JSON.stringify(error.response.data)
        });
        
        throw new Error(`Error de API (${error.response.status}): Verifica tu API Key y modelo.`);
      } else if (error.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        console.error('Error de conexión: No se recibió respuesta.');
        throw new Error('Error de conexión: No se pudo conectar a DeepInfra.');
      } else {
        // Algo sucedió al configurar la solicitud que desencadenó un error
        console.error('Error de configuración:', error.message);
        throw new Error(`Error de configuración: ${error.message}`);
      }
    }
  }
}

module.exports = DeepInfraService;