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



// const bcrypt = require('bcryptjs');
// const {v7: uuidv7} = require('uuid');

// const init = async () => {

//     try {
//         await sequelize.sync({
//           // force: true,
//           // alter: true
//           // alter: true
//           // alter
//         }); // Create the table if it doesn't exist
//         console.log('Database & tables created!');
        
//         const salt = await bcrypt.genSalt();
//         const password = await bcrypt.hash('passowrd', salt);

//         let admin = await User.findOne({
//           where: {
//             username: 'admin'  
//           }
//         });

//         if (!admin) {
//           admin = User.build({
//             username: 'admin',
//             email: 'admin@test.com',
//             password: password,
//             key: null,
//             userId: uuidv7()
//           });
//           await admin.save();
//         }

//         // await admin.save();

//         console.log('Created admin user!');

//     } catch (error) {
//       console.error('Unable to create tables:', error);
//     }
// }
// init();

module.exports = {
  sequelize, User, Video, Like, View
}