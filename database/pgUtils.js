const config = require('../config');
const pgTools = require('pgtools');
const logger = require('../app/logger');

/**
 * This scripts makes sure we have database
 * it run's every time api starts
 * https://javascript.info/promise-chaining
 * @type {Promise}
 */
function initDatabase() {
  return new Promise(function (resolve, reject) {
    createDatabase().then(() => {
      resolve();
    }).catch(error => {
      // console.log(error);
      resolve();
    })
  });
}

exports.initDatabase = initDatabase;


/**
 * Create main database if not exists
 */
function createDatabase() {
  return new Promise(function (resolve, reject) {
    logger.log('>>> pgTools check database existence', logger.LOG_GREEN);
    pgTools.createdb({
      user: config.postgreSql.user,
      password: config.postgreSql.password,
      port: config.postgreSql.port,
      host: config.postgreSql.host
    }, config.postgreSql.database, function (error, response) {
      if (!error) {
        console.log('db ' + config.postgreSql.database + ' did not exists. Created it!');
        resolve();
      } else {
        reject(error);
      }
    });
  });
}
