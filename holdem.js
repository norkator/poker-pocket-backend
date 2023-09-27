'use strict';

// Imports
const dotEnv = require('dotenv');
dotEnv.config();
const webSocket = require('nodejs-websocket');
const initDb = require('./src/database/pgUtils');
const config = require('./config');
const utils = require('./src/app/utils');
const logger = require('./src/app/logger');
const osUtils = require('os-utils');
const events = require('events');
const serverUtils = require('./src/utils');
const autoPlay = require('./src/app/autoPlay');
const dbUtils = require('./src/database/dbUtils');

// Game objects
const room = require('./src/app/room'); // Empty object of room
const player = require('./src/app/player'); // Empty object of player

// Variables
let sequelizeObjects = null; // Server can host games without database
let server = null; // webSocket.createServer is created here
let rooms = []; // All rooms are stored here
let players = []; // All players are stored here
let CONNECTION_ID = 0; // increments
let responseArray = {key: "", code: 200, data: []};
let stDin = process.openStdin();
let statusCheckInterval = null;
let eventEmitter = new events.EventEmitter();


// ---------------------------------------------------
/* Starting point */

initDb.initDatabase().then(() => {
  sequelizeObjects = require('./src/database/sequelize'); // This creates tables if not exists and returns table models
  startGames();
});

function startGames() {
  createStartingRooms().then(() => {
    // ConsoleListener allows input commands from node js console
    initConsoleListener().then(() => {
      startWebSocket().then(() => {
        initServerStatusCheckInterval().then(() => {
          logger.log('Games fully initialized', logger.LOG_CYAN);
        })
      });
    });
  });
}


// ---------------------------------------------------


// Start web sockets
function startWebSocket() {
  // noinspection JSUnusedLocalSymbols
  return new Promise(function (resolve, reject) {
    server = webSocket.createServer(serverUtils.GetCertOptions(), function (conn) {
      checkRooms();
      conn.connectionId = CONNECTION_ID;
      conn.selectedRoomId = -1;
      players.push(new player.Player(conn, conn.key, CONNECTION_ID, 10000, false));
      players[CONNECTION_ID].connection.sendText(JSON.stringify({
        "key": "connectionId",
        "socketKey": conn.key,
        "connectionId": CONNECTION_ID
      }));
      logger.log("♣ New connection with connectionId " + CONNECTION_ID);
      CONNECTION_ID = CONNECTION_ID + 1;
      conn.on('text', function (inputStr) {
        messageHandler(JSON.parse(inputStr));
      });
      // noinspection JSUnusedLocalSymbols
      conn.on('close', function (code, reason) {
        if (players[conn.connectionId].selectedRoomId !== -1) {
          let selectedRoomId = players[conn.connectionId].selectedRoomId;
          if (players[conn.connectionId].totalBet > 0) {
            rooms[selectedRoomId].totalPot = rooms[selectedRoomId].totalPot + players[conn.connectionId].totalBet;
          }
        }
        playerConnectionSetNull(conn.connectionId);
        logger.log("Connection closed");
      });
      conn.on('pong', function () {
      });
      conn.on('error', function (errObj) {
        logger.log(errObj);
      });
    }).listen(config.server.port);
    resolve();
  });
}


