const { check, sleep } = require('k6');
const http = require('k6/http');
const { SharedArray } = require('k6/data');
const { Counter, Trend  } = require('k6/metrics');
// const createData = require('./createData');

// Load user and video data from a JSON file (e.g., users.json and videos.json)
const users = new SharedArray('users', () => JSON.parse(open('./users.json')));
const videos = new SharedArray('videos', () => JSON.parse(open('./videos.json')));
let requestDuration = new Trend('request_duration', true); // `true` tracks statistics like max, min, avg, etc.

export let options = {
    // vus: 20,
    // duration: '1s'
    // vus: 50, // Start and maintain 50 VUs
    // duration: '10s', // Run for 1 minute
    stages: [
        { duration: '10s', target: 10 }, // ramp-up
        // { duration: '1m', target: 20 }, // steady state
        // { duration: '10s', target: 0 }  // ramp-down
    ]
};
let globalCounter = new Counter('likes_counter');

const user = users[Math.floor(Math.random() * users.length)];
let logged = false;
let sessionCookie = undefined;

export default function () {
    // let jar = http.cookieJar();
    // Randomly select a user and a video
    const video = videos[Math.floor(Math.random() * videos.length)];
    if (!logged){
        // Log in the user
        let loginRes = http.post('https://wbill.cse356.compas.cs.stonybrook.edu/api/login', JSON.stringify({
          username: user.username,
          password: user.password,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });

        // jar.cookiesForURL('https://wbill.cse356.compas.cs.stonybrook.edu/');
        // console.log(`Set-Cookie header: ${loginRes.headers['Set-Cookie']}`);
        sessionCookie = loginRes.headers['Set-Cookie'].split(';')[0];

        check(loginRes, { 'user logged in': (res) => { 
            // console.log(res.json());
            return res.json('status') === 'OK' 
        }});
        logged = true;
    }
  
    // Extract token from the login response if available
    // let token = loginRes.json('token');
  
    // if (!token) {
    //   console.error(`Login failed for user: ${user.username}`);
    //   return;
    // }
    // for (i in )



    // Like the video
    let likeRes = http.post('https://wbill.cse356.compas.cs.stonybrook.edu/api/like', JSON.stringify({
      id: video,
      value: true,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
    });
    check(likeRes, { 'video liked': (res) => {
        if (res.json('status') == 'OK') {
            globalCounter.add(1); // Increment counter
        }
        return res.status === 200 
    }});

    requestDuration.add(likeRes.timings.duration);
    
    // let relike = http.post('https://wbill.cse356.compas.cs.stonybrook.edu/api/like', JSON.stringify({
    //   id: video,
    //   value: true,
    // }), {
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Cookie': sessionCookie
    //   },
    // });
    // check(relike, { 'video relike failed': (res) => {
    //     if (res.json('status') == 'OK') {
    //         globalCounter.add(1); // Increment counter
    //     }
    //     return res.json('status') === 'ERROR'; 
    // }});

    // let viewRes = http.post('https://wbill.cse356.compas.cs.stonybrook.edu/api/view', JSON.stringify({
    //     id: video,
    //   }), {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Cookie': sessionCookie
    //     },
    //   });
    //   check(viewRes, { 'video liked': (res) => {
    //     // console.log(res.json());
    //     return res.json('status') === 'OK'
    //   }});

    // let authRes = http.post('https://wbill.cse356.compas.cs.stonybrook.edu/api/check-auth', JSON.stringify({
    //     id: video,
    //     value: true,
    //   }), {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Cookie': sessionCookie
    //     },
    //   });
    //   check(authRes, { 'authenticated': (res) => {
    //       // console.log(res.json());
    //       return res.json('status') === 'OK' 
    //   }});
  
    // sleep(0.01); // Simulate user think time
}