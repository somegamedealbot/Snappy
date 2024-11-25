const Queue = require('bull');
const { Video, Like } = require('./db/schemas');

const redisConfig = {
    host: '127.0.0.1', // Redis server address
    port: 6379,        // Redis server port
}

const likeQueue = new Queue('likeQueue', {
    redis: redisConfig
});

// clears queue of any
likeQueue.empty();
likeQueue.clean(0, 'failed');
likeQueue.clean(0, 'paused');
likeQueue.clean(0, 'wait');
likeQueue.clean(0, 'delayed');
likeQueue.clean(0, 'active');


likeQueue.process(8, async (job) => {
    const {type, user_like_value, user_id, video_id} = job.data;
    
    if (type === 'destroy') {

        await Video.decrement({
            likes: 1,
        }, {
            where: {
                id: video_id
            },
        });

        let like = await Like.findOne({
            where: {
                user_id,
                video_id
            }
        });

        await like.destroy();


    }
    else if (type === 'change_like') {
        
        let like = await Like.findOne({
            where: {
                user_id,
                video_id
            }
        });
        like.like_value = user_like_value;
        like.save({
            validate: false
        });

        await Video.increment({
            likes: user_like_value,
        }, {
            where: {
                id: video_id
            }
        });
    }
    else if (type === 'create') {
        await Like.create({
            like_value: user_like_value,
            user_id, 
            video_id
        }, {
        });

        if (user_like_value === true) {

            let res = await Video.increment({
                likes: 1,
            }, {
                where: {
                    id: video_id
                }
            });
        }

    }


    // done();
})

// module.exports = {
//     taskQueue
// };