// Input command message handler
function messageHandler(input) {
  switch (input.key) {
    case "disconnect":
      logger.log("Disconnect from message handler...");
      players[input.connectionId].connection = null;
      break;
    case "getRooms":
      // noinspection JSUnresolvedVariable
      onRequestRooms(input.playerName, input.connectionId, input.socketKey, input.roomId, input.roomSortParam);
      break;
    case "selectRoom":
      onPlayerSelectRoom(input.connectionId, input.socketKey, input.roomId);
      getRoomParameters(input.connectionId, input.socketKey, input.roomId);
      break;
    case "getRoomParams":
      getRoomParameters(input.connectionId, input.socketKey, input.roomId);
      break;
    case "setFold":
      if (isValidInput(input, true)) {
        rooms[input.roomId].playerFold(input.connectionId, input.socketKey);
        rooms[input.roomId].sendStatusUpdate();
      }
      break;
    case "setCheck":
      if (isValidInput(input, true)) {
        rooms[input.roomId].playerCheck(input.connectionId, input.socketKey);
        rooms[input.roomId].sendStatusUpdate();
      }
      break;
    case "setRaise":
      if (isValidInput(input, true)) {
        rooms[input.roomId].playerRaise(input.connectionId, input.socketKey, input.amount);
        rooms[input.roomId].sendStatusUpdate();
      }
      break;
    case "getSpectateRooms":
      onRequestSpectateRooms(input.connectionId, input.socketKey, input.roomId);
      break;
    case "selectSpectateRoom":
      onPlayerSelectSpectateRoom(input.connectionId, input.socketKey, input.roomId);
      break;
    case "getGameInformation":
      onGetGameInformation(input.connectionId, input.socketKey);
      break;
    case "createAccount":
      createAccount(input.connectionId, input.socketKey, input.name, input.password, input.email);
      break;
    case "userLogin":
      userLogin(input.connectionId, input.socketKey, input.name, input.password);
      break;
    case "loggedInUserParams":
      setLoggedInUserParameters(input.connectionId, input.socketKey, input.name, input.password);
      break;
    case "serverCommand":
      serverCommand(input.connectionId, input.socketKey, input.lineOne, input.lineTwo, input.lineThree, input.password);
      break;
    case "loggedInUserStatistics":
      loggedInUserStatistics(input.connectionId, input.socketKey);
      break;
    case "rewardingAdShown": // Give user more money
      rewardingAdShown(input.connectionId, input.socketKey);
      break;
    case "getRankings":
      getRankings(input.connectionId, input.socketKey);
      break;
    case "autoPlayAction":
      autoPlayAction(input.connectionId, input.socketKey);
      break;
    case "getPlayerChartData":
      getPlayerChartData(input.connectionId, input.socketKey);
      break;
    case "getSelectedPlayerChartData":
      getSelectedPlayerChartData(input.connectionId, input.socketKey, input.playerId);
      break;
  }
}


function onRequestRooms(playerName, connectionId, socketKey, roomId, roomSortParam) {
  logger.log('Get room req; ' + playerName + ' ' + connectionId + ' ' + socketKey + ' ' + roomId + ' ' + roomSortParam, logger.LOG_UNDERSCORE);
  if (Number(roomId) === -1) {
    if (players[connectionId].socketKey === socketKey) {
      // New player
      if (!players[connectionId].isLoggedInPlayer()) {
        players[connectionId].playerName = playerName !== 'undefined' ? playerName : 'Anon';
      }
      responseArray.key = "getRooms";
      responseArray.data = [];
      if (roomSortParam == null) {
        roomSortParam = 'all';
      }
      for (let i = 0; i < rooms.length; i++) {
        if ((rooms[i].players.length + rooms[i].playersToAppend.length) < config.games.holdEm.holdEmGames[rooms[i].holdemType].max_seats) {
          switch (roomSortParam) {
            case 'all':
              responseArray.data.push(rooms[i].getRoomInfo());
              break;
            case 'lowBets':
              if (rooms[i].holdemType === 0) {
                responseArray.data.push(rooms[i].getRoomInfo());
              }
              break;
            case 'mediumBets':
              if (rooms[i].holdemType === 1) {
                responseArray.data.push(rooms[i].getRoomInfo());
              }
              break;
            case 'highBets':
              if (rooms[i].holdemType === 2) {
                responseArray.data.push(rooms[i].getRoomInfo());
              }
              break;
          }
        }
      }
      logger.log("Sending... " + JSON.stringify(responseArray));
      players[connectionId].connection.sendText(JSON.stringify(responseArray));
      cleanResponseArray();
    } else {
      logger.log('Socket key no match!', logger.LOG_UNDERSCORE);
    }
  }
}


function onRequestSpectateRooms(connectionId, socketKey, roomId) {
  if (players[connectionId].socketKey === socketKey) {
    if (roomId === -1) {
      responseArray.key = "getSpectateRooms";
      responseArray.data = [];
      for (let i = 0; i < rooms.length; i++) {
        responseArray.data.push(rooms[i].getRoomInfo());
      }
      logger.log("Sending spectate rooms... " + JSON.stringify(responseArray));
      players[connectionId].connection.sendText(JSON.stringify(responseArray));
      cleanResponseArray();
    }
  }
}


