'use strict';

// Imports
const Sequelize = require('sequelize');
const Op = Sequelize.Op;


/**
 * Create new user if not exists
 * @param {Object} sequelizeObjects
 * @param {String} username
 * @param {String} password
 * @param {String} email
 * @returns {Promise<any>}
 * @constructor
 */
function CreateAccountPromise(sequelizeObjects, username, password, email) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {name: username},
    }).then(userObj => {
      if (userObj.length > 0) {
        resolve({result: false});
      } else {
        sequelizeObjects.User.create(
          {
            name: username,
            password: password,
            email: email,
            money: 10000,
          }
        ).then(() => {
          resolve({result: true});
        });
      }
    });
  });
}

exports.CreateAccountPromise = CreateAccountPromise;


/**
 * Find user for login
 * @param {Object} sequelizeObjects
 * @param {String} username
 * @param {String} password
 * @returns {Promise<any>}
 * @constructor
 */
function LoginPromise(sequelizeObjects, username, password) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {name: username, password: password},
    }).then(users => {
      if (users.length > 0) {
        resolve({result: true, username: users[0].name, password: users[0].password});
      } else {
        resolve({result: false, username: null, password: null});
      }
    });
  });
}

exports.LoginPromise = LoginPromise;


/**
 * Gets user parameters to user object
 * @param {Object} sequelizeObjects
 * @param {String} username
 * @param {String} password
 * @returns {Promise<any>}
 * @constructor
 */
function GetLoggedInUserParametersPromise(sequelizeObjects, username, password) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {name: username, password: password},
    }).then(users => {
      if (users.length > 0) {
        resolve({
          result: true,
          id: users[0].id,
          name: users[0].name,
          money: users[0].money,
          win_count: users[0].win_count,
          lose_count: users[0].lose_count
        });
      } else {
        resolve({result: false, id: null, name: null, money: null, win_count: null, lose_count: null});
      }
    });
  });
}

exports.GetLoggedInUserParametersPromise = GetLoggedInUserParametersPromise;


/**
 * Update player name
 * @param {Object} sequelizeObjects
 * @param {Number} userId
 * @param {String} newName
 * @returns {Promise<any>}
 * @constructor
 */
function UpdatePlayerNamePromise(sequelizeObjects, userId, newName) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {id: userId},
    }).then(obj => {
      if (obj.length > 0) {
        obj[0].update({name: newName}).then(() => {
          resolve({result: true});
        });
      } else {
        resolve({result: false});
      }
    });
  });
}

exports.UpdatePlayerNamePromise = UpdatePlayerNamePromise;


/**
 * Update player current funds/money
 * @param {Object} sequelizeObjects
 * @param {Number} userId
 * @param {Number} money
 * @returns {Promise<any>}
 * @constructor
 */
function UpdatePlayerMoneyPromise(sequelizeObjects, userId, money) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {id: userId},
    }).then(obj => {
      if (obj.length > 0) {
        obj[0].update({money: money}).then(() => {
          resolve({result: true});
        });
      } else {
        resolve({result: false});
      }
    });
  });
}

exports.UpdatePlayerMoneyPromise = UpdatePlayerMoneyPromise;


/**
 * Increment player win count
 * notice that this also needs event emitter for front end notification
 * @param {Object} sequelizeObjects
 * @param {Object} eventEmitter
 * @param {Number} connectionId
 * @param {Number} userId
 * @param {Boolean} isWinStreak
 * @returns {Promise<any>}
 * @constructor
 */
function UpdatePlayerWinCountPromise(sequelizeObjects, eventEmitter, connectionId, userId, isWinStreak) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {id: userId},
    }).then(obj => {
      if (obj.length > 0) {
        const incrementXp = (isWinStreak ? 200 : 100);
        obj[0].update({win_count: obj[0].win_count + 1, xp: obj[0].xp + incrementXp}).then(() => {
          resolve({result: true});
        }).then(() => {
          eventEmitter.emit('onXPGained', connectionId, incrementXp, 'you won the round.' + (isWinStreak === true ? ' (Win streak bonus)' : ''));
          resolve({result: true});
        });
      } else {
        resolve({result: false});
      }
    });
  });
}

exports.UpdatePlayerWinCountPromise = UpdatePlayerWinCountPromise;


/**
 * Decrement player win count
 * @param {Object} sequelizeObjects
 * @param {Number} userId
 * @returns {Promise<any>}
 * @constructor
 */
