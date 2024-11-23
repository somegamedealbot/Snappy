const fastify = require('fastify');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Video, User } = require('./db/schemas');
const {v7: uuidv7} = require('uuid');
require('dotenv').config();
const { taskQueue } = require('./bull/taskQueue');

const app = fastify({
    // logger: true
});

app.register(require('@fastify/multipart'), {
    limits: {
        fileSize: 1000000000,  // For multipart forms, the max file size in bytes
        files: 1,           // Max number of file fields
        parts: 1000         // For multipart forms, the max number of parts (fields + files)
    },
    attachFieldsToBody: true,
    onFile: async (part) => {
        // const title = this.body.title.value;
        await pipeline(part.file, fs.createWriteStream('/root/videos/' + part.filename));
        part.fields = part.fields || {}; // Ensure fields exists in part object
        part.fields.uploadedFileName = { value: part.filename }; // Add filename
    } 
});

app.post('/', async (request, reply) => {
    // const data = await request.body.mp4File.toBuffer();
    // save video to disk
    // await pipeline(data, fs.createWriteStream('/root/videos/' + data.filename));
    
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
    taskQueue.add({
        title,
        mp4_location: `/root/videos/${uploadedFileName}`,
        id: id,
    });

    return reply.send({
        status: 'OK',
        id: id
    });
});

app.listen({ 
    port : process.env.UPLOAD_PORT,
}, (err, addr) => {
    if (err) throw err;
    console.log(`Server is running on ${addr}`);
});