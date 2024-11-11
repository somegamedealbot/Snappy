const { sequelize, Like } = require('../db/schemas');

async function createMatrix(){
    const likes = await Like.findAll({
        attributes: ['like_value', 'user_id', 'video_id']
    });
    console.log(likes);
}

createMatrix();