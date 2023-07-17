const config = require('../../config');
const pgTools = require('pgtools');
const logger = require('../app/logger');
const dotEnv = require('dotenv');
dotEnv.config();

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
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      host: process.env.DB_HOST
    }, process.env.DB_DATABASE, function (error, response) {
      if (!error) {
        console.log('db ' + process.env.DB_DATABASE + ' did not exists. Created it!');
        resolve();
      } else {
        reject(error);
      }
    });
  });
}
