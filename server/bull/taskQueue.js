const Queue = require('bull');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util') 
const { Video } = require('../db/schemas');

const execP = promisify(exec);

const redisConfig = {
    host: '10.0.3.215', // Redis server address
    port: 6379,        // Redis server port
}

const taskQueue = new Queue('videoQueue', {
    redis: redisConfig
});

// clears queue of any
taskQueue.empty();
taskQueue.clean(0, 'failed');
taskQueue.clean(0, 'paused');
taskQueue.clean(0, 'wait');
taskQueue.clean(0, 'delayed');
taskQueue.clean(0, 'active');

if (!fs.existsSync(process.env.SEGMENTS_LOCATION)) {
    console.log(process.env.SEGMENTS_LOCATION);
    fs.mkdirSync(process.env.SEGMENTS_LOCATION);
}

if (!fs.existsSync(process.env.THUMBNAILS_LOCATION)) {
    fs.mkdirSync(process.env.THUMBNAILS_LOCATION);
}

taskQueue.process(4, async (job, done) => {
    const {title, mp4_location, id} = job.data;
    // const mpdLocation = `${process.env.MPD_LOCATION}/${id}.mpd`
    // const segmentLocation = `${process.env.SEGMENTS_LOCATION}/${id}/segments`
    const thumbnailLocation = `${process.env.THUMBNAILS_LOCATION}/${id}/${id}.jpg`

    // console.log(job.data);

    // check if directories already exist or not
    // creates them if not
    if (!fs.existsSync(`${process.env.SEGMENTS_LOCATION}/${id}/segments`)) {
        fs.mkdirSync(`${process.env.SEGMENTS_LOCATION}/${id}/segments` , { recursive: true});
    }

    const processCmd = `ffmpeg -i "${mp4_location}" \\
    -map 0:v -b:v:0 512k -s:v:0 640x360 \\
    -map 0:v -b:v:1 768k -s:v:1 960x540 \\
    -map 0:v -b:v:2 1024k -s:v:2 1280x720 \\
    -preset fast \\
    -adaptation_sets "id=0,streams=v" \\
    -init_seg_name 'segments/${id}_init_$RepresentationID$.m4s' \\
    -media_seg_name 'segments/${id}_chunk_$Bandwidth$_$Number$.m4s' \\
    -use_template 1 -use_timeline 1 \\
    -vf "pad=width=max(iw\\,ih*(16/9)):height=ow/(16/9):x=(ow-iw)/2:y=(oh-ih)/2" \\
    -f dash "${process.env.SEGMENTS_LOCATION}/${id}/${id}.mpd"`;
    
        await execP(processCmd);

        const thumbnailCmd = `ffmpeg -i "${mp4_location}" \
    -vf "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:black" \
    -frames:v 1 ${thumbnailLocation}`
 
// execute thumbnail creation command
    await execP(thumbnailCmd);

    // update SQL database
    const video = await Video.findByPk(id);

    if (video) {
        // console.log(videos);
        console.log(`Processed ${title} (${id})!`);
        // set uploaded flag
        video.uploaded = true;
        await video.save();

    }
    else {
        console.log('ERROR: NO VIDEO FOUND IN DATA BASED FROM ID: ', id);
    }

    done();

})

// module.exports = {
//     taskQueue
// };