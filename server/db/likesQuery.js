const { sequelize, User, Video, View, Like } = require('./schemas');
const { Op } = require('sequelize');

const find = async (userInfos) => {
    let count = 0;

    for (const userInfo of userInfos){
        let user_like_count = 0
        const {username , user_id} = userInfo;
        // find all likes from that user
        console.log('Querying ', username, user_id);

        const likes = await Like.findAll({
            where: {
                user_id: user_id
            },
            attributes: ['video_id'],
        });

        const videoIds = likes.map((like) => like.video_id);

        // console.log('Video_ids', videoIds)
        for (const vid_id of videoIds){

            const otherLikes = await Like.findAll({
                where: {
                    // user_id: userId,
                    video_id: vid_id
                },
                attributes: ['user_id'],
            });
            const res = otherLikes.map((like) => like.user_id);
            count += res.length;
            user_like_count += res.length;
            console.log(vid_id, res); 

        }

        console.log('Done' , count, user_like_count);

        // find all likes on each video, see if anyone else liked it
    }

    console.log('total likes', count);

}

(async () => {
    const users = await User.findAll({
        where: {
            username: {
                [Op.like]: 'Grader%' // Case-sensitive prefix match
            }
        },
        attributes: ['username', 'userId'] // Optional: Select only the username column
    });
    
    const userInfo = users.map((user) => {
        return {
            user_id: user.userId, 
            username: user.username
        }
    });

    await find(userInfo);

    // for (const user of users) {
    //     // await find([user.])

    // }

    // await find(['01936250-5860-711f-b1b0-9e99ebc1c9d9']);
    // await find(['01936250-5632-711f-b1b0-77f2b65acbba']);
})();
