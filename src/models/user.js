/**
 * User model for database
 * @param sequelize
 * @param type data types
 * @returns {*|void|target}
 */
module.exports = (sequelize, type) => {
  return sequelize.define('user', {
    id: {
      type: type.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: type.STRING,
    xp: {type: type.INTEGER, defaultValue: 0},
    money: {type: type.NUMERIC, defaultValue: 0},
    win_count: {type: type.INTEGER, defaultValue: 0},
    lose_count: {type: type.INTEGER, defaultValue: 0},
    rew_ad_count: {type: type.INTEGER, defaultValue: 0},
    email: type.STRING,
    password: type.STRING,
  })
};
