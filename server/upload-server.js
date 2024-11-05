const fastify = require('fastify');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Video } = require('./db/schemas');
const {v7: uuidv7} = require('uuid');
const { taskQueue } = require('./bull/taskQueue');
require('dotenv').config();

const app = fastify({
    logger: true
});

app.register(require('@fastify/multipart'), {
    limits: {
        fileSize: 1000000000,  // For multipart forms, the max file size in bytes
        files: 1,           // Max number of file fields
        parts: 1000         // For multipart forms, the max number of parts (fields + files)
    }
});

app.post('/upload', async (request, reply) => {
    const data = await request.file();
    
    // save video to disk
    await pipeline(data.file, fs.createWriteStream('/root/videos/' + data.filename));
    
    // create new video record
    const id = uuidv7();
    await Video.create({
        id: id,
        title: request.body.title,
        author: request.body.author 
    });

    // send it for processing here
    taskQueue.add({
        mp4_location: `/root/videos/${request.body.title}`,
        id: id,
    });

    return reply.send({
        id: 'id_here'
    });
});

app.listen({ 
    port : process.env.UPLOAD_PORT,
}, (err, addr) => {
    if (err) throw err;
    console.log(`Server is running on ${addr}`);
});