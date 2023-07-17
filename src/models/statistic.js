/**
 * User model for database
 * @param sequelize
 * @param type data types
 * @returns {*|void|target}
 */
module.exports = (sequelize, type) => {
  return sequelize.define('statistic', {
    id: {
      type: type.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: type.BIGINT,
    money: type.NUMERIC,
    win_count: type.INTEGER,
    lose_count: type.INTEGER,
  })
};
