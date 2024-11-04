const Queue = require('bull');
const fs = require('fs');
const { exec } = require('child_process');
const { Video } = require('../db/schemas');

const redisConfig = {
    host: '127.0.0.1', // Redis server address
    port: 6379,        // Redis server port
}

const uploadQueue = new Queue('uploadQueue', {
    redis: redisConfig
});

const taskQueue = new Queue('videoQueue', {
    redis: redisConfig
});

// create mpd directory if not created
if (!fs.existsSync('/root/cse-356-warmup-project-2/mpds/')) {
    fs.mkdirSync('/root/cse-356-warmup-project-2/mpds/');
}

uploadQueue.process(1, (job) => {

    // return new Promise((resolve, reject) => {

    // })

})

taskQueue.process(5 , (job) => {
    const {title, mp4_location, id} = job.data;
    const mpdLocation = `${process.env.MPD_LOCATION}/${id}.mpd`
    const segmentLocation = `${process.env.SEGMENTS_LOCATION}/${id}/segments`
    const thumbnailLocation = `${process.env.THUMBNAILS_LOCATION}/${id}.jpg`

    // check if directories already exist or not
    // creates them if not
    if (!fs.existsSync(segmentLocation)) {
        fs.mkdirSync(segmentLocation);
    }
    
    if (!fs.existsSync(thumbnailLocation)) {
        fs.mkdirSync(thumbnailLocation);
    }

    return new Promise(async (resolve, reject) => {
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
    -init_seg_name "${segmentLocation}/init_$RepresentationID$.m4s" \\
    -media_seg_name "${segmentLocation}/chunk_$Bandwidth$_$Number$.m4s" \\
    -use_template 1 -use_timeline 1 \\
    -vf "pad=width=max(iw\\,ih*(16/9)):height=ow/(16/9):x=(ow-iw)/2:y=(oh-ih)/2" \\
    -f dash "${mpdLocation}"
`;
        
        const execHandler = (error, stdout, stderr) => {
            if (error) {
                // console.error(`Error: ${error.message}`);
                return reject(`Error: ${error.message}`) 
            }
            if (stderr) {
                // console.error(`FFmpeg stderr: ${stderr}`);
                return reject(`FFmpeg stderr: ${stderr}`)
            }
            console.log(`FFmpeg stdout: ${stdout}`);
            // resolve(`FFmpeg stdout: ${stdout}`);
        } 

        // execute process video command
        exec(processCmd, execHandler);

        const thumbnailCmd = `ffmpeg -i ${input_file} \\ 
    -vf "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:black" \\
    -frames:v 1 ${thumbnailLocation}
`
 
// execute thumbnail creation command
        exec(thumbnailCmd, execHandler);

        // update SQL database
        const video = await Video.findOne({
            where: {
                id
            }
        });

        // set uploaded flag
        video.uploaded = true;
        await video.save();

        resolve(`Done processing video with id: ${id}!`);
    })
})

module.exports = {
    taskQueue,
    uploadQueue
};