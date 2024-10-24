const fastify = require('fastify');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {sequelize, User} = require("./dbsetup");
const {sendMail} = require("./sendmail");
const {v7: uuidv7} = require('uuid');
/**
 * @param {fastify.FastifyInstance} fastify 
 * @param {*} options 
 */
module.exports = async (fastify, options) => {

    fastify.post('/adduser', async (request, reply) => {
        const {username, email, password} = request.body
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
        reply.status(200).send({
            status: 'OK',
            message: 'Successfully created account.'
        });
        }
        
        catch(err) {
        console.log('Unable to create user', err)
        reply.status(200).send({
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
        if (user && user.key == key){
            user.key = null;
            await user.save();
            reply.status(200).send({
            status: 'OK',
            message: 'Account successfully verified.'
            });
        }
        else {
            reply.status(200).send({
            status: 'ERROR',
            error: true,
            message: 'Account already verified.'
            });
        }
        }
        catch (error) {
        reply.status(200).send({
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
            reply.status(200).send({
                status: 'OK', 
                message: 'Successfully logged in.'
            });
            }
            else {
            reply.status(200).send({
                status: 'ERROR',
                error: true,
                message: 'Unable to login, username or password was incorrect.'
            });
            }
        }
        else {
            reply.status(200).send({
            status: 'ERROR',
            error: true,
            message: 'Unable to login, account is not activated.'
            });
        }
    
        }
        catch (err) {
        console.error('Error when finding user', err);
        reply.status(500).send({
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
    
    });
    
    fastify.get('/manifest/:id', (request, reply) => {
    
    });
    
    fastify.get('/thumbnail/:id', (request, reply) => {
    
    });
}