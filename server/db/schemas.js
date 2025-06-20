const {Sequelize, DataTypes} = require('sequelize');
require('dotenv').config();

// connect to postgres database instead
const sequelize = new Sequelize(process.env.POSTGRES_URI, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
});

const Like = sequelize.define('UserVideoLike', {
  like_value: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false, // Ensure this field is required
  },
  video_id: {
    type: DataTypes.STRING,
    allowNull: false, // Ensure this field is required
  }
}, {
  indexes: [
    {
      name: 'user_video_id',
      fields: ['user_id', 'video_id'],
      unique: true
    }
  ]
});

const View = sequelize.define('UserVideoView', {
}, {
  // indexes: [
  //   {
  //     name: 'user_video_id',
  //     fields: ['user_id', 'video_id'],
  //     unique: true
  //   }
  // ]
});

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
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    author_id: {
      type: DataTypes.STRING,
      references: {
        model: User,  // or 'Users' if not imported
        key: 'userId'
      },
      allowNull: false,  // Ensures it cannot be null
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
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

module.exports = {
  sequelize, User, Video, Like, View
}