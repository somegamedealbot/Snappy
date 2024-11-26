const {sequelize, User, Video, Like, View} = require('../server/db/schemas');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const { faker } = require('@faker-js/faker');
require('dotenv').config();
const {v7: uuidv7} = require('uuid');

// Function to generate random users
const generateRandomUsers = async (numUsers) => {
    const users = [];
    const salt = await bcrypt.genSalt();
    let password = faker.internet.password()
    let hashedPassword = await bcrypt.hash(password, salt);
    for (let i = 0; i < numUsers; i++) {
      const user = {
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: hashedPassword,
        key: null,
        userId: uuidv7(),
      };
      await User.create(user);
      user.password = password;
      users.push(user);
    }
  
    return users;
};

const getVideos = async () => {
    const videos = await Video.findAll();

    const vidsList = videos.map((vid) => {
        return vid.id
    });

    return vidsList; 
}
  
  // Main script
  const createData = async () => {
    try {
      const numUsers = 50; // Specify the number of users to generate
      const users = await generateRandomUsers(numUsers);
    
      // Save users to a local JSON file
      fs.writeFileSync('./users.json', JSON.stringify(users, null, 2), 'utf8');
      console.log(`Successfully generated ${numUsers} users and saved to users.json`);
    } catch (error) {
      console.error('Error generating users:', error);
    } 

    // get all videos
    try {
      const vidIds = await getVideos();
      fs.writeFileSync('./videos.json', JSON.stringify(vidIds, null, 2), 'utf8');
      console.log(`Successfully fetched videos and saved to videos.json`);
    }
    catch(error) {
      console.error('Error fetching video ids:' ,error);
    }

  await sequelize.close()
};
  
createData();