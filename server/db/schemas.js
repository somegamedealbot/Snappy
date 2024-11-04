const {Sequelize, DataTypes} = require('sequelize');
const bcrypt = require('bcryptjs');
const {v7: uuidv7} = require('uuid');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'main.db',
});

const Like = sequelize.define('UserVideoLike', {
  like_value: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  }
});

const View = sequelize.define('UserVideoView', {
});

const Video = sequelize.define('Videos', 
  {
    id: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      primaryKey: true
    },
    uploaded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // author_id: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    //   unique: true
    // },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }
)

const User = sequelize.define('Users', 
  {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true
    }
  },
  {
    indexes: [
      {
        name: 'users_email',
        unique: true,
        fields: ['email']
      },
      {
        name: 'users_username',
        unique: true,
        fields: ['username']
      }
    ]
  }
);

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

const init = async () => {
    try {
        await sequelize.sync({
          // force: true,
          // force: true
          alter: true
          // alter
        }); // Create the table if it doesn't exist
        console.log('Database & tables created!');
        
        const salt = await bcrypt.genSalt();
        const password = await bcrypt.hash('passowrd', salt);

        const admin = User.build({
          username: 'admin',
          email: 'admin@test.com',
          password: password,
          key: null,
          userId: uuidv7()
        })

        await admin.save();

        console.log('Created admin user!');

    } catch (error) {
      console.error('Unable to create tables:', error);
    }
}
init();
module.exports = {
  sequelize, User, Video, Like, View
}