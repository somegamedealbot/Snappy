const { sequelize, User } = require('./schemas');
const bcrypt = require('bcryptjs');
const {v7: uuidv7} = require('uuid');

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

module.exports = init;