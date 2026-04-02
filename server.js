const fastify = require('fastify')({ logger: true });
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

fastify.register(require('@fastify/express')).then(() => {
  app.prepare().then(() => {
    // Handle Next.js pages
    fastify.all('*', (req, res) => {
      return handle(req.raw, res.raw);
    });

    // Custom Fastify routes
    fastify.get('/api/fastify', async (request, reply) => {
      return { message: 'Hello from Fastify!' };
    });

    const port = process.env.PORT || 3000;
    fastify.listen({ port }, (err, address) => {
      if (err) throw err;
      console.log(`Server listening on ${address}`);
    });
  });
});