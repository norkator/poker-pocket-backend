const config = require('../../config');
const pgTools = require('pgtools');
const logger = require('../app/logger');
const dotEnv = require('dotenv');
dotEnv.config();

async function initDatabase() {
  try {
    await pgTools.createdb({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      host: process.env.DB_HOST
    }, process.env.DB_DATABASE);
  } catch (error) {
    if (String(error).includes('Attempted to create a duplicate database')) {
      console.info('Database already exists, code 42P04, this can be ignored.')
    } else {
      console.error(error);
    }
  }
}

exports.initDatabase = initDatabase;
