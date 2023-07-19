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
    user_id: {
      type: type.BIGINT,
      references: {
        model: 'users', // refers to table name
        key: 'id', // refers to column name in model value table
      }
    },
    money: type.NUMERIC,
    win_count: type.INTEGER,
    lose_count: type.INTEGER,
  })
};
