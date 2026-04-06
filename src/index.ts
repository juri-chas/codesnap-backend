import fastify from 'fastify';

const server = fastify({ logger: true });
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

server.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
});


const start = async () => {
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
