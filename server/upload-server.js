const fastify = require('fastify');
const fastifySession = require('@fastify/session');
const SQLite = require('connect-sqlite3')(fastifySession);
const { authApiRoutes, unauthApiRoutes} = require('./fast-api');

const app = fastify({
    logger: true
});
