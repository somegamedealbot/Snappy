const Queue = require('bull');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util') 
const { Video } = require('../db/schemas');

const execP = promisify(exec);

const redisConfig = {
    host: '127.0.0.1', // Redis server address
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

// create mpd directory if not created
if (!fs.existsSync('/root/cse-356-warmup-project-2/mpds/')) {
    fs.mkdirSync('/root/cse-356-warmup-project-2/mpds/');
}

if (!fs.existsSync(process.env.SEGMENTS_LOCATION)) {
    fs.mkdirSync(process.env.SEGMENTS_LOCATION);
}

if (!fs.existsSync(process.env.THUMBNAILS_LOCATION)) {
    fs.mkdirSync(process.env.THUMBNAILS_LOCATION);
}

// if (!fs.existsSync('../video-info.json')) {
//     fs.writeFileSync('../video-info.json', JSON.stringify(JSON.parse('{}')));
// }

taskQueue.process(1, async (job, done) => {
    const {title, description, mp4_location, id} = job.data;
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
    -map 0:v -b:v:0 254k -s:v:0 320x180 -sws_flags lanczos \\
    -map 0:v -b:v:1 507k -s:v:1 320x180 \\
    -map 0:v -b:v:2 759k -s:v:2 480x270 \\
    -map 0:v -b:v:3 1013k -s:v:3 640x360 \\
    -map 0:v -b:v:4 1254k -s:v:4 640x360 \\
    -map 0:v -b:v:5 1883k -s:v:5 768x432 \\
    -map 0:v -b:v:6 3134k -s:v:6 1024x576 \\
    -map 0:v -b:v:7 4952k -s:v:7 1280x720 \\
    -adaptation_sets "id=0,streams=v" \\
    -init_seg_name 'segments/${id}_init_$RepresentationID$.m4s' \\
    -media_seg_name 'segments/${id}_chunk_$Bandwidth$_$Number$.m4s' \\
    -use_template 1 -use_timeline 1 \\
    -vf "pad=width=max(iw\\,ih*(16/9)):height=ow/(16/9):x=(ow-iw)/2:y=(oh-ih)/2" \\
    -f dash "${process.env.SEGMENTS_LOCATION}/${id}/${id}.mpd"`;
    
        // const execHandler = (error, stdout, stderr) => {
        //     if (error) {
        //         // console.error(`Error: ${error.message}`);
        //         return reject(`Error: ${error.message}`) 
        //     }
        //     if (stderr) {
        //         // console.error(`FFmpeg stderr: ${stderr}`);
        //         return reject(`FFmpeg stderr: ${stderr}`)
        //     }
        //     console.log(`FFmpeg stdout: ${stdout}`);
        //     // resolve(`FFmpeg stdout: ${stdout}`);
        // } 

        await execP(processCmd);

        const thumbnailCmd = `ffmpeg -i "${mp4_location}" \
    -vf "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:black" \
    -frames:v 1 ${thumbnailLocation}`
 
// execute thumbnail creation command
        await execP(thumbnailCmd);

        // update SQL database
        const video = await Video.findByPk(id);
        // console.log(videos);
        console.log(`Processed ${title} (${id})!`);
        // set uploaded flag
        video.uploaded = true;
        await video.save();

        done();

    // return new Promise(async (resolve, reject) => {
        

    //     resolve(`Done processing video with id: ${id}!`);
    // })
})

module.exports = {
    taskQueue
};