const fastify = require('fastify')({ logger: true });

async function startServer() {
  try {
    // plugins
    fastify.register(require('./src/plugins/healthcheck'));

    // routes
    fastify.register(require('./src/routes/hello'));

    // Start server
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Server running at http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
