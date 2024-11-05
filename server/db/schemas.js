const {Sequelize, DataTypes} = require('sequelize');

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

module.exports = {
  sequelize, User, Video, Like, View
}