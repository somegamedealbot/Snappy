const express = require('express');
const session = require('express-session');     
const SQLite = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const apiRouter = require("./api");


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
    console.log(req.url, req.body);
    res.setHeader('X-CSE356', '66d1284d7f77bf55c5003d5a');
    next();
  })

  // Use the router create for the api
  server.use('/api', apiRouter);
  
  server.get('/', (req, res) => {
    // You can pass query parameters here, which can be accessed by the Next.js page
    // return app.render(req, res, '/signUp', { title: 'Custom Page' });
    
    // if user is logged in
    if (req.session?.loggedIn) {
      res.status(200).sendFile('/public/media.html', {root : __dirname});
    }
    else {
      // res.redirect('/login');
      res.status(200);
      res.json({
        status: 'ERROR',
        error: true,
        message: 'Client not logged in'
      });
      // return app.render(req, res, '/signup');
    }
  });
  
  server.get('/login', async(req, res) => {
    return app.render(req, res, '/login');
  });

  server.get('/player', (req, res) => {
    res.status(200).sendFile('/public/media.html', {root : __dirname});
  });

  // server.get('/play/:id', () => {

  // });
  
  // get manifest file
  server.get('/media/output.mpd', (req, res) => {
    // if (req.session.loggedIn){
      res.sendFile('media/5992350-hd_1920_1080_30fps.mpd', {root: __dirname});
    // }
    // else {
    //   res.status(200).json({
    //     status: 'ERROR',
    //     error: true,
    //     message: 'Unauthorized'
    //   });
    // }
  });

  // get chunks
  server.get(['/media/*', /(css|scripts)/], (req, res) => {

    // if (req.session.loggedIn) {
      res.sendFile(req.path, {root: __dirname});
    // }
    // else {
    //   res.status(200).json({
    //     status: 'ERROR',
    //     error: true,
    //     message: 'Unauthorized'
    //   });
    // }
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