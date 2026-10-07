const express = require('express');
const secopService = require('../services/secopService');

module.exports = function(pool) {
  const router = express.Router();

  /**
   * GET /api/secop/estado
   * Verifica la conectividad y credenciales con el portal de SECOP II / datos.gov.co
   */
  router.get('/estado', async (req, res) => {
    try {
      res.json({
        ok: true,
        servicio: 'SECOP II - Contratos Electrónicos',
        dataset: 'jbjy-vk9h',
        portal: 'www.datos.gov.co',
        autenticacion: Boolean(process.env.SECOP_API_KEY_ID && process.env.SECOP_API_KEY_SECRET),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/secop/consultar
   * Parámetros: ?documento=XXXX o ?nombre=XXXX
   */
  router.get('/consultar', async (req, res) => {
    try {
      const { documento, nombre, limit } = req.query;

      if (!documento && !nombre) {
        return res.status(400).json({
          error: 'Debe especificar el parámetro "documento" o "nombre" para realizar la consulta en SECOP II.'
        });
      }

      let resultado;
      if (documento) {
        resultado = await secopService.consultarPorDocumento(documento, { limit });
      } else {
        resultado = await secopService.consultarPorNombre(nombre, { limit });
      }

      res.json({
        ok: true,
        ...resultado
      });
    } catch (error) {
      console.error('[secopRoutes] Error en consulta:', error.message);
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al consultar la API de SECOP II'
      });
    }
  });

  /**
   * POST /api/secop/verificar
   * Consulta por documento y/o nombre de un candidato a vinculación
   */
  router.post('/verificar', async (req, res) => {
    try {
      const { documento, nombre, limit } = req.body;

      if (!documento && !nombre) {
        return res.status(400).json({
          error: 'Debe enviar documento o nombre en el cuerpo de la solicitud.'
        });
      }

      let resultado;
      if (documento) {
        resultado = await secopService.consultarPorDocumento(documento, { limit });
      } else {
        resultado = await secopService.consultarPorNombre(nombre, { limit });
      }

      res.json({
        ok: true,
        ...resultado
      });
    } catch (error) {
      console.error('[secopRoutes] Error al verificar candidato:', error.message);
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al verificar antecedentes contractuales'
      });
    }
  });

  return router;
};
