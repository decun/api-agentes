const axios = require('axios');

class DeepInfraService {
  constructor(apiKey = process.env.DEEPINFRA_API_KEY, model = process.env.DEEPINFRA_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://api.deepinfra.com/v1/openai';
  }

  async clasificar(prompt) {
    try {
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
      console.error('Error llamando a DeepInfra:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = DeepInfraService;