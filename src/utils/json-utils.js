const safeJSONParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('Error al parsear JSON:', e);
    throw new Error('Error al parsear JSON: ' + e.message);
  }
};

module.exports = {
  safeJSONParse
};