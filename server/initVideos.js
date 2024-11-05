const fs = require('fs');
const {Video, sequelize} = require('./db/schemas');
// load in videos metadata
const metadata = JSON.parse(fs.readFileSync(process.env.METADATA_LOCATION));
const {v7: uuidv7} = require('uuid');

const { taskQueue, uploadQueue } = require('./bull/taskQueue');

const keys = Object.keys(metadata);

for (const key of keys){
    const vidId = uuidv7();
    const title = key.split('.')[0];
    const newVideo = Video.build({
        id: vidId,
        title,
        author: 'unknown', // for now
    });

    await newVideo.save();

    // send to bull for processing
    taskQueue.add({
        mp4_location: `/root/videos/${key}`,
        id: vidId,
    });
    
}