const fs = require('fs');
const { Video, User } = require('./schemas');

const loadData = async () => {if (fs.existsSync('../video-info.json')) {

    const videoInfo = JSON.parse(fs.readFileSync('../video-info.json'));
    const videoKeys = Object.keys(videoInfo);
    const videos = [];
    let admin = await User.findOne({
        where: {
          username: 'admin'
        }
    });
    
    for (const id of videoKeys){
        const { title, description, author} = videoInfo[id]; 
        // const newVideo = Video.build({
        //     id,
        //     title,
        //     description,
        //     author: 'admin', // for now
        //     author_id: admin.userId
        // });
        videos.push({
            id,
            title,
            description,
            uploaded: true,
            author: 'admin', // for now
            author_id: admin.userId
        });
        // await newVideo.save();
        console.log(`Added video: [${title}]:${id}`);
    }

    Video.bulkCreate(videos, {
        validate: true
    });

}
else {
    console.log('Unable to load inital data to db. video-info.json does not exist');
}};

module.exports = loadData;