// Player selected room to play in
function onPlayerSelectRoom(connectionId, socketKey, roomId) {
  if (isValidInput({connectionId, socketKey, roomId}, true)) {
    if ((rooms[roomId].players.length + rooms[roomId].playersToAppend.length) < config.games.holdEm.holdEmGames[rooms[roomId].holdemType].max_seats) {
      players[connectionId].connection.selectedRoomId = roomId; // Also set room id into connection object
      players[connectionId].selectedRoomId = roomId;
      rooms[roomId].playersToAppend.push(players[connectionId]);
      logger.log(players[connectionId].playerName + " selected room " + roomId);
      rooms[roomId].triggerNewGame();
    }
  }
}


// Push spectator on selected room
function onPlayerSelectSpectateRoom(connectionId, socketKey, roomId) {
  if (isValidInput({connectionId, socketKey, roomId}, true)) {
    players[connectionId].connection.selectedRoomId = roomId; // Also set room id into connection object
    players[connectionId].selectedRoomId = roomId;
    rooms[roomId].spectators.push(players[connectionId]);
    logger.log("* User id " + players[connectionId].playerId + " is spectating on room " + roomId);
  }
}


// Player select's room and gets room parameters with this function
function getRoomParameters(connectionId, socketKey, roomId) {
  if (isValidInput({connectionId, socketKey, roomId}, true)) {
    players[connectionId].connection.sendText(JSON.stringify(rooms[roomId].getRoomParams()));
  }
}


// Game information
function onGetGameInformation(connectionId, socketKey) {
  if (isValidInput({connectionId, socketKey})) {
    responseArray.key = "getGameInformation";
    responseArray.data = {};
    responseArray.data.roomCount = rooms.length;
    responseArray.data.totalConnectionsCount = players.length;
    responseArray.data.activeConnectionsCount = players.filter(player => {
      if (player !== null) {
        if (player.connection !== null) {
          return true;
        }
      }
    }).length;
    responseArray.data.serverFreeMemory = osUtils.freemem();
    responseArray.data.serverTotalMemory = osUtils.totalmem();
    responseArray.data.serverUpTime = osUtils.sysUptime();
    responseArray.data.serverLoadAverage = osUtils.loadavg(5);
    players[connectionId].connection.sendText(JSON.stringify(responseArray));
    cleanResponseArray();
  }
}


function initConsoleListener() {
  // noinspection JSUnusedLocalSymbols
  return new Promise(function (resolve, reject) {
    stDin.addListener("data", function (inputObj) {
      let i = 0;
      switch (inputObj.toString().trim()) {
        case 'help':
          logger.log("-- Available commands --");
          logger.log("addBot   (adds bot to room 0)");
          logger.log("addBots   (adds four more bots to room 0)");
          logger.log("fillWithBots    (Fill all rooms with bots)");
          break;
        case 'addBot':
          onAppendBot(0);
          break;
        case 'addBots':
          onAppendBot(0);
          onAppendBot(0);
          onAppendBot(0);
          onAppendBot(0);
          break;
        case 'fillWithBots':
          for (i = 0; i < 6; i++) {
            onAppendBot(0);
            onAppendBot(1);
            onAppendBot(2);
          }
          break;
        case 'testXP':
          for (i = 0; i < players.length; i++) {
            eventEmitter.emit('onXPGained', players[i].playerId, 20, 'testing xp function!')
          }
          break;
      }
    });
    resolve();
  });
}


// Sets player null and tries removing it from room
function playerConnectionSetNull(player_id) {
  if (players[player_id] != null) {
    const pSelectedRoomId = players[player_id].selectedRoomId;
    if (pSelectedRoomId !== -1) {
      players[player_id].connection = null;
      rooms[pSelectedRoomId].triggerNewGame();
    } else {
      players[player_id].connection = null;
    }
  }
}


// ---------------------------------------------------------------------------------------------------------------------


/**
 * Create starting rooms
 * @returns {Promise}
 */
function createStartingRooms() {
  // noinspection JSUnusedLocalSymbols
  return new Promise(function (resolve, reject) {
    for (let i = 0; i < config.common.startingRooms; i++) {
      createRoom();
    }
    resolve();
  });
}


/**
 * Create new room
 * responsible for setting room settings
 * and for injecting bots
 */
