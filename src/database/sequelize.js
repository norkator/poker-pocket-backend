// Components
const config = require('../../config');
const Sequelize = require('sequelize');
const dotEnv = require('dotenv');
dotEnv.config();

// Models
const UserModel = require('../models/user');
const StatisticModel = require('../models/statistic');


// Sequelize instance
const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT,
  pool: {
    max: 10,
    min: 0,
    idle: 10000
  },
  logging: function (str) {
    if (config.sequelize.logging) {
      console.log(str);
    }
  },
});


// Initialize models
const User = UserModel(sequelize, Sequelize);
const Statistic = StatisticModel(sequelize, Sequelize);


// Define relations
User.hasMany(Statistic);


// Sync with database
sequelize.sync(/*{force: true}*/) // Do not use force, will drop table
  .then(() => {
  });


// Export models
module.exports = {
  User,
  Statistic,
};
