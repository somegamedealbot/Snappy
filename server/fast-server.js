const fastify = require('fastify');
const fastifySession = require('@fastify/session');
const SQLite = require('connect-sqlite3')(fastifySession);
const { authApiRoutes, unauthApiRoutes} = require('./fast-api');
const initDb = require('./db/initDb');

const app = fastify({
    logger: true
});

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
    store: new SQLite({ db: 'sessions.sqlite', dir: './sessions' })
});

// add API routes
app.register(authApiRoutes, { prefix: 'api'});
app.register(unauthApiRoutes, { prefix: 'api'});

app.get('/login', (request, reply ) => {
    reply.sendFile('/public/login.html');
});

app.get('/media/output.mpd', (request, reply) => {
    reply.sendFile('media/5992350-hd_1920_1080_30fps.mpd', 
        {root: __dirname}
    );
})

app.get('/media/*', (request, reply) => {
    const path = request.url
    reply.sendFile(request.url , {root: __dirname});
});

app.get('/css', (request, reply) => {
    const path = request.url;
    reply.type('text/css');
    reply.sendFile(path);
});

app.get('/player', (request, reply) => {
    reply.status(200).sendFile('/public/media.html', {root : __dirname});
});

app.get('/scripts', (request, reply) => {
    const path = request.url;
    console.log('SCRIPT_PATH:' + path);
    reply.type('text/javascript');
    reply.sendFile(path);
});

app.listen({ port: process.env.PORT,
    host: '0.0.0.0'
}, (err, addr) => {
    if (err) throw err;
    console.log(`Server is running on ${addr}`);
});