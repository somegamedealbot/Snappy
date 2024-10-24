const {Sequelize, DataTypes} = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'main.db',
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
    salt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key: {
        type: DataTypes.STRING
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
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

const init = async () => {
    try {
        await sequelize.sync({
          force: true
        }); // Create the table if it doesn't exist
        console.log('Database & tables created!');
    } catch (error) {
        console.error('Unable to create table:', error);
    }
}
init();
module.exports = {
  sequelize, User
}