const fastify = require('fastify');
const fs = require('fs');
// const fsPromises = require("fs/promises");
const { pipeline } = require('stream/promises');
const { Video, User } = require('./db/schemas');
const {v7: uuidv7} = require('uuid');
require('dotenv').config();
const Queue = require('bull');
const metricsPlugin = require('fastify-metrics');

const fastifySession = require('@fastify/session');
const Redis = require('ioredis')
const RedisStore = require('connect-redis').default
require('dotenv').config();

const store = new RedisStore({
    client: new Redis({
        host: '10.0.3.215', // Redis server address
        port: 6379,        // Redis server port
        enableAutoPipelining: true
    })
});


const app = fastify({
    // logger: true
});

app.register(require('@fastify/cookie'));
app.register(fastifySession, {
    secret: '37128405562571910855469555330269',
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    },
    store
});
app.register(metricsPlugin, { 
    endpoint: '/metrics',
    defaultMetrics: true, // Include default Node.js metrics (e.g., memory, CPU)
    enableRouteMetrics: true // Enable metrics collection for each route
})


const redisConfig = {
    host: '10.0.3.215', // Redis server address
    port: 6379,        // Redis server port
}

const videoQueue = new Queue('videoQueue', {
    redis: redisConfig
})



async function auth(fastify, options){
    fastify.addHook('onRequest', async (request, reply) => {
        if (!request.session?.loggedIn) {
            if (!reply.sent) {
                return reply.code(200).send({ 
                    status: 'ERROR',
                    error: true, 
                    message: 'User not logged in. No session found.'
                });
            }
        }
    });

    fastify.register(require('@fastify/multipart'), {
        limits: {
            fileSize: 1000000000,  // For multipart forms, the max file size in bytes
            files: 1,           // Max number of file fields
            parts: 1000         // For multipart forms, the max number of parts (fields + files)
        },
        attachFieldsToBody: true,
        onFile: async (part) => {
            console.log('Received Video');
            await pipeline(part.file, fs.createWriteStream(`${process.env.SERVER_SAVE_LOCATION}/${part.filename}`, {
                highWaterMark: 512  * 1024
            }));
            part.fields = part.fields || {}; // Ensure fields exists in part object
            part.fields.uploadedFileName = { value: part.filename }; // Add filename
            console.log('Processed Video');
        } 
    });
    

    fastify.post('/upload', async (request, reply) => {
        // create new video record
        const id = uuidv7();
    
        const author = request.body.author.value;
        const title = request.body.title.value;
        const description = request.body.description.value;
        const uploadedFileName = request.body.uploadedFileName?.value;
    
        // request.log.info({body: request.body});
        
        const user = await User.findOne({
            where: {
                username: author
            },
        });
        
        request.log.info({body: {
            author,
            filename: uploadedFileName,
            author_id: user.userId
        }});
    
        const video = await Video.create({
            id: id,
            title,
            description,
            author,
            author_id: user.userId  // find by querying username
        });
    
        request.log.info({
            message: `Video with ${id} has been added to db`
        });
    
        request.log.info({
            video
        });
    
        // send it for processing here
        videoQueue.add({
            title,
            mp4_location: `${process.env.VIDEO_LOCATION}/${uploadedFileName}`,
            id: id,
        });
    
        return reply.send({
            status: 'OK',
            id: id
        });
    });

}

app.register(auth, { prefix: 'api'});

app.listen({ 
    port : process.env.UPLOAD_PORT,
    host: '0.0.0.0'
}, (err, addr) => {
    if (err) throw err;
    console.log(`Server is running on ${addr}`);
});

app.ready(err => {
    if (err) throw err;
    console.log(app.printRoutes());
});