function UpdatePlayerLoseCountPromise(sequelizeObjects, userId) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {id: userId},
    }).then(obj => {
      if (obj.length > 0) {
        obj[0].update({lose_count: obj[0].lose_count + 1}).then(() => {
          resolve({result: true});
        });
      } else {
        resolve({result: false});
      }
    });
  });
}

exports.UpdatePlayerLoseCountPromise = UpdatePlayerLoseCountPromise;


/**
 * Insert statistic line for own dedicated table
 * @param {Object} sequelizeObjects
 * @param {Number} userId
 * @param {Number} money
 * @param {Number} win_count
 * @param {Number} lose_count
 * @returns {Promise<any>}
 * @constructor
 */
function InsertPlayerStatisticPromise(sequelizeObjects, userId, money, win_count, lose_count) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.Statistic.create(
      {
        user_id: userId,
        money: money,
        win_count: win_count,
        lose_count: lose_count,
      }
    ).then(() => {
      resolve({result: true});
    }).catch(error => {
      reject(error);
    });
  });
}

exports.InsertPlayerStatisticPromise = InsertPlayerStatisticPromise;


/**
 * User saw rewarding ad, increment money, ad count, xp
 * TODO: Needs validation implementation, user can call this method as cheat without checks for validity
 * @param {Object} sequelizeObjects
 * @param {Number} userId
 * @returns {Promise<any>}
 * @constructor
 */
function UpdatePlayerRewardingAdShownPromise(sequelizeObjects, userId) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {id: userId},
    }).then(obj => {
      if (obj.length > 0) {
        obj[0].update({
          money: Number(obj[0].money) + 2000, // Increment money
          rew_ad_count: Number(obj[0].rew_ad_count) + 1,
          xp: Number(obj[0].xp) + 100 // Increment xp
        }).then(() => {
          resolve({result: true});
        });
      } else {
        resolve({result: false});
      }
    });
  });
}

exports.UpdatePlayerRewardingAdShownPromise = UpdatePlayerRewardingAdShownPromise;


/**
 * Get user statistics for front end ui
 * or any other use case
 * @param {Object} sequelizeObjects
 * @param {Number} userId
 * @returns {Promise<any>}
 * @constructor
 */
function GetLoggedInUserStatisticsPromise(sequelizeObjects, userId) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      limit: 1,
      where: {id: userId},
    }).then(users => {
      if (users.length > 0) {
        resolve({
          result: true,
          id: users[0].id,
          name: users[0].name,
          money: users[0].money,
          win_count: users[0].win_count,
          lose_count: users[0].lose_count,
          xp: users[0].xp,
        });
      } else {
        resolve({result: false, id: null, name: null, money: null, win_count: null, lose_count: null, xp: null});
      }
    });
  });
}

exports.GetLoggedInUserStatisticsPromise = GetLoggedInUserStatisticsPromise;


/**
 * Get all user ranks for viewing purposes
 * limited by 50 results, order by xp desc
 * @param {Object} sequelizeObjects
 * @returns {Promise<any>}
 * @constructor
 */
function GetRankingsPromise(sequelizeObjects) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.User.findAll({
      raw: true, // raw array of results
      limit: 50,
      attributes: ['name', 'xp', 'win_count', 'lose_count'],
      // where: {id: {[Op.notIn]: [1, 2, 3]}},
      order: [
        ['xp', 'DESC'],
      ],
    }).then(userObj => {
      if (userObj.length > 0) {
        resolve({result: true, ranks: userObj});
      } else {
        resolve({result: false})
      }
    });
  });
}

exports.GetRankingsPromise = GetRankingsPromise;


/**
 * Get player chart statistic data for chart viewing
 * @param {Object} sequelizeObjects
 * @param {Number} userId
 * @returns {Promise<any>}
 * @constructor
 */
function GetPlayerChartDataPromise(sequelizeObjects, userId) {
  return new Promise(function (resolve, reject) {
    sequelizeObjects.Statistic.findAll({
      raw: true, // raw array of results
      limit: 150,
      attributes: ['money', 'win_count', 'lose_count'],
      where: {user_id: userId},
      order: [
        ['id', 'DESC'],
      ],
    }).then(ranks => {
      if (ranks.length > 0) {
        // select result must be reversed but not by id asc, that causes old data,
        // desc brings new data but in wrong order .reverse() array fixes this
        resolve({result: true, ranks: ranks.reverse()});
      } else {
        resolve({result: false, ranks: []})
      }
    });
  });
}

exports.GetPlayerChartDataPromise = GetPlayerChartDataPromise;

