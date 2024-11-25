const http = require('k6/http');
const {sequelize, User, Video, Like, View} = require('../server/db/schemas');

