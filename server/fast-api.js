const fastify = require('fastify');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Video, Like, View, sequelize } = require("./db/schemas");
const { createClient } = require('redis');
const {sendMail} = require("./sendmail");
const {v7: uuidv7} = require('uuid');

const proxy = require('@fastify/http-proxy');
const { default: axios } = require('axios');
const Queue = require('bull');

// let successLikes = 0; 
// let errorLikes = 0;

const redisConfig = {
    host: '127.0.0.1', // Redis server address
    port: 6379,        // Redis server port
}

const likeQueue = new Queue('likeQueue', {
    redis: redisConfig
});

const redisClient = createClient();
redisClient.connect();

async function unauthApiRoutes(fastify, options){
    fastify.post('/login', async (request, reply) => {
        const {username, password} = request.body;
        // console.log(username);
        try {
        const user = await User.findOne({
            where: {username}
        });
        
        // User is already verified (key is null)
        if (user && user.key == null){
            // const isPasswordValid = user.password == password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            // Successful login
            if (isPasswordValid) {
            request.session.loggedIn = true;
            request.session.userId = user.userId;
            return reply.code(200).send({
                status: 'OK', 
                message: 'Successfully logged in.'
            });
            }
            else {
            return reply.code(200).send({
                status: 'ERROR',
                error: true,
                message: 'Unable to login, username or password was incorrect.'
            });
            }
        }
        else {
            return reply.code(200).send({
            status: 'ERROR',
            error: true,
            message: 'Unable to login, account is not activated.'
            });
        }
    
        }
        catch (err) {
        console.error('Error when finding user', err);
        return reply.code(500).send({
            status: 'ERROR',
            error: true,
            message: 'Error accessing database.'
        });
        }
    
    });

    fastify.get('/verify', async (request, reply) => {
        const {email, key} = request.query;
        
        try {
            const user = await User.findOne({
                where: {email}
            });
            // Successful login

            request.log.info({
                'provided-key': key,
                'actual-key': user.key 
            });

            if (user && user.key == key){
                user.key = null;
                await user.save();
                // return reply.redirect('http://wbill.cse356.compas.cs.stonybrook.edu/login')
                return reply.code(200).send({
                    status: 'OK',
                    message: 'Account successfully verified.'
                });
            }
            else {
                // return reply.redirect('http://wbill.cse356.compas.cs.stonybrook.edu/login')
                return reply.code(200).send({
                    status: 'ERROR',
                    error: true,
                    message: 'Account already verified.'
                });
            }
        }
        catch (error) {
            return reply.code(200).send({
            status: 'ERROR',
            error: true,
            message: 'Unable to verify account',
        });
        }
    });

    fastify.post('/adduser', async (request, reply) => {
        let {username, email, password} = request.body
        try {
            const key = crypto.randomBytes(32).toString('hex');
            const salt = await bcrypt.genSalt();
            password = await bcrypt.hash(password, salt);
            const userId = uuidv7();
            const disabled_user = User.build({
                username,
                email, 
                password,
                key,
                userId
            });
            
            await disabled_user.save();
            
            // send email to target
            await sendMail(email, key);
            return reply.code(200).send({
                status: 'OK',
                message: 'Successfully created account.'
            });
        }
        
        catch(err) {
            console.log('Unable to create user', err)
            return reply.code(200).send({
                status: 'ERROR',
                error: true,
                message: 'Could not create user because username or email is taken, or internal error'
            });
        }
        
    });

}

/**
 * @param {fastify.FastifyInstance} fastify 
 * @param {*} options 
 */
