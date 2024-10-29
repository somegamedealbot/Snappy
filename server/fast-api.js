const fastify = require('fastify');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {sequelize, User} = require("./dbsetup");
const {sendMail} = require("./sendmail");
const {v7: uuidv7} = require('uuid');
const fs = require('fs');
const path = require('path');

const metadata = JSON.parse(fs.readFileSync(process.env.METADATA_LOCATION));

/**
 * @param {fastify.FastifyInstance} fastify 
 * @param {*} options 
 */
async function apiRoutes(fastify, options){

    // hook for auth on certain paths if needed 
    // fastify.addHook('onRequest', async (request, replay) => {
    //     request.rout
    //     const reqAuth = new Set([
    //         '/videos',
    //         '/manifest',

    //     ])
    // })

    fastify.get('/example', async (request, reply) => {
        return { message: 'This is an example route' };
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
                salt,
                key,
                userId
            });
            
            await disabled_user.save();
            
            // send email to target
            await sendMail(email, key);
            return reply.status(200).send({
                status: 'OK',
                message: 'Successfully created account.'
            });
        }
        
        catch(err) {
            console.log('Unable to create user', err)
            return reply.status(200).send({
                status: 'ERROR',
                error: true,
                message: 'Could not create user because username or email is taken, or internal error'
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
                return reply.status(200).send({
                status: 'OK',
                message: 'Account successfully verified.'
                });
            }
            else {
                // return reply.redirect('http://wbill.cse356.compas.cs.stonybrook.edu/login')
                return reply.status(200).send({
                status: 'ERROR',
                error: true,
                message: 'Account already verified.'
                });
            }
        }
        catch (error) {
            return reply.status(200).send({
            status: 'ERROR',
            error: true,
            message: 'Unable to verify account',
        });
        }
    });
    
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
            return reply.status(200).send({
                status: 'OK', 
                message: 'Successfully logged in.'
            });
            }
            else {
            return reply.status(200).send({
                status: 'ERROR',
                error: true,
                message: 'Unable to login, username or password was incorrect.'
            });
            }
        }
        else {
            return reply.status(200).send({
            status: 'ERROR',
            error: true,
            message: 'Unable to login, account is not activated.'
            });
        }
    
        }
        catch (err) {
        console.error('Error when finding user', err);
        return reply.status(500).send({
            status: 'ERROR',
            error: true,
            message: 'Error accessing database.'
        });
        }
    
    });
    
    fastify.post('/logout', (request, reply) => {
        // checks if user's session is logged in
        if (request.session?.loggedIn) {
            request.session.destroy(err => {
            if (err) {
                return reply.status(200).send({
                status: 'ERROR',
                error: true, 
                message: 'Logout failed' 
            });
            } else {
            reply.clearCookie('connect.sid');
            return reply.status(200).send({ 
                status: 'OK',
                message: 'Logout successful' 
            });
            }
        });
        } 
        else {
        return reply.status(200).send({ 
            status: 'ERROR',
            error: true, 
            message: 'No session found' 
        });
        }
    });
    
    fastify.post('/check-auth', (request, reply) =>{
        if (request.session?.loggedIn) {
            return reply.status(200).send({
                isLoggedIn: true,
                userId: request.session.userId // add user id implementation here
            });
        }
        else {
            return reply.status(200).send({ 
                status: 'ERROR',
                error: true, 
                message: 'No session found'
            });
        }
    })
    
    fastify.post('/videos', (request, reply) => {
        if (request.session?.loggedIn) {
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
        }
        else {
            return reply.status(200).send({ 
                status: 'ERROR',
                error: true, 
                message: 'Not logged in.'
            });
        }
    });

    fastify.get('/manifest/:id', (request, reply) => {
        if (request.session?.loggedIn) {
            const id = request.params.id;
            const idSplit = id.split('.');
            // gets the file extension
            // by default its .mpd
            const ext = idSplit.length > 1 ? '' : '.mpd';
            const folderPath = './media/manifests/' + id + ext;
            request.log.info({filename: folderPath});
            return reply.sendFile(folderPath);
        }
        else {
            return reply.status(200).send({ 
                status: 'ERROR',
                error: true, 
                message: 'Not logged in.'
            });
        }
    });
    
    fastify.get('/thumbnail/:id', (request, reply) => {
        if (request.session?.loggedIn) {
            const id = request.params.id;
            const folderPath = './media/thumbnails/' + id + '.jpg';
            return reply.sendFile(folderPath);
        }
        else {
            return reply.status(200).send({ 
                status: 'ERROR',
                error: true, 
                message: 'Not logged in.'
            });
        }
    });
}

module.exports = apiRoutes