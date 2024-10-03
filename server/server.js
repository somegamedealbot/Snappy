const express = require('express');
const session = require('express-session');     
const SQLite = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const next = require('next');
const {sequelize, User} = require("./dbsetup");
const {sendMail} = require("./sendmail");
const path = require('path');

const users = [
  { username: 'testuser', password: bcrypt.hashSync('password', 10), email: 'test@example.com' },
];

// Set the environment (development or production)
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });

// Get the request handler from Next.js
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.use(express.json());
  server.use(express.urlencoded({extended: true}));
  server.use(session({
    store: new SQLite({ db: 'sessions.sqlite', dir: './sessions' }), // Store sessions in an SQLite file
    secret: 'your_secret_key',  // Use a strong secret for signing the session ID
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }));

  server.use((req, res, next) => {
    res.setHeader('X-CSE356', '66d1284d7f77bf55c5003d5a');
    next();
  })

  
  // Custom route: serve a specific Next.js page
  server.get('/', (req, res) => {
    // You can pass query parameters here, which can be accessed by the Next.js page
    // return app.render(req, res, '/signUp', { title: 'Custom Page' });
    
    // if user is logged in
    if (req.session?.loggedIn) {
      res.sendFile('media.html', {root : __dirname});
    }
    else {
      return app.render(req, res, '/signup');
    }
  });
  
  server.post('/adduser', async (req, res) => {
    const {username, email, password} = req.body
    try {
      
      const key = crypto.randomBytes(32).toString();
      const disabled_user = User.build({
        username,
        email, 
        password,
        key
      });
      
      await disabled_user.save();
      
      // send email to target
      await sendMail(email, key);
      res.status(200).json({message: 'Successfully created account.'});
    }
    
    catch(err) {
      console.log('Unable to create user', err)
      res.status(200).json({message: 'Could not create user because username or email is taken.'});
    }
    
  });
  
  server.get('/verify', async (req, res) => {
    const {email, key} = req.query;
    
    try {
      const user = await User.findOne({
        where: {email}
      });
      // Successful login
      if (user && user.key == key){
        user.key = null;
        await user.save();
        res.status(200).json({message: 'Account successfully verified.'});
      }
      else {
        res.status(200).json({message: 'Account already verified.'});
      }
    }
    catch (error) {
      res.status(400).json({message: 'Unable to verify account', error});
    }
  })
  
  // server.get('/login', async(req, res) => {
  //   return app.render(req, res, '/login');
  // });

  server.post('/login', async (req, res) => {
    const {username, password} = req.body;
    
    try {
      const user = await User.findOne({
        where: {username}
      });
      // User is already verified (key is null)
      if (user && user.key == null){
        const isPasswordValid = user.password == password
        // const isPasswordValid = await bcrypt.compare(password, user.password);
        // Successful login
        if (isPasswordValid) {
          req.session.loggedIn = true;
          res.status(200).json({message: 'Successfully logged in.'});
        }
        else {
          res.status(400).json({message: 'Unable to login, username or password was incorrect.'});
        }
      }
      else {
        res.status(400).json({message: 'Unable to login, username or password was incorrect.'});
      }

    }
    catch (err) {
      console.error('Error when finding user', err);
      res.status(500).json({message: 'Error accessing database.'});
    }

  });

  // Logout endpoint
  server.post('/logout', (req, res) => {
    if (req.session?.loggedIn) {
      req.session.destroy(err => {
        if (err) {
          return res.status(200).json({ error: true, message: 'Logout failed' });
        } else {
          res.clearCookie('connect.sid');
          return res.status(200).json({ message: 'Logout successful' });
        }
      });
    } 
    else {
      return res.status(200).json({ error: true, message: 'No session found' });
    }
  });

  // Protected route example (only accessible when logged in)
  server.get('/protected', (req, res) => {
    if (!req.session.user) {
      return res.status(200).json({ error: true, message: 'Unauthorized access' });
    }

    return res.status(200).json({ message: `Hello ${req.session.user.username}` });
  });

  server.get('/media-player', (req, res) => {
    if (!req.session.user) {
      return res.status(200).json({ error: true, message: 'Unauthorized access' });
    }
    res.sendFile(path.join(__dirname, 'media-player.html'));
  });

  // get manifest file
  server.get('/media/output.mpd', (req, res) => {
    if (req.session.loggedIn){
      res.sendFile('media/4781506-uhd_4096_2160_25fps.mpd', {root: __dirname});
    }
    else {
      res.status(401);
    }
  });

  // get chunks
  server.get(['/media/*', /(css|scripts)/], (req, res) => {

    if (req.session.loggedIn) {
      res.sendFile(req.path, {root: __dirname});
    }
    else {
      res.status(401);
    }
  });

  // Handle any other Next.js route
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start the Express server
  server.listen(process.env.PORT, (err) => {
    if (err) throw err;
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
  });
});