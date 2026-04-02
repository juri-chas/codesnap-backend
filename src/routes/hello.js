async function helloRoutes(fastify, options) {
  fastify.get('/api/hello', async (request, reply) => {
    return { message: 'Hello from the backend!' };
  });
}

module.exports = helloRoutes;