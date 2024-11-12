const fastify = require('fastify');
const fastifySession = require('@fastify/session');
const Redis = require('ioredis')
const RedisStore = require('connect-redis').default
const { authApiRoutes, unauthApiRoutes} = require('./fast-api');
const initDb = require('./db/initDb');

const app = fastify({
    logger: false
});

const store = new RedisStore({
    client: new Redis({
      enableAutoPipelining: true
    })
})

app.register(require('@fastify/cookie'));
app.register(require('@fastify/formbody'));

// setup database first
initDb();

app.register(fastifySession, {
    secret: '37128405562571910855469555330269',
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    },
    store
});

// add API routes
app.register(authApiRoutes, { prefix: 'api'});
app.register(unauthApiRoutes, { prefix: 'api'});

app.listen({ port: process.env.PORT,
    host: '0.0.0.0'
}, (err, addr) => {
    if (err) throw err;
    console.log(`Server is running on ${addr}`);
});