function createRoom() {
  let newRoomId = rooms.length;
  let betTypeCount = {lowBets: 0, mediumBets: 0, highBets: 0};
  for (let i = 0; i < rooms.length; i++) {
    switch (rooms[i].holdemType) {
      case 0:
        betTypeCount.lowBets = betTypeCount.lowBets + 1;
        break;
      case 1:
        betTypeCount.mediumBets = betTypeCount.mediumBets + 1;
        break;
      case 2:
        betTypeCount.highBets = betTypeCount.highBets + 1;
        break;
    }
  }
  let roomType = Object.keys(betTypeCount).sort(function (a, b) {
    return betTypeCount[a] - betTypeCount[b]
  });
  let type = 0;
  switch (roomType[0]) {
    case 'lowBets':
      type = 0;
      break;
    case 'mediumBets':
      type = 1;
      break;
    case 'highBets':
      type = 2;
      break;
  }
  rooms.push(new room.Room(Number(type), newRoomId, eventEmitter, sequelizeObjects));
  logger.log("CREATE ROOM WITH TYPE: " + type + " AND ID: " + newRoomId);

  // Append bots according to common config
  let b = 0;
  if (newRoomId === 0) {
    for (b = 0; b < config.common.roomZeroBotCount; b++) {
      onAppendBot(newRoomId);
    }
  }
  if (newRoomId === 1) {
    for (b = 0; b < config.common.roomOneBotCount; b++) {
      onAppendBot(newRoomId);
    }
  }
  if (newRoomId === 2) {
    for (b = 0; b < config.common.roomTwoBotCount; b++) {
      onAppendBot(newRoomId);
    }
  }
  if (newRoomId >= 3) {
    for (b = 0; b < config.common.roomOthersBotCount; b++) {
      onAppendBot(newRoomId);
    }
  }
}


// Check rooms states
function checkRooms() {
  logger.log("-- Checking rooms --");
  let boolCreateRoom = true;
  for (let i = 0; i < rooms.length; i++) {
    if ((rooms[i].players.length + rooms[i].playersToAppend) <= 4) {
      boolCreateRoom = false;
    }
  }
  if (boolCreateRoom) {
    logger.log("--- Created new room ---");
    createRoom();
  }
}


// Append new bot on selected room
function onAppendBot(roomId) {
  if (!rooms[roomId]) {
    return;
  }
  if (Number(rooms[roomId].playersToAppend.length + rooms[roomId].players.length) < Number(config.games.holdEm.holdEmGames[rooms[roomId].holdemType].max_seats)) {
    const connectionId = CONNECTION_ID;
    players.push(new player.Player(-1, null, connectionId, config.games.holdEm.bot.startMoney, true));
    if (config.games.holdEm.bot.giveRealNames) {
      const currentBotNames = rooms[roomId].players
        .filter(player => player.isBot)
        .map(function (playerObj) {
          return playerObj.playerName
        });
      players[connectionId].playerName = utils.getRandomBotName(
        currentBotNames
      );
    } else {
      players[connectionId].playerName = "Bot" + Math.floor(Math.random() * 1000);
    }
    rooms[roomId].playersToAppend.push(players[connectionId]);
    // logger.log("BOT " + players[connectionId].playerName + " selected room " + roomId);
    rooms[roomId].triggerNewGame();
    CONNECTION_ID = CONNECTION_ID + 1;
  } else {
    logger.log("Too many players on room " + roomId + " so cannot append more bots from command.");
  }
}


// Event fired from room when new bot is needed
eventEmitter.on('needNewBot', function (roomId) {
  logger.log('Appending new bot into room: ' + roomId, logger.LOG_CYAN);
  onAppendBot(roomId);
});


function initServerStatusCheckInterval() {
  // noinspection JSUnusedLocalSymbols
  return new Promise(function (resolve, reject) {
    statusCheckInterval = setInterval(function () {
      logger.log('Running server status check script', logger.LOG_CYAN);
      if (rooms[0] !== undefined) {
        if (rooms[0].getRoomBotCount() < config.common.roomZeroBotCount) {
          logger.log('Appending bot on room 0', logger.LOG_CYAN);
          onAppendBot(0);
        }
      }
      if (rooms[1] !== undefined) {
        if (rooms[1].getRoomBotCount() < config.common.roomOneBotCount) {
          logger.log('Appending bot on room 1', logger.LOG_CYAN);
          onAppendBot(1);
        }
      }
      if (rooms[2] !== undefined) {
        if (rooms[2].getRoomBotCount() < config.common.roomTwoBotCount) {
          logger.log('Appending bot on room 2', logger.LOG_CYAN);
          onAppendBot(2);
        }
      }
    }, (60 * 1000)); // Every minute
    resolve();
  });
}


