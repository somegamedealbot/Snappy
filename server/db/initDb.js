const { sequelize, User, Video, View, Like } = require('./schemas');
const bcrypt = require('bcryptjs');
const {v7: uuidv7} = require('uuid');

const init = async () => {

    try {

      // One to many relationship User:Video
      User.hasMany(Video, {foreignKey: 'author_id'});
      Video.belongsTo(User);

      // One to many relationship User:View and Video:View
      User.hasMany(View, {foreignKey: 'user_id'});
      Video.hasMany(View, {foreignKey: 'video_id'});
      View.belongsTo(User);
      View.belongsTo(Video);

      // One to many relationshop User:Like and Video:Like
      User.hasMany(Like, {foreignKey: 'user_id'}); 
      Video.hasMany(Like, {foreignKey: 'video_id'});
      Like.belongsTo(User);
      Like.belongsTo(Video);

      await sequelize.sync({
        // force: true,
        force: true
        // alter: true
        // alter
      }); // Create the table if it doesn't exist
      console.log('Database & tables created!');
      
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('passowrd', salt);

      // check if admin user already exists

      let admin = await User.findOne({
        where: {
          username: 'admin'  
        }
      });

      if (!admin) {
        admin = User.build({
          username: 'admin',
          email: 'admin@test.com',
          password: password,
          key: null,
          userId: uuidv7()
        });
        await admin.save();
      }
      
      console.log('Created admin user!');

    } catch (error) {
      console.error('Unable to create tables:', error);
    }
}

module.exports = init;