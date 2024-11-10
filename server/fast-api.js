const fastify = require('fastify');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Video, Like, View, sequelize } = require("./db/schemas");
const {sendMail} = require("./sendmail");
const {v7: uuidv7} = require('uuid');

async function unauthApiRoutes(fastify, options){
    fastify.post('/login', async (request, reply) => {
        const {username, password} = request.body;
        
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
            return reply.code(200).send({ 
                status: 'ERROR',
                error: true, 
                message: 'User not logged in. No session found.'
            });
        }
    });

    fastify.addHook('preHandler', async (request, reply) => {
        try {
            if (request.session) {
                request.log.info({
                    session: request.session, 
                    test: 'test_msg'
                });
                await request.sessionStore.touch(request.session.id);
            }
        } catch (err) {
            request.log.error("Session store error", err);
            return reply.code(500).send({
                status: 'ERROR',
                error: true,
                message: 'Session error. Please try again.'
            });
        }
    });
    
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
    
    fastify.post('/videos', async (request, reply) => {
        const maxRetries = 3;
        let attempt = 0;
        const count = parseInt(request.body.count);
        const vidsInfo = []
        while (attempt < maxRetries) {
            try {
                // temporary randomly select videos
                const videos = await Video.findAll({
                    order: sequelize.random(),
                    group: 'id',
                    limit: count,
                });
                
                const vidsInfo = videos.map(vid => ({
                    id: vid.id,
                    metadata: {
                      title: vid.title,
                      description: vid.description
                    }
                }));
    
                return reply.send({
                    status: 'OK',
                    videos: vidsInfo
                });
                
            }

            catch(error) {
                attempt += 1;
                request.log.warn(`Attempt ${attempt} failed: ${error.message}`);
    
                // If all retries fail, log the error and send a 500 response
                if (attempt === maxRetries) {
                    request.log.error('Max retry attempts reached.');
                    return reply.code(500).send({
                        status: 'ERROR',
                        message: 'Failed to retrieve videos after multiple attempts',
                    });
                }
            }
        }
    });

    fastify.post('/videos-test', async(request, reply) => {
        const maxRetries = 3;
        let attempt = 0;
        const count = parseInt(request.body.count);
        const vidsInfo = []
        while (attempt < maxRetries) {
            try {
                // temporary randomly select videos
                const videos = await Video.findAll({
                    // order: sequelize.random(),
                    group: sequelize.col('Videos.id'),
                    // limit: count,
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
                            required: true,
                            where: {
                                user_id: request.session.userId,
                                // video_id: '$Videos.id$'
                            },
                            attributes: ['like_value', 'user_id']
                        }
                    ]
                });
    
                for (const vid of videos) {
                    // vidsInfo.push 
                    // vidsInfo.push({
                    //     id: vid.id,
                    //     title: vid.title,
                    //     description: vid.description,
                    //     watched: vid.UserVideoViews[0] ? true : false,
                    //     liked: vid.UserVideoLikes[0] ? vid.UserVideoLikes[0].like_value: null
                    // });
                }
    
                return reply.send({
                    status: 'OK',
                    videos: videos
                });
            }

            catch(error) {
                attempt += 1;
                request.log.warn(`Attempt ${attempt} failed: ${error.message}`);
    
                // If all retries fail, log the error and send a 500 response
                if (attempt === maxRetries) {
                    request.log.error('Max retry attempts reached.');
                    return reply.code(500).send({
                        status: 'ERROR',
                        message: 'Failed to retrieve videos after multiple attempts',
                    });
                }
            }
        }
    })

    fastify.get('/manifest/:id', (request, reply) => {
        const id = request.params.id;
        const filename = id + '.mpd';
        const folderPath = process.env.MPD_LOCATION + '/' + id;
        
        request.log.info({filePath: folderPath + filename});
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
        const like_value = request.body.value;
        const user_id = request.session.userId;

        let updatedLikeCount = 0; 

        request.log.info({
            likeInfo: {
                video_id,
                like_value,
                user_id
            }
        });
        // Update / create like
        let like = await Like.findOne({
            where: {
                user_id,
                video_id
            }
        });
        
        // const parsedLikeValue = like.like_value === true ? "true" : "false";
        const parsedLikeValue = like_value;
        const video = await Video.findByPk(video_id);

        // like exists
        if (like) {
            // same as previous like value
            if (like_value === null) {
                // delete the like
                if (like.like_value === true){
                    video.likes -= 1;
                    await video.save();
                }
                updatedLikeCount = video.likes;
                await like.destroy();

            }
            else if (parsedLikeValue === like.like_value){
                return reply.code(200).send({
                    status: 'ERROR',
                    error: true, 
                    message: 'User already liked/disliked' 
                });
            }
            else {
                if (like_value !== null){
                    like.like_value = parsedLikeValue;
                    await like.save();

                    const changeInLikes = parsedLikeValue === true ? 1 : -1;
                    video.likes += changeInLikes;
                    await video.save();
                    updatedLikeCount = video.likes;
                }
            }
        }
        // like doesn't exist yet
        else {
            await Like.create({
                like_value: parsedLikeValue,
                user_id, 
                video_id
            });

            if (parsedLikeValue === true) {
                video.likes += 1;
                await video.save();
            }

            updatedLikeCount = video.likes;
        }
        
        // return # of likes
        return reply.code(200).send({
            status: 'OK',
            likes: updatedLikeCount
        });

    })

    // figure out whether to use a different server for this part
    // fastify.post('/upload', (request, reply) => {

    // })
    fastify.register(require('@fastify/http-proxy'), {
        upstream: `http://${process.env.UPLOAD_SERVER}`,
        prefix: '/upload',
    });

    fastify.post('/view', async (request, reply) => {
        const video_id = request.body.id;
        const user_id = request.session.userId;

        request.log.info({
            viewInfo: {
                video_id,
                user_id
            }
        });
        
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