async function authApiRoutes(fastify, options){

    fastify.register(require('@fastify/static'), {
        root: process.env.MPD_LOCATION
    });

    // hook for auth on certain paths if needed 
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

    // fastify.addHook('preHandler', async (request, reply) => {
    //     try {
    //         if (request.session) {
    //             // request.log.info({
    //             //     session: request.session, 
    //             //     test: 'test_msg'
    //             // });
    //             await request.sessionStore.touch(request.session.id);
    //         }
    //     } catch (err) {
    //         request.log.error("Session store error", err);
    //         if (!reply.sent) {
    //             return reply.code(500).send({
    //                 status: 'ERROR',
    //                 error: true,
    //                 message: 'Session error. Please try again.'
    //             });
    //         }
    //     }
    // });
    
    fastify.post('/logout', async (request, reply) => {
        try {
            await new Promise((resolve, reject) => {
                request.session.destroy(err => {
                    if (err) return reject(err);
                    resolve();
                });
            });
            return reply.code(200).clearCookie('connect.sid').send({ 
                status: 'OK',
                message: 'Logout successful' 
            });
        } catch (err) {
            return reply.code(200).send({
                status: 'ERROR',
                error: true, 
                message: 'Logout failed' 
            });
        }
    });
    
    fastify.post('/check-auth', (request, reply) =>{
        return reply.code(200).send({
            status: 'OK',
            isLoggedIn: true,
            userId: request.session.userId // add user id implementation here
        });
    })


    fastify.post('/videos', async(request, reply) => {
        const count = request.body.count;
        const videoId = request.body.videoId?.id ?? undefined;
        const id = request.session.userId;

        console.log(`Count: ${count}, videoId: ${videoId}, userId: ${id}`);

        // request.log.info({
        //     count,
        //     videoId,
        //     id
        // });

        // call recommendation server
        const res = await axios.post(`http://${process.env.RECOMMEND_SERVER}`, {
            count, id, videoId
        },
        {headers: { 'content-type': 'application/x-www-form-urlencoded' }});

        const videoIds = res.data;

        const videos = await Video.findAll({
            // order: sequelize.random(),
            group: sequelize.col('Videos.id'),
            where:{
                id: {
                    [Op.in]: videoIds
                }
            },
            limit: count,
            include: [
                {
                    model: View,
                    required: false,
                    where: {
                        user_id: request.session.userId,
                        // video_id: '$Videos.id$'
                    }
                },
                {
                    model: Like,
                    required: false,
                    where: {
                        user_id: request.session.userId,
                        // video_id: '$Videos.id$'
                    },
                    attributes: ['like_value', 'user_id']
                }
            ]
        });
        
        const vidsInfo = videos.map((vid) => {
            return {
                id: vid.id,
                title: vid.title,
                description: vid.description,
                watched: vid.UserVideoViews[0] ? true : false,
                liked: vid.UserVideoLikes[0] === null ? vid.UserVideoLikes[0].like_value: null,
                likevalues: vid.likes
            }
        })

        // if reply was already sent
        if (!reply.sent) {
            return reply.send({
                status: 'OK',
                videos: vidsInfo
            });
        }
        // stop reply
        else {
            reply.raw.end()
        }

    })
        
    fastify.get('/manifest/:id', (request, reply) => {
        const id = request.params.id;
        const filename = id + '.mpd';
        const folderPath = process.env.MPD_LOCATION + '/' + id;
        
        // request.log.info({filePath: folderPath + filename});
        return reply.sendFile(filename, folderPath);
    });
    
    fastify.get('/thumbnail/:id', (request, reply) => {
        const id = request.params.id;
        const filename = id + '.jpg';
        const folderPath = process.env.MPD_LOCATION + '/' + id;
        return reply.sendFile(filename, folderPath);
    });
    
    // Like value = true, false, null
    fastify.post('/like', async (request, reply) => {
        const video_id = request.body.id;
        const user_id = request.session.userId;
        let like_value = request.body.value;
        
        // uncomment for testing
        if (typeof like_value == 'string') {
            like_value = like_value === 'true' ? true : false
        }

        let cached = await redisClient.hGet(video_id, 'likes');
        // console.log(await redisClient.hGet(video_id, user_id));
        // console.log(await redisClient.hGet(video_id, 'likes'));
        // cache miss
        let likes = 0;
        if (cached === null) {
            let vid = await Video.findByPk(video_id);
            await redisClient.hSet(video_id, {
                'likes': vid.likes
            });

            // spreads the expiration time for redis
            const randomOffset = Math.floor(20 + Math.random() * 40);
            await redisClient.expire(video_id, randomOffset);
            likes = vid.likes

        }
        else {
            likes = parseInt(cached)
            let cached_like = await redisClient.hGet(video_id, user_id);
            // throw error out earlier here for equal values
            if (cached_like === like_value.toString()) {
                // errorLikes += 1
                // console.log('error likes', errorLikes);
                // request.log.info({
                //     errorLikes
                // });
                return reply.code(200).send({
                    status: 'ERROR',
                    error: true, 
                    message: 'User already liked/disliked' 
                });
            }
        }

        let like = await Like.findOne({
            where: {
                user_id,
                video_id
            }
        });
        
        // const parsedLikeValue = like.like_value === true ? "true" : "false";
        const parsedLikeValue = like_value;
        // const video = await Video.findByPk(video_id);
        let updatedLikeCount = 0; 

        // like exists
        if (like) {
            // same as previous like value
            if (like_value === null) {
                // delete the like
                if (like.like_value === true){

                    likeQueue.add({
                        type: 'destroy',
                        user_like_value: like_value,
                        like_num: -1,
                        user_id,
                        video_id
                    })

                    await redisClient.hIncrBy(video_id, 'likes', -1)
                    await redisClient.hSet(video_id,{
                        [user_id]: parsedLikeValue.toString()
                    });
                    updatedLikeCount = likes - 1;
                }
                else {

                    updatedLikeCount = likes;
                }
                await like.destroy();

            }
            // if the cache expired and the user is liking the same way
            else if (parsedLikeValue === like.like_value){
                // stores to cache this time
                await redisClient.hSet(video_id,{
                    [user_id]: parsedLikeValue.toString()
                });
                return reply.code(200).send({
                    status: 'ERROR',
                    error: true, 
                    message: 'User already liked/disliked' 
                });
            }
            else {

                const changeInLikes = parsedLikeValue === true ? 1 : -1;

                await likeQueue.add({
                    type: 'change_like',
                    user_like_value: parsedLikeValue,
                    like_num: changeInLikes,
                    user_id,
                    video_id
                })

                await redisClient.hIncrBy(video_id, 'likes', changeInLikes);
                await redisClient.hSet(video_id, {
                    [user_id]: parsedLikeValue.toString()
                });
                // await redisClient.hSet(video_id, {
                //     'likes': vid.likes
                // });
                updatedLikeCount = likes + changeInLikes;
            }
        }
        // like doesn't exist yet
        else {
            // const cachedVideoId = await redisClient.sIsMember('recent_video_ids', video_id) === null ? false : true;
            const user_value = parsedLikeValue === true ? 1 : -1;
            likeQueue.add({
                type: 'create',
                user_like_value: parsedLikeValue,
                like_num: user_value,
                user_id,
                video_id
            });
            await redisClient.hIncrBy(video_id, 'likes', user_value);
            await redisClient.hSet(video_id, {
                [user_id]: parsedLikeValue.toString()
            });
            updatedLikeCount = likes + user_value;

        }
        // console.log(updatedLikeCount)
        // return # of likes
        // successLikes += 1;
        // console.log('success likes', successLikes);
        // request.log.info({
        //     successLikes
        // });
        return reply.code(200).send({
            status: 'OK',
            likes: updatedLikeCount
        });

    })

    fastify.post('/view', async (request, reply) => {
        const video_id = request.body.id;
        const user_id = request.session.userId;

        let view = await View.findOne({
            where: {
                video_id,
                user_id
            }
        });

        const viewed = view ? true : false;

        if (!view) {
            await View.create({
                video_id,
                user_id
            }, {
                validate: false
            });
        }

        return reply.code(200).send({
            status: 'OK',
            viewed
        });

    });

    fastify.get('/processing-status', async (request, reply) => {
        const user_id = request.session.userId;
        
        // list of videos
        let videos = (await User.findByPk(user_id, {
            include: {
                model: Video,
                attributes: ['title', 'id', 'uploaded']
            }
        })).toJSON().Videos;

        const videosRes = [];

        // add info to each video
        for (let vid of videos) {
            
            videosRes.push({
                id: vid.id,
                title: vid.title,
                status: vid.uploaded ? 'complete' : 'processing'
            });
            
        }

        return reply.send({
            status: 'OK',
            videos: videosRes
        });

    });

}

module.exports = {
    authApiRoutes,
    unauthApiRoutes
}