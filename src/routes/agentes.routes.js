const express = require('express');
const agentesController = require('../controllers/agentes.controller');

const router = express.Router();

/**
 * @route POST /api/agentes/clasificar
 * @desc Clasifica una conversación usando el agente clasificador
 * @access Public
 */
router.post('/clasificar', agentesController.clasificar);

/**
 * @route POST /api/agentes/jerarquizar
 * @desc Jerarquiza una lista de clasificaciones
 * @access Public
 */
router.post('/jerarquizar', agentesController.jerarquizar);

/**
 * @route POST /api/agentes/simplificar
 * @desc Simplifica una jerarquía eliminando redundancias
 * @access Public
 */
router.post('/simplificar', agentesController.simplificar);

/**
 * @route POST /api/agentes/procesar-flujo
 * @desc Procesa el flujo completo de clasificación -> jerarquización -> simplificación
 * @access Public
 */
router.post('/flujo-completo', agentesController.procesarFlujoCompleto);

/**
 * @route POST /api/agentes/procesar-lote
 * @desc Procesa un lote de conversaciones
 * @access Public
 */
router.post('/lote', agentesController.procesarLote);

module.exports = router;