// Server commands
function serverCommand(connectionId, socketKey, line1, line2, line3, password) {
  if (password === process.env.SERVER_CMD_PASSWORD) {
    let boolResult = true;
    switch (line1) {
      case 'addBots':
        for (let i = 0; i < Number(line3); i++) {
          onAppendBot(line2);
        }
        break;
      default:
        boolResult = false;
        break;
    }
    serverCommandResult(connectionId, socketKey, boolResult, line1);
  }
}


// Send command back as response of successful run
function serverCommandResult(connectionId, socketKey, boolResult, line1) {
  if (isValidInput({connectionId, socketKey})) {
    responseArray.key = "serverCommandResult";
    responseArray.data = {boolResult: boolResult, command: line1};
    players[connectionId].connection.sendText(JSON.stringify(responseArray));
    cleanResponseArray();
  }
}


// Create player account (SHA3-512 password)
function createAccount(connectionId, socketKey, name, password, email) {
  if (isValidInput({connectionId, socketKey})) {
    dbUtils.CreateAccountPromise(sequelizeObjects, name, password, email).then(result => {
      if (players[connectionId].connection !== null) {
        responseArray.key = "accountCreated";
        responseArray.data = result;
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      }
    }).catch(() => {
    });
  }
}

// Login for user account (SHA3-512 password)
function userLogin(connectionId, socketKey, username, password) {
  if (isValidInput({connectionId, socketKey})) {
    dbUtils.LoginPromise(sequelizeObjects, username, password).then(result => {
      if (players[connectionId].connection !== null) {
        responseArray.key = "loginResult";
        responseArray.data = result;
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      }
    }).catch(() => {
    });
  }
}


// Set logged in user parameters
function setLoggedInUserParameters(connectionId, socketKey, username, password) {
  if (isValidInput({connectionId, socketKey})) {
    dbUtils.GetLoggedInUserParametersPromise(sequelizeObjects, username, password).then(result => {
      let valid = true;
      for (let i = 0; i < players.length; i++) {
        if (players[i].playerDatabaseId === result.id) {
          if (players[i].connection != null && players[i].isLoggedInPlayer()) {
            valid = false;
          }
        }
      }
      if (valid) {
        // ----> see this part, is it working properly?
        players[connectionId].playerDatabaseId = result.id;
        players[connectionId].playerName = result.name;
        players[connectionId].playerMoney = result.money;
        players[connectionId].playerWinCount = result.win_count;
        players[connectionId].playerLoseCount = result.lose_count;
        responseArray.key = "loggedInUserParamsResult";
        responseArray.data = {result: true, moneyLeft: result.money};
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      } else {
        responseArray.key = "loggedInUserParamsResult";
        responseArray.data = {result: false, moneyLeft: -1};
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      }
    }).catch(() => {
    });
  }
}


// Get logged in user statistics
function loggedInUserStatistics(connectionId, socketKey) {
  if (isValidInput({connectionId, socketKey}) && players[connectionId].isLoggedInPlayer()) {
    dbUtils.GetLoggedInUserStatisticsPromise(sequelizeObjects, players[connectionId].playerDatabaseId).then(result => {
      if (players[connectionId].connection !== null) {
        let xpMedalIconAndNextMedalXP = utils.getMedalIconAndNextMedalXP(result.xp);
        const xpNeededForNextMedal = (xpMedalIconAndNextMedalXP.nextMedalXP - result.xp);
        responseArray.key = "loggedInUserStatisticsResults";
        responseArray.data = {
          name: result.name,
          money: result.money,
          winCount: result.win_count,
          loseCount: result.lose_count,
          xp: result.xp,
          icon: xpMedalIconAndNextMedalXP.image,
          xpNeededForNextMedal: xpNeededForNextMedal,
          achievements: [],
          havingMedals: xpMedalIconAndNextMedalXP.havingMedals
        };
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      }
    }).catch(() => {
    });
  }
}


