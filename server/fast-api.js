const fastify = require('fastify');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Video, Like, View } = require("./db/schemas");
const {sendMail} = require("./sendmail");
const {v7: uuidv7} = require('uuid');
const fs = require('fs');
const path = require('path');

const metadata = JSON.parse(fs.readFileSync(process.env.METADATA_LOCATION));


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

    fastify.get('/example', async (request, reply) => {
        return { message: 'This is an example route' };
    });
    
    fastify.post('/logout', (request, reply) => {
        // checks if user's session is logged in
        request.session.destroy(err => {
        if (err) {
            return reply.code(200).send({
            status: 'ERROR',
            error: true, 
            message: 'Logout failed' 
        });
        } 
        else {
            reply.clearCookie('connect.sid');
            return reply.code(200).send({ 
                status: 'OK',
                message: 'Logout successful' 
            });
        }
        });
    });
    
    fastify.post('/check-auth', (request, reply) =>{
        return reply.code(200).send({
            isLoggedIn: true,
            userId: request.session.userId // add user id implementation here
        });
    })
    
    fastify.post('/videos', (request, reply) => {
        const count = parseInt(request.body.count); 
        const videos = fs.readdirSync(path.join(__dirname, 'media', 'thumbnails'));
        const vidsInfo = []
        // randomly select videos
        const metadataKeys = Object.keys(metadata)
        
        const used = {};
        
        for (let i = 0; i < count; i++){
            
            // ensure no repeats
            let filename = metadataKeys[crypto.randomInt(0, metadataKeys.length)]
            while (used[filename] !== undefined){
                filename = metadataKeys[crypto.randomInt(0, metadataKeys.length)]
            }
            used[filename] = true;

            const id = filename.split('.')[0]
            used[filename] = true;
            vidsInfo.push({
                id: id,
                metadata: {
                    title: filename,
                    description: metadata[filename]
                }
            });
        }
        return reply.send({
            videos: vidsInfo,
            status: 'OK'
        });
    });

    fastify.get('/manifest/:id', (request, reply) => {
        const id = request.params.id;
        const idSplit = id.split('.');
        // gets the file extension
        // by default its .mpd
        const ext = idSplit.length > 1 ? '' : '.mpd';
        const folderPath = './media/manifests/' + id + ext;
        request.log.info({filename: folderPath});
        return reply.sendFile(folderPath);
    });
    
    fastify.get('/thumbnail/:id', (request, reply) => {
        const id = request.params.id;
        const folderPath = './media/thumbnails/' + id + '.jpg';
        return reply.sendFile(folderPath);
    });

    // Like value = true, false, null
    fastify.post('/like', async (request, reply) => {
        const video_id = request.body.id;
        const like_value = request.body.value;
        const user_id = request.session.userId;

        // Update / create like
        
        let like = await Like.findOne({
            where: {
                user_id,
                video_id
            }
        });

        // like exists
        if (like) { 
            like.like_value = like_value;
            await like.save();
        }
        // like doesn't exist yet
        else {
            await Like.create({
                like_value,
                user_id, 
                video_id
            });
        }

        // querie for the amount of likes
        const likes = (await Like.findAndCountAll({
            where: {
                video_id
            }
        })).count;
        
        // return # of likes
        return reply.code(200).send({
            likes
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
            videos: videosRes
        });

    });

}

module.exports = {
    authApiRoutes,
    unauthApiRoutes
}