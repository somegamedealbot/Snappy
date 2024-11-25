const fastify = require('fastify');
const fastifySession = require('@fastify/session');
const Redis = require('ioredis')
const RedisStore = require('connect-redis').default
const { authApiRoutes, unauthApiRoutes} = require('./fast-api');
require('dotenv').config();
const initDb = require('./db/initDb');
const metricsPlugin = require('fastify-metrics');



const app = fastify({
    // logger: true
});

const store = new RedisStore({
    client: new Redis({
        enableAutoPipelining: true
    })
})

app.register(require('@fastify/cookie'));
app.register(require('@fastify/formbody'));
app.register(metricsPlugin, { 
    endpoint: '/metrics',
    defaultMetrics: true, // Include default Node.js metrics (e.g., memory, CPU)
    enableRouteMetrics: true // Enable metrics collection for each route
})

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