// Give user more money (rewarding ad shown)
function rewardingAdShown(connectionId, socketKey) {
  if (isValidInput({connectionId, socketKey}) && players[connectionId].isLoggedInPlayer()) {
    dbUtils.UpdatePlayerRewardingAdShownPromise(sequelizeObjects, players[connectionId].playerDatabaseId).then(result => {
      if (players[connectionId].connection !== null && result.result) {
        responseArray.key = "rewardingAdShownServerResult";
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      }
    }).catch(() => {
    });
  }
}


// Get rankings of best players
function getRankings(connectionId, socketKey) {
  if (isValidInput({connectionId, socketKey})) {
    dbUtils.GetRankingsPromise(sequelizeObjects).then(result => {
      if (players[connectionId].connection !== null) {
        responseArray.key = "getRankingsResult";
        responseArray.code = 200;
        responseArray.data = utils.fetchRanksMedals(result.ranks);
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      }
    }).catch(() => {
    });
  }
}


// User gained xp, notify frontend
eventEmitter.on('onXPGained', function (connectionId, xpGainedAmount, xpMessage) {
  if (players[connectionId].connection !== null && players[connectionId].isLoggedInPlayer()) {
    responseArray.key = "onXPGained";
    responseArray.code = 200;
    responseArray.data = {
      xpGainedAmount: xpGainedAmount,
      xpMessage: xpMessage
    };
    players[connectionId].connection.sendText(JSON.stringify(responseArray));
    cleanResponseArray();
  }
});


// Request autoPlay action for user
// noinspection JSUnusedLocalSymbols
function autoPlayAction(connectionId, socketKey) {
  if (players[connectionId].connection !== null && !players[connectionId].isFold) {
    const roomId = players[connectionId].selectedRoomId;
    const check_amount = rooms[roomId].currentHighestBet === 0 ?
      rooms[roomId].roomMinBet : (rooms[roomId].currentHighestBet - players[connectionId].totalBet);
    let botObj = new autoPlay.AutoPlay(
      rooms[roomId].holdemType,
      players[connectionId].playerName,
      players[connectionId].playerMoney,
      players[connectionId].playerCards,
      rooms[roomId].middleCards,
      rooms[roomId].isCallSituation,
      rooms[roomId].roomMinBet,
      check_amount,
      rooms[roomId].smallBlindGiven,
      rooms[roomId].bigBlindGiven,
      rooms[roomId].evaluatePlayerCards(rooms[roomId].current_player_turn).value,
      rooms[roomId].currentStage,
      players[connectionId].totalBet
    );
    responseArray.key = "autoPlayActionResult";
    responseArray.code = 200;
    responseArray.data = botObj.performAction();
    players[connectionId].connection.sendText(JSON.stringify(responseArray));
    cleanResponseArray();
  }
}


// Get rankings of best players
function getPlayerChartData(connectionId, socketKey) {
  if (isValidInput({connectionId, socketKey})) {
    dbUtils.GetPlayerChartDataPromise(sequelizeObjects, players[connectionId].playerDatabaseId).then(results => {
      if (players[connectionId].connection !== null) {
        responseArray.key = "getPlayerChartDataResult";
        responseArray.code = 200;
        responseArray.data = results.ranks;
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      }
    }).catch(() => {
    });
  }
}


// Special function for development
function getSelectedPlayerChartData(connectionId, socketKey, playerId) {
  if (isValidInput({connectionId, socketKey})) {
    dbUtils.GetPlayerChartDataPromise(sequelizeObjects, playerId).then(results => {
      if (players[connectionId].connection !== null) {
        responseArray.key = "getPlayerChartDataResult";
        responseArray.code = 200;
        responseArray.data = results.ranks;
        players[connectionId].connection.sendText(JSON.stringify(responseArray));
        cleanResponseArray();
      }
    }).catch(() => {
    });
  }
}


// ---------------------------------------------------------------------------------------------------------------------

/**
 * @param {object} input
 * @param {number|null} input.connectionId
 * @param input.socketKey
 * @param {number} [input.roomId]
 * @param {boolean} [validateRoomId]
 * @return {boolean}
 */
function isValidInput({connectionId, socketKey, roomId}, validateRoomId) {
  if (players[connectionId].connection === null) {
    return false;
  }
  if (players[connectionId].socketKey !== socketKey) {
    return false;
  }
  if (validateRoomId && !rooms[roomId]) {
    return false;
  }
  return true;
}

function cleanResponseArray() {
  responseArray = {key: "", code: 200, data: []};
}

// ---------------------------------------------------------------------------------------------------------------------
