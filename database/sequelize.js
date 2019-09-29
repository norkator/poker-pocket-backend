// https://www.codementor.io/mirko0/how-to-use-sequelize-with-node-and-express-i24l67cuz

// Components
const config = require('../config');
const Sequelize = require('sequelize');

// Models
const UserModel = require('../models/user');
const StatisticModel = require('../models/statistic');


// Sequelize instance
const sequelize = new Sequelize(config.postgreSql.database, config.postgreSql.user, config.postgreSql.password, {
  host: config.postgreSql.host,
  dialect: 'postgres', // 'mysql'|'mariadb'|'sqlite'|'postgres'|'mssql',
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


// Sync with database
sequelize.sync(/*{force: true}*/) // Do not use force, will drop table
  .then(() => {
  });


// Export models
module.exports = {
  User,
  Statistic,
};
