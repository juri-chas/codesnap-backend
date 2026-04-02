const fastifyHealthcheck = require('fastify-healthcheck');

async function healthcheckPlugin(fastify, options) {
  fastify.register(fastifyHealthcheck, {
    healthcheckUrl: '/health',
    healthcheckFn: async function (server, reply) {
      return { status: 'ok', uptime: process.uptime() };
    }
  });
}

module.exports = healthcheckPlugin;