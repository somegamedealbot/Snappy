const fs = require('fs');
const {Video, User, sequelize} = require('./db/schemas');
// load in videos metadata
require('dotenv').config();
const metadata = JSON.parse(fs.readFileSync(process.env.METADATA_LOCATION));
const {v7: uuidv7} = require('uuid');

const { taskQueue } = require('./bull/taskQueue');

const keys = Object.keys(metadata);

// clear database


// create video-info.json file if it doesn't exist
if (!fs.existsSync('/root/video-info.json')) {

    const videoInfo = {};
    // build json file
    for (const key of keys){
        const vidId = uuidv7();
        const title = key.split('.')[0];
        const description = metadata[key];
        
        videoInfo[vidId] = {
            title,
            description,
            filename: key,
            author: 'admin' // for now
        }
        
    }
    
    // write to json file
    fs.writeFileSync('/root/video-info.json', JSON.stringify(videoInfo));

}

(async () => {

    const videoInfo = JSON.parse(fs.readFileSync('/root/video-info.json'));
    const videoKeys = Object.keys(videoInfo);
    let queued = 0;
    for (const id of videoKeys){
        if (queued === 100) {
            break;
        }
        const { title, description, author, filename } = videoInfo[id]; 

        let admin = await User.findOne({
            where: {
              username: author  
            }
        });

        const newVideo = Video.build({
            id,
            title,
            description,
            author, // for now
            author_id: admin.userId
        });

        await newVideo.save();

        await taskQueue.add({
            title,
            mp4_location: `/root/videos/${filename}`,
            id,
        }, {
            attempts: 3
        });

        queued += 1;
        console.log(`Added task: [${title}]:${id}`);
    }

    // close queue gracefully
    taskQueue.on("drained", async () => {
        await taskQueue.close();
        console.log('Finished Processing Videos!');
    });

})();
