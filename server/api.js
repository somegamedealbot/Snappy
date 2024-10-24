const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const apiRouter = express.Router();
const {sequelize, User} = require("./dbsetup");
const {sendMail} = require("./sendmail");
const {v7: uuidv7} = require('uuid');

apiRouter.post('/adduser', async (req, res) => {
    const {username, email, password} = req.body
    try {
      
      const key = crypto.randomBytes(32).toString('hex');
        const salt = await bcrypt.genSalt();
        password = await bcrypt.hash(passowrd, salt);
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
      res.status(200).json({
        status: 'OK',
        message: 'Successfully created account.'
      });
    }
    
    catch(err) {
      console.log('Unable to create user', err)
      res.status(200).json({
        status: 'ERROR',
        error: true,
        message: 'Could not create user because username or email is taken, or internal error'
      });
    }
    
});

apiRouter.get('/verify', async (req, res) => {
    const {email, key} = req.query;
    
    try {
      const user = await User.findOne({
        where: {email}
      });
      // Successful login
      if (user && user.key == key){
        user.key = null;
        await user.save();
        res.status(200).json({
          status: 'OK',
          message: 'Account successfully verified.'
        });
      }
      else {
        res.status(200).json({
          status: 'ERROR',
          error: true,
          message: 'Account already verified.'
        });
      }
    }
    catch (error) {
      res.status(200).json({
        status: 'ERROR',
        error: true,
        message: 'Unable to verify account',
      });
    }
});

apiRouter.post('/login', async (req, res) => {
    const {username, password} = req.body;
    
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
          req.session.loggedIn = true;
          req.session.userId = user.userId;
          res.status(200).json({
            status: 'OK', 
            message: 'Successfully logged in.'
          });
        }
        else {
          res.status(200).json({
            status: 'ERROR',
            error: true,
            message: 'Unable to login, username or password was incorrect.'
          });
        }
      }
      else {
        res.status(200).json({
          status: 'ERROR',
          error: true,
          message: 'Unable to login, account is not activated.'
        });
      }

    }
    catch (err) {
      console.error('Error when finding user', err);
      res.status(500).json({
        status: 'ERROR',
        error: true,
        message: 'Error accessing database.'
      });
    }

});

apiRouter.post('/logout', (req, res) => {
    // checks if user's session is logged in
    if (req.session?.loggedIn) {
      req.session.destroy(err => {
        if (err) {
          return res.status(200).json({
            status: 'ERROR',
            error: true, 
            message: 'Logout failed' 
          });
        } else {
          res.clearCookie('connect.sid');
          return res.status(200).json({ 
            status: 'OK',
            message: 'Logout successful' 
          });
        }
      });
    } 
    else {
      return res.status(200).json({ 
        status: 'ERROR',
        error: true, 
        message: 'No session found' 
      });
    }
});

apiRouter.post('/check-auth', (req, res) =>{
    if (req.session?.loggedIn) {
        return res.status(200).json({
            isLoggedIn: true,
            userId: req.session.userId // add user id implementation here
        });
    }
    else {
        return res.status(200).json({ 
            status: 'ERROR',
            error: true, 
            message: 'No session found'
        });
    }
})

apiRouter.post('/videos', (req, res) => {

});

apiRouter.get('/manifest/:id', (req, res) => {

});

apiRouter.get('/thumbnail/:id', (req, res) => {

});

module.exports = apiRouter;