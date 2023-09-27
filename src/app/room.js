/**
 * Core logic for Texas Hold'em room game
 * this file may be renamed in future when other game types are implemented
 */

const config = require('../../config');
const dbUtils = require('../database/dbUtils');
const utils = require('./utils');
const logger = require('./logger');
let poker = require('./poker');
let player = require('./player');
let evaluator = require('./evaluator');
let bot = require('./bot');
let pokerSolver = require('pokersolver').Hand;


// Socket states
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

// Player action names for last action update
const PLAYER_ACTION_CHECK = 'CHECK';
const PLAYER_ACTION_CALL = 'CALL';
const PLAYER_ACTION_RAISE = 'RAISE';
const PLAYER_ACTION_FOLD = 'FOLD';

// Game stages
Room.HOLDEM_STAGE_ONE_HOLE_CARDS = 0;
Room.HOLDEM_STAGE_TWO_PRE_FLOP = 1;
Room.HOLDEM_STAGE_THREE_THE_FLOP = 2;
Room.HOLDEM_STAGE_FOUR_POST_FLOP = 3;
Room.HOLDEM_STAGE_FIVE_THE_TURN = 4;
Room.HOLDEM_STAGE_SIX_THE_POST_TURN = 5;
Room.HOLDEM_STAGE_SEVEN_THE_RIVER = 6;
Room.HOLDEM_STAGE_EIGHT_THE_SHOW_DOWN = 7;
Room.HOLDEM_STAGE_NINE_SEND_ALL_PLAYERS_CARDS = 8;
Room.HOLDEM_STAGE_TEN_RESULTS = 9;


// Constructor
function Room(holdemType, number, eventEmitter, sequelizeObjects) {
  this.holdemType = holdemType; // Number
  this.roomId = number;
  this.eventEmitter = eventEmitter;
  this.sequelizeObjects = sequelizeObjects;
  this.roomMinBet = config.games.holdEm.holdEmGames[holdemType].minBet;
  this.roomName = 'Room ' + number;
  this.maxSeats = config.games.holdEm.holdEmGames[holdemType].max_seats;
  this.minPlayers = config.games.holdEm.holdEmGames[holdemType].minPlayers;
  this.turnTimeOut = config.games.holdEm.holdEmGames[holdemType].turnCountdown * 1000;
  this.currentStage = Room.HOLDEM_STAGE_ONE_HOLE_CARDS;
  this.holeCardsGiven = false;
  this.totalPot = 0;
  this.bots = [];
  this.players = []; // Players in this room playing
  this.playersToAppend = []; // Players waiting to get into game
  this.playersTemp = []; // Move old players here before next turn and from here back to players FIRST before playersToAppend
  this.spectators = []; // Spectators
  this.spectatorsTemp = []; // For cleaning out null connections
  this.deck = null;
  this.deckCard = 0;
  this.deckSize = 52; // Stock 52
  this.deckCardsBurned = 0; // How many cards are burned
  this.middleCards = [];
  this.gameStarted = false;
  this.turnTimeOutObj = null; // Active players timeout
  this.turnIntervalObj = null;
  this.updateJsonTemp = null;
  this.current_player_turn = 0;
  this.currentTurnText = '';
  this.currentHighestBet = 0;
  this.isCallSituation = false;
  this.isResultsCall = false; // True means update on client visual side
  this.roundWinnerPlayerIds = [];
  this.roundWinnerPlayerCards = [];
  this.currentStatusText = 'Waiting players...';
  this.lastUserAction = {playerId: -1, actionText: null}; // Animated last user action text
  this.dealerPlayerArrayIndex = -1;
  this.smallBlindPlayerArrayIndex = -1;
  this.smallBlindGiven = false;
  this.bigBlindGiven = false;
  this.bigBlindPlayerHadTurn = false; // Allow big blind player to make decision also
  this.stackCall = 0;
  this.lastWinnerPlayers = []; // Give's double xp if same
  this.collectingPot = false;
}

exports.Room = Room;


// Run before each new round
Room.prototype.resetRoomParams = function () {
  this.currentStage = Room.HOLDEM_STAGE_ONE_HOLE_CARDS;
  this.holeCardsGiven = false;
  this.totalPot = 0;
  this.middleCards = [];
  this.currentHighestBet = 0;
  this.updateJsonTemp = null;
  this.current_player_turn = 0;
  this.isResultsCall = false;
  this.roundWinnerPlayerIds = [];
  this.roundWinnerPlayerCards = [];
  this.lastUserAction = {playerId: -1, actionText: null};
  this.smallBlindGiven = false;
  this.bigBlindGiven = false;
  this.bigBlindPlayerHadTurn = false;
  this.collectingPot = false;
  this.deckCardsBurned = 0;
};


// Class method
Room.prototype.getRoomInfo = function () {
  return {
    roomId: this.roomId,
    roomName: this.roomName,
    roomMinBet: this.roomMinBet,
    playerCount: (this.players.length + this.playersToAppend.length + this.bots.length),
    maxSeats: this.maxSeats
  };
};


Room.prototype.triggerNewGame = function () {
  this.appendPlayers();
};


Room.prototype.appendPlayers = function () {
  let _this = this;
  this.cleanSpectators();
  if (!this.gameStarted) {
    this.playersTemp = [];
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i] !== null) {
        if (this.players[i].connection !== null && this.players[i].playerMoney > this.roomMinBet) { // Added room minimum bet here other than > 0, otherwise causes crash
          this.playersTemp.push(this.players[i]);
        } else {
          if (!this.players[i].isBot) {
            this.sendClientMessage(this.players[i], 'Not enough money to join the game. You are now spectator.');
            this.spectators.push(this.players[i]);
          }
        }
      }
    }
    this.players = [];
    for (let p = 0; p < this.playersTemp.length; p++) {
      if (this.playersTemp[p] !== null) {
        if (this.playersTemp[p].connection !== null) {
          this.players.push(this.playersTemp[p]);
        }
      }
    }
    this.playersTemp = [];
    if (this.playersToAppend.length > 0) {
      for (let i = 0; i < this.playersToAppend.length; i++) {
        if (this.playersToAppend[i].connection !== null && this.playersToAppend[i].playerMoney > this.roomMinBet) {
          this.players.push(this.playersToAppend[i]);
        } else {
          if (!this.playersToAppend[i].isBot) {
            this.sendClientMessage(this.playersToAppend[i], 'Not enough money to join the game. You are now spectator.');
            this.spectators.push(this.playersToAppend[i]);
          }
        }
      }
      this.playersToAppend = [];
      if (this.players.length >= this.minPlayers) {
        setTimeout(function () {
          _this.startGame();
        }, config.common.startGameTimeOut);
      } else {
        logger.log('* Room ' + this.roomName + ' has not enough players');
      }
    } else {
      if (this.players.length >= this.minPlayers) {
        logger.log('No players to append... starting game');
        this.startGame();
        setTimeout(function () {
          _this.startGame();
        }, config.common.startGameTimeOut);
      } else {
        this.currentStatusText = this.minPlayers + ' players needed to start a new game...';
      }
    }
  } else {
    logger.log('* Cant append more players since round is running for room: ' + this.roomName);
  }
};


Room.prototype.startGame = function () {
  if (!this.gameStarted) {
    this.gameStarted = true;
    logger.log('Game started for room: ' + this.roomName);
    this.resetRoomParams();
    this.resetPlayerParameters(); // Reset players (resets dealer param too)
    this.setNextDealerPlayer(); // Get next dealer player
    this.getNextSmallBlindPlayer(); // Get small blind player
    let response = this.getRoomParams();
    logger.log(JSON.stringify(response));
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].isFold = false;
      this.sendWebSocketData(i, response);
    }
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
    this.newGame();
  }
};


// ------------------------------------------------------------------------

// New deck here
Room.prototype.newGame = function () {
  const _this = this;
  // Always shuffle new deck
  this.deck = poker.visualize(poker.randomize(poker.newSet()));
  this.deckSize = this.deck.length;
  this.deckCard = 0;
  this.sendStatusUpdate();
  setTimeout(function () {
    _this.staging();
  }, 1000)
};

Room.prototype.staging = function () {
  switch (this.currentStage) {
    case Room.HOLDEM_STAGE_ONE_HOLE_CARDS: // Give cards
      this.currentStatusText = 'Hole cards';
      this.currentTurnText = '';
      this.burnCard(); // Burn one card before dealing cards
      this.holeCards();
      break;
    case Room.HOLDEM_STAGE_TWO_PRE_FLOP: // First betting round
      this.currentStatusText = 'Pre flop & small blind & big blind';
      this.isCallSituation = false; // Room related reset
      this.resetPlayerStates();
      this.resetRoundParameters();
      this.current_player_turn = this.smallBlindPlayerArrayIndex; // Round starting player is always small blind player
      this.currentTurnText = '';
      this.currentHighestBet = 0;
      this.bettingRound(this.smallBlindPlayerArrayIndex); // this.bettingRound(this.current_player_turn);
      break;
    case Room.HOLDEM_STAGE_THREE_THE_FLOP: // Show three middle cards
      this.currentStatusText = 'The flop';
      this.currentTurnText = '';
      this.burnCard(); // Burn one card before dealing cards
      this.theFlop();
      break;
    case Room.HOLDEM_STAGE_FOUR_POST_FLOP: // Second betting round
      this.currentStatusText = 'Post flop';
      this.currentTurnText = '';
      this.isCallSituation = false; // Room related reset
      this.resetPlayerStates();
      this.resetRoundParameters();
      this.current_player_turn = this.smallBlindPlayerArrayIndex; // Round starting player is always small blind player
      this.currentHighestBet = 0;
      this.bettingRound(this.current_player_turn); // this.bettingRound(this.current_player_turn);
      break;
    case Room.HOLDEM_STAGE_FIVE_THE_TURN: // Show fourth card
      this.currentStatusText = 'The turn';
      this.currentTurnText = '';
      this.burnCard(); // Burn one card before dealing cards
      this.theTurn();
      break;
    case Room.HOLDEM_STAGE_SIX_THE_POST_TURN: // Third betting round
      this.currentStatusText = 'Post turn';
      this.currentTurnText = '';
      this.isCallSituation = false; // Room related reset
      this.resetPlayerStates();
      this.resetRoundParameters();
      this.current_player_turn = this.smallBlindPlayerArrayIndex; // Round starting player is always small blind player
      this.currentHighestBet = 0;
      this.bettingRound(this.current_player_turn); // this.bettingRound(this.current_player_turn);
      break;
    case Room.HOLDEM_STAGE_SEVEN_THE_RIVER: // Show fifth card
      this.currentStatusText = 'The river';
      this.currentTurnText = '';
      this.burnCard(); // Burn one card before dealing cards
      this.theRiver();
      break;
    case Room.HOLDEM_STAGE_EIGHT_THE_SHOW_DOWN: // Fourth and final betting round
      this.currentStatusText = 'The show down';
      this.currentTurnText = '';
      this.isCallSituation = false; // Room related reset
      this.resetPlayerStates();
      this.resetRoundParameters();
      this.current_player_turn = this.smallBlindPlayerArrayIndex; // Round starting player is always small blind player
      this.currentHighestBet = 0;
      this.bettingRound(this.current_player_turn); // this.bettingRound(this.current_player_turn);
      break;
    case Room.HOLDEM_STAGE_NINE_SEND_ALL_PLAYERS_CARDS: // Send all players cards here before results to all players and spectators
      logger.log(this.roomName + ' sending cards to all room clients...');
      this.sendAllPlayersCards(); // Avoiding cheating with this
      break;
    case Room.HOLDEM_STAGE_TEN_RESULTS: // Results
      logger.log('-------- Results : ' + this.roomName + ' --------');
      this.roundResultsEnd();
      break;
    default:
      return;
  }

  this.sendStatusUpdate();
};

// ---------------------------------------------------------------------------------------------------------------------

// Give players two cards
Room.prototype.holeCards = function () {
  this.currentStage = Room.HOLDEM_STAGE_TWO_PRE_FLOP; // Increment
  const _this = this;
  for (let i = 0; i < this.players.length; i++) {
    this.players[i].playerCards[0] = this.getNextDeckCard();
    this.players[i].playerCards[1] = this.getNextDeckCard();
  }
  let response = {key: '', data: {}};
  response.key = 'holeCards';
  for (let i = 0; i < this.players.length; i++) {
    response.data.players = [];
    for (let p = 0; p < this.players.length; p++) {
      let playerData = {};
      playerData.playerId = this.players[p].playerId;
      playerData.playerName = this.players[p].playerName;
      this.players[p].playerId === this.players[i].playerId ? playerData.cards = this.players[p].playerCards : playerData.cards = [];
      response.data.players.push(playerData);
    }
    this.sendWebSocketData(i, response);
  }
  response.data.players = [];
  for (let i = 0; i < this.players.length; i++) {
    let playerData = {};
    playerData.playerId = this.players[i].playerId;
    playerData.cards = []; // Empty cards, otherwise causes security problem
    response.data.players.push(playerData);
  }
  for (let i = 0; i < this.spectators.length; i++) {
    this.sendSpectatorWebSocketData(i, response);
  }
  this.holeCardsGiven = true;
  setTimeout(function () {
    _this.staging();
  }, 3000);
};

// ---------------------------------------------------------------------------------------------------------------------

// Show three middle cards
Room.prototype.theFlop = function () {
  this.currentStage = Room.HOLDEM_STAGE_FOUR_POST_FLOP; // Increment
  const _this = this;
  this.middleCards[0] = this.getNextDeckCard();
  this.middleCards[1] = this.getNextDeckCard();
  this.middleCards[2] = this.getNextDeckCard();
  let response = {key: '', data: {}};
  response.key = 'theFlop';
  response.data.middleCards = this.middleCards;
  for (let p = 0; p < this.players.length; p++) {
    this.sendWebSocketData(p, response);
  }
  for (let w = 0; w < this.playersToAppend.length; w++) {
    this.sendWaitingPlayerWebSocketData(w, response);
  }
  for (let s = 0; s < this.spectators.length; s++) {
    this.sendSpectatorWebSocketData(s, response);
  }
  setTimeout(function () {
    _this.staging();
  }, 3000);
};

// ---------------------------------------------------------------------------------------------------------------------

// Show fourth card
Room.prototype.theTurn = function () {
  this.currentStage = Room.HOLDEM_STAGE_SIX_THE_POST_TURN; // Increment
  const _this = this;
  this.middleCards[3] = this.getNextDeckCard();
  let response = {key: '', data: {}};
  response.key = 'theTurn';
  response.data.middleCards = this.middleCards;
  for (let p = 0; p < this.players.length; p++) {
    this.sendWebSocketData(p, response);
  }
  for (let w = 0; w < this.playersToAppend.length; w++) {
    this.sendWaitingPlayerWebSocketData(w, response);
  }
  for (let s = 0; s < this.spectators.length; s++) {
    this.sendSpectatorWebSocketData(s, response);
  }
  setTimeout(function () {
    _this.staging();
  }, 2000);
};

// ---------------------------------------------------------------------------------------------------------------------

// Show fifth card
Room.prototype.theRiver = function () {
  this.currentStage = Room.HOLDEM_STAGE_EIGHT_THE_SHOW_DOWN; // Increment
  const _this = this;
  this.middleCards[4] = this.getNextDeckCard();
  let response = {key: '', data: {}};
  response.key = 'theRiver';
  response.data.middleCards = this.middleCards;
  for (let p = 0; p < this.players.length; p++) {
    this.sendWebSocketData(p, response);
  }
  for (let w = 0; w < this.playersToAppend.length; w++) {
    this.sendWaitingPlayerWebSocketData(w, response);
  }
  for (let s = 0; s < this.spectators.length; s++) {
    this.sendSpectatorWebSocketData(s, response);
  }
  setTimeout(function () {
    _this.staging();
  }, 2000);
};

// ---------------------------------------------------------------------------------------------------------------------

// Send all player cards to all clients before round results call
Room.prototype.sendAllPlayersCards = function () {
  this.currentStage = Room.HOLDEM_STAGE_TEN_RESULTS; // Increment
  const _this = this;
  let response = {key: '', data: {}};
  response.key = 'allPlayersCards';
  response.data.players = [];
  for (let i = 0; i < this.players.length; i++) {
    let playerData = {};
    playerData.playerId = this.players[i].playerId;
    playerData.cards = this.players[i].playerCards;
    response.data.players.push(playerData);
  }
  for (let p = 0; p < this.players.length; p++) {
    this.sendWebSocketData(p, response);
  }
  for (let a = 0; a < this.playersToAppend.length; a++) {
    this.sendWaitingPlayerWebSocketData(a, response);
  }
  for (let s = 0; s < this.spectators.length; s++) {
    this.sendSpectatorWebSocketData(s, response);
  }
  setTimeout(function () {
    _this.staging();
  }, 3000);
};

// ---------------------------------------------------------------------------------------------------------------------

// Calculate winner and transfer money
Room.prototype.roundResultsEnd = function () {
  const _this = this;
  logger.log('--------ROUND RESULT-----------');
  let winnerPlayers = [];

  let currentHighestRank = 0;
  let l = this.players.length;
  for (let i = 0; i < l; i++) {
    if (!this.players[i].isFold) {
      // Use poker solver to get hand used in evaluation
      let hand = pokerSolver.solve(utils.asciiToStringCardsArray([
        this.middleCards[0], this.middleCards[1], this.middleCards[2], this.middleCards[3], this.middleCards[4],
        this.players[i].playerCards[0], this.players[i].playerCards[1]
      ]));
      this.players[i].cardsInvolvedOnEvaluation = hand.cards;
      // Use Hand ranks to get value and hand name
      let evaluated = this.evaluatePlayerCards(i);
      this.players[i].handValue = evaluated.value;
      this.players[i].handName = evaluated.handName;
      // Log out results
      logger.log(this.players[i].playerName + ' has ' + this.players[i].handName + ' with value: ' + this.players[i].handValue
        + ' cards involved: ' + hand.cards, logger.LOG_GREEN);
      // Calculate winner(s)
      if (this.players[i].handValue > currentHighestRank) {
        currentHighestRank = this.players[i].handValue;
        winnerPlayers = []; // zero it
        winnerPlayers.push(i);
      } else if (this.players[i].handValue === currentHighestRank) {
        winnerPlayers.push(i);
      }
    }
  }
  let winnerNames = [];
  let sharedPot = (this.totalPot / winnerPlayers.length);
  l = winnerPlayers.length;
  for (let i = 0; i < l; i++) {
    winnerNames.push(this.players[winnerPlayers[i]].playerName + (l > 1 ? '' : ''));
    this.players[winnerPlayers[i]].playerMoney = this.players[winnerPlayers[i]].playerMoney + sharedPot;
    this.roundWinnerPlayerIds.push(this.players[winnerPlayers[i]].playerId);
    this.roundWinnerPlayerCards.push(utils.stringToAsciiCardsArray(this.players[winnerPlayers[i]].cardsInvolvedOnEvaluation));
  }
  logger.log('Room = ' + this.roomName + ' winner(s) are : ' + winnerNames);
  this.currentStatusText = winnerNames + ' got ' + this.players[winnerPlayers[0]].handName;


  this.updateLoggedInPlayerDatabaseStatistics(winnerPlayers, this.lastWinnerPlayers);
  this.lastWinnerPlayers = winnerPlayers; // Take new reference of winner players
  this.totalPot = 0;
  this.isResultsCall = true;

  // Continue
  setTimeout(function () {
    _this.gameStarted = false;
    _this.triggerNewGame();
  }, config.games.holdEm.holdEmGames[this.holdemType].afterRoundCountdown * 1000);
};


// Game has stopped middle of the game due everyone folded or disconnected except one
Room.prototype.roundResultsMiddleOfTheGame = function () {
  const _this = this;
  let winnerPlayer = -1;
  for (let i = 0; i < this.players.length; i++) {
    if (this.players[i] !== null) {
      if (!this.players[i].isFold) {
        winnerPlayer = i;
        break;
      }
    }
  }
  if (winnerPlayer !== -1) {
    this.collectChipsToPotAndSendAction();
    this.collectingPot = false;
    this.players[winnerPlayer].playerMoney = this.players[winnerPlayer].playerMoney + this.totalPot;
    this.currentStatusText = this.players[winnerPlayer].playerName + ' is only standing player!';
    this.currentTurnText = '';
    this.isResultsCall = true;
    this.updateLoggedInPlayerDatabaseStatistics([winnerPlayer], this.lastWinnerPlayers);
    this.lastWinnerPlayers = [winnerPlayer]; // Take new reference of winner player
  }
  setTimeout(function () {
    _this.gameStarted = false;
    _this.triggerNewGame();
  }, config.games.holdEm.holdEmGames[this.holdemType].afterRoundCountdown * 1000);
};


// *********************************************************************************************************************
// *********************************************************************************************************************
/* Every betting round goes thru this logic */

Room.prototype.bettingRound = function (current_player_turn) {
  let _this = this;
  if (this.getActivePlayers()) { // Checks that game has active players (not fold ones)
    let verifyBets = this.verifyPlayersBets(); // Active players have correct amount of money in game
    let noRoundPlayedPlayer = this.getNotRoundPlayedPlayer(); // Returns player position who has not played it's round
    if (current_player_turn >= this.players.length || this.isCallSituation && verifyBets === -1 || verifyBets === -1 && noRoundPlayedPlayer === -1) {
      this.resetPlayerStates();
      if (verifyBets === -1 && this.smallBlindGiven) {
        if (noRoundPlayedPlayer === -1) {
          this.currentStage = this.currentStage + 1;
          if (this.collectChipsToPotAndSendAction()) { // Collect pot and send action if there is pot to collect
            setTimeout(function () {
              _this.collectingPot = false;
              _this.staging();
            }, 2500); // Have some time to collect pot and send action
          } else {
            setTimeout(function () {
              _this.staging(); // No pot to collect, continue without timing
            }, 1000);
          }
        } else {
          //this.bettingRound(noRoundPlayedPlayer);
          // --- going into testing ---
          this.players[noRoundPlayedPlayer].isPlayerTurn = true;
          this.players[noRoundPlayedPlayer].playerTimeLeft = this.turnTimeOut;
          this.currentTurnText = '' + this.players[noRoundPlayedPlayer].playerName + ' Turn';
          this.sendStatusUpdate();

          if (this.players[noRoundPlayedPlayer].isBot) {
            this.botActionHandler(noRoundPlayedPlayer);
          }
          this.bettingRoundTimer(noRoundPlayedPlayer);
          // --- going into testing ---
        }
      } else {
        this.isCallSituation = true;
        this.bettingRound(verifyBets);
      }

    } else {

      if (this.players[current_player_turn] != null || this.isCallSituation && verifyBets === -1 || !this.smallBlindGiven || !this.bigBlindGiven || !this.bigBlindPlayerHadTurn) { // 07.08.2018, added || !this.bigBlindPlayerHadTurn

        // Forced small and big blinds case
        if (this.currentStage === Room.HOLDEM_STAGE_TWO_PRE_FLOP && (!this.smallBlindGiven || !this.bigBlindGiven)) {
          this.playerCheck(this.players[current_player_turn].playerId, this.players[current_player_turn].socketKey);
          this.bettingRound(current_player_turn + 1);

        } else {
          if (!this.players[current_player_turn].isFold && !this.players[current_player_turn].isAllIn) {
            if (verifyBets !== -1 || !this.smallBlindGiven || !this.bigBlindGiven) {
              this.isCallSituation = true;
            }
            // player's turn
            this.players[current_player_turn].isPlayerTurn = true;
            this.players[current_player_turn].playerTimeLeft = this.turnTimeOut;
            this.currentTurnText = '' + this.players[current_player_turn].playerName + ' Turn';
            this.sendStatusUpdate();

            if (this.players[current_player_turn].isBot) {
              this.botActionHandler(current_player_turn);
            }
            this.bettingRoundTimer(current_player_turn);
          } else {
            this.current_player_turn = this.current_player_turn + 1;
            this.bettingRound(this.current_player_turn);
          }
        }
      } else {
        if (this.isCallSituation && verifyBets !== -1) {
          this.bettingRound(verifyBets);
        } else {
          this.current_player_turn = this.current_player_turn + 1;
          this.bettingRound(this.current_player_turn);
        }
      }

    }
  } else {
    this.roundResultsMiddleOfTheGame();
  }
};

Room.prototype.bettingRoundTimer = function (current_player_turn) {
  let turnTime = 0;
  const _this = this;
  this.turnIntervalObj = setInterval(function () {
    if (_this.players[current_player_turn] !== null) {
      if (_this.players[current_player_turn].playerState === player.Player.PLAYER_STATE_NON) {
        turnTime = turnTime + 1000;
        _this.players[current_player_turn].playerTimeLeft = _this.turnTimeOut - turnTime;
      } else {
        _this.clearTimers();
        _this.bettingRound(current_player_turn + 1);
      }
    } else {
      _this.clearTimers();
      _this.bettingRound(current_player_turn + 1);
    }
  }, 1000);
  this.turnTimeOutObj = setTimeout(function () {
    if (_this.players[current_player_turn].playerState === player.Player.PLAYER_STATE_NON) {
      _this.playerFold(_this.players[current_player_turn].playerId, _this.players[current_player_turn].socketKey);
      _this.sendStatusUpdate();
    }
    _this.clearTimers();
    _this.bettingRound(current_player_turn + 1);
  }, _this.turnTimeOut + 200);
};

// *********************************************************************************************************************
// *********************************************************************************************************************


// ------------------------------------------------------------------------
/* Timers */

Room.prototype.clearTimers = function () {
  clearInterval(this.turnIntervalObj);
  clearTimeout(this.turnTimeOutObj);
};


// ------------------------------------------------------------------------
// Some helper methods

Room.prototype.sendStatusUpdate = function () {
  let response = {key: '', data: {}};
  response.key = 'statusUpdate';
  response.data.totalPot = this.totalPot;
  response.data.currentStatus = this.currentStatusText;
  response.data.currentTurnText = this.currentTurnText;
  response.data.middleCards = this.middleCards;
  response.data.playersData = [];
  response.data.isCallSituation = this.isCallSituation;
  response.data.isResultsCall = this.isResultsCall;
  response.data.roundWinnerPlayerIds = this.roundWinnerPlayerIds;
  response.data.roundWinnerPlayerCards = this.roundWinnerPlayerCards;
  for (let i = 0; i < this.players.length; i++) {
    let playerData = {};
    playerData.playerId = this.players[i].playerId;
    playerData.playerName = this.players[i].playerName;
    playerData.playerMoney = this.players[i].playerMoney;
    playerData.totalBet = this.players[i].totalBet;
    playerData.isPlayerTurn = this.players[i].isPlayerTurn;
    playerData.isFold = this.players[i].isFold;
    playerData.timeLeft = this.players[i].playerTimeLeft;
    playerData.timeBar = this.players[i].playerTimeLeft / this.turnTimeOut * 100;
    response.data.playersData[i] = playerData;
  }
  response.data.roomName = this.roomName; // Room name
  response.data.playingPlayersCount = this.players.length; // Players count in this room
  response.data.appendPlayersCount = this.playersToAppend.length; // Waiting to get appended in game players count
  response.data.spectatorsCount = this.spectators.length; // Spectating people count
  response.data.deckStatus = this.deckCard + '/' + this.deckSize;
  response.data.deckCardsBurned = this.deckCardsBurned; // How many cards is burned
  response.data.collectingPot = this.collectingPot;

  if (String(JSON.stringify(this.updateJsonTemp)) !== String(JSON.stringify(response))) { // Added !== (faster, no conversion over !=)
    for (let i = 0; i < this.players.length; i++) {
      this.updateJsonTemp = response;
      this.sendWebSocketData(i, response);
    }
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
  }
};


// ---------------------------------------------------------------------------------------------------------------------

// Remember that if small or big blind is not given, folding player must still pay blind
Room.prototype.playerFold = function (connection_id, socketKey) {
  let playerId = this.getPlayerId(connection_id);
  if (this.players[playerId] !== undefined) {
    if (this.players[playerId].connection != null && this.players[playerId].socketKey === socketKey || this.players[playerId].isBot) {
      if (playerId !== -1) {
        if (!this.smallBlindGiven || !this.bigBlindGiven) {
          let blind_amount = 0;
          if (!this.smallBlindGiven && !this.bigBlindGiven) {
            blind_amount = (this.roomMinBet / 2);
            this.smallBlindGiven = true;
          } else if (this.smallBlindGiven && !this.bigBlindGiven) {
            blind_amount = this.roomMinBet;
            this.bigBlindGiven = true;
          }
          if (blind_amount <= this.players[playerId].playerMoney) {
            if (blind_amount === this.players[playerId].playerMoney || this.someOneHasAllIn()) {
              this.players[playerId].isAllIn = true;
            }
            this.players[playerId].totalBet = this.players[playerId].totalBet + blind_amount;
            this.players[playerId].playerMoney = this.players[playerId].playerMoney - blind_amount;
          }
        }
        this.players[playerId].setStateFold();
        this.checkHighestBet();
        //this.calculateTotalPot();
        this.sendLastPlayerAction(connection_id, PLAYER_ACTION_FOLD);
        this.sendAudioCommand('fold');
      }
    }
  }
};


// Player checks but also Call goes tru this function
Room.prototype.playerCheck = function (connection_id, socketKey) {
  let playerId = this.getPlayerId(connection_id);
  if (this.players[playerId].connection != null && this.players[playerId].socketKey === socketKey || this.players[playerId].isBot) {
    if (playerId !== -1) {
      let check_amount = 0;
      if (this.isCallSituation || this.totalPot === 0 || !this.smallBlindGiven || !this.bigBlindGiven) {
        if (this.smallBlindGiven && this.bigBlindGiven) {
          check_amount = this.currentHighestBet === 0 ? this.roomMinBet : (this.currentHighestBet - this.players[playerId].totalBet);
        } else {
          if (this.smallBlindGiven && !this.bigBlindGiven) {
            check_amount = this.roomMinBet;
            this.bigBlindGiven = true;
            this.players[playerId].roundPlayed = false; // 07.08.2018, remove if causes problems
          } else {
            check_amount = this.roomMinBet / 2;
            this.smallBlindGiven = true;
          }
        }
        if (check_amount <= this.players[playerId].playerMoney) {
          this.players[playerId].setStateCheck();
          if (check_amount === this.players[playerId].playerMoney || this.someOneHasAllIn()) {
            this.players[playerId].isAllIn = true;
          }
          this.players[playerId].totalBet = this.players[playerId].totalBet + check_amount;
          this.players[playerId].playerMoney = this.players[playerId].playerMoney - check_amount;
        }
        if (this.isCallSituation) {
          this.sendLastPlayerAction(connection_id, PLAYER_ACTION_CALL);
        }
      } else {
        this.players[playerId].setStateCheck();
        this.sendLastPlayerAction(connection_id, PLAYER_ACTION_CHECK);
      }
      if (this.isCallSituation || check_amount > 0) {
        this.sendAudioCommand('call');
      } else {
        this.sendAudioCommand('check');
      }
      this.checkHighestBet();
      //this.calculateTotalPot();
    }
  }
};


Room.prototype.playerRaise = function (connection_id, socketKey, amount) {
  let playerId = this.getPlayerId(connection_id);
  if (this.players[playerId].connection !== null && this.players[playerId].socketKey === socketKey || this.players[playerId].isBot) {
    if (playerId !== -1) {
      let playerBetDifference = (this.currentHighestBet - this.players[playerId].totalBet);
      if (amount === 0) {
        amount = playerBetDifference;
      }
      if (amount < playerBetDifference) {
        amount = (playerBetDifference + amount);
      }
      if (amount <= this.players[playerId].playerMoney) {
        if (amount === this.players[playerId].playerMoney || this.someOneHasAllIn()) {
          this.players[playerId].isAllIn = true;
        }
        this.players[playerId].setStateRaise();
        this.players[playerId].totalBet = this.players[playerId].totalBet + amount;
        this.players[playerId].playerMoney = this.players[playerId].playerMoney - amount;
        this.isCallSituation = true;
        if (!this.smallBlindGiven || !this.bigBlindGiven) {
          if (amount >= (this.roomMinBet / 2)) {
            this.smallBlindGiven = true;
          }
          if (amount >= this.roomMinBet) {
            this.bigBlindGiven = true;
          }
        }
      }
      this.sendLastPlayerAction(connection_id, PLAYER_ACTION_RAISE);
      this.sendAudioCommand('raise');
      this.checkHighestBet();
      //this.calculateTotalPot();
    }
  }
};


// ---------------------------------------------------------------------------------------------------------------------

/*
Room.prototype.calculateTotalPot = function () {
    //this.totalPot = 0;
    this.totalPot = this.totalPot + this.tempPot;
    for (let i = 0; i < this.players.length; i++) {
        this.totalPot = this.totalPot + this.players[i].totalBet;
    }
};
*/


// Burn one card before dealing
Room.prototype.burnCard = function () {
  this.deckCard = this.deckCard + 1;
  this.deckCardsBurned = this.deckCardsBurned + 1;
};


Room.prototype.resetPlayerParameters = function () {
  this.resetPlayerStates();
  for (let i = 0; i < this.players.length; i++) {
    this.players[i].resetParams();
    this.players[i].checkFunds(this.roomMinBet);
  }
};

Room.prototype.resetPlayerStates = function () {
  for (let i = 0; i < this.players.length; i++) {
    this.players[i].playerState = player.Player.PLAYER_STATE_NON;
  }
};


// Method checks that every player has correct amount of money in bet
Room.prototype.verifyPlayersBets = function () {
  let highestBet = 0;
  for (let i = 0; i < this.players.length; i++) { // Get highest bet
    if (this.players[i] != null) {
      if (!this.players[i].isFold) {
        if (highestBet === 0) {
          highestBet = this.players[i].totalBet;
        }
        if (this.players[i].totalBet > highestBet) {
          highestBet = this.players[i].totalBet;
        }
      }
    }
  }
  for (let i = 0; i < this.players.length; i++) { // Find some one with lower bet
    if (this.players[i] != null) {
      if (!this.players[i].isFold && !this.players[i].isAllIn) {
        if (this.players[i].totalBet < highestBet) {
          return i;
        }
      }
    }
  }
  return !this.smallBlindGiven || !this.bigBlindGiven ? 0 : -1;
};


Room.prototype.checkHighestBet = function () {
  for (let i = 0; i < this.players.length; i++) {
    if (this.players[i].totalBet > this.currentHighestBet) {
      this.currentHighestBet = this.players[i].totalBet;
    }
  }
};


// Get room parameters
Room.prototype.getRoomParams = function () {
  let response = {key: '', data: {}};
  response.key = 'roomParams';
  response.data.gameStarted = !!(this.currentStage >= Room.HOLDEM_STAGE_ONE_HOLE_CARDS && this.holeCardsGiven);
  response.data.playerCount = this.players.length;
  response.data.roomMinBet = this.roomMinBet;
  response.data.middleCards = this.middleCards;
  response.data.playersData = [];
  for (let i = 0; i < this.players.length; i++) {
    let playerData = {};
    playerData.playerId = this.players[i].playerId;
    playerData.playerName = this.players[i].playerName;
    playerData.playerMoney = this.players[i].playerMoney;
    playerData.isDealer = this.players[i].isDealer;
    response.data.playersData[i] = playerData;
  }
  return response;
};


// Send data to game players via this function
Room.prototype.sendWebSocketData = function (player, data) {
  if (this.players[player] != null && !this.players[player].isBot) {
    if (this.players[player].connection != null) {
      if (this.players[player].connection.readyState === OPEN) {
        //console.log('* Sending data: ' + JSON.stringify(data));
        this.players[player].connection.sendText(JSON.stringify(data));
      } else {
        this.players[player].connection = null;
      }
    } else {
      this.players[player].setStateFold();
    }
  }
};


// Send data to waiting game players via this function
Room.prototype.sendWaitingPlayerWebSocketData = function (player, data) {
  if (this.playersToAppend[player] != null && !this.playersToAppend[player].isBot) {
    if (this.playersToAppend[player].connection != null) {
      if (this.playersToAppend[player].connection.readyState === OPEN) {
        this.playersToAppend[player].connection.sendText(JSON.stringify(data));
      } else {
        this.playersToAppend[player].connection = null;
      }
    }
  }
};


// Send room status data to spectators
Room.prototype.sendSpectatorWebSocketData = function (spectator, data) {
  if (this.spectators[spectator] != null) {
    if (this.spectators[spectator].connection != null) {
      if (this.spectators[spectator].connection.readyState === OPEN) {
        this.spectators[spectator].connection.sendText(JSON.stringify(data));
      }
    }
  }
};


// Clean spectators with this function
Room.prototype.cleanSpectators = function () {
  this.spectatorsTemp = [];
  for (let i = 0; i < this.spectators.length; i++) { // Take good spectators to temp array
    if (this.spectators[i] !== null) {
      if (this.spectators[i].connection !== null) {
        this.spectatorsTemp.push(this.spectators[i]);
      }
    }
  }
  this.spectators = []; // Clear main spectators array before refilling with good ones
  for (let p = 0; p < this.spectatorsTemp.length; p++) {
    if (this.spectatorsTemp[p] !== null) {
      if (this.spectatorsTemp[p].connection !== null) {
        this.spectators.push(this.spectatorsTemp[p]);
      }
    }
  }
};


// Needed to be able to play other players command audio on client side
Room.prototype.sendAudioCommand = function (action) {
  let response = {key: '', data: {}};
  response.key = 'audioCommand';
  response.data.command = action;
  for (let i = 0; i < this.players.length; i++) {
    this.updateJsonTemp = response;
    this.sendWebSocketData(i, response);
  }
  for (let w = 0; w < this.playersToAppend.length; w++) {
    this.sendWaitingPlayerWebSocketData(w, response);
  }
  for (let s = 0; s < this.spectators.length; s++) {
    this.sendSpectatorWebSocketData(s, response);
  }
};


// Animated last user action text command
Room.prototype.sendLastPlayerAction = function (connection_id, actionStr) {
  let response = {key: '', data: {}};
  response.key = 'lastUserAction';
  this.lastUserAction.playerId = connection_id;
  this.lastUserAction.actionText = actionStr;
  response.data = this.lastUserAction;
  //console.log('Last user action data: ' + JSON.stringify(response));
  for (let i = 0; i < this.players.length; i++) {
    this.updateJsonTemp = response;
    this.sendWebSocketData(i, response);
  }
  for (let w = 0; w < this.playersToAppend.length; w++) {
    this.sendWaitingPlayerWebSocketData(w, response);
  }
  for (let s = 0; s < this.spectators.length; s++) {
    this.sendSpectatorWebSocketData(s, response);
  }
};


// Collect chips to pot action, collects and clears user total pots for this round
Room.prototype.collectChipsToPotAndSendAction = function () {
  // Collections
  let boolMoneyToCollect = false;
  for (let u = 0; u < this.players.length; u++) {
    if (this.players[u].totalBet > 0) {
      boolMoneyToCollect = true;
    }
    this.totalPot = this.totalPot + this.players[u].totalBet; // Get round bet to total pot
    this.players[u].totalBet = 0; // It's collected, we can empty players total bet
  }
  // Send animation action
  if (boolMoneyToCollect) {
    this.collectingPot = true;
    let response = {key: '', data: {}};
    response.key = 'collectChipsToPot';
    for (let i = 0; i < this.players.length; i++) {
      this.updateJsonTemp = response;
      this.sendWebSocketData(i, response);
    }
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
    return true; // Money to collect, wait before continuing to staging
  }
  return false; // No money to collect, continue staging without delay
};


// Custom message to send to a playing client before object is moved
Room.prototype.sendClientMessage = function (playerObject, message) {
  let response = {key: '', data: {}};
  response.key = 'clientMessage';
  response.data.message = message;
  if (playerObject.connection != null) {
    if (playerObject.connection.readyState === OPEN) {
      playerObject.connection.sendText(JSON.stringify(response));
    }
  }
};


Room.prototype.getNextDeckCard = function () {
  let nextCard = this.deck[this.deckCard];
  this.deckCard = this.deckCard + 1;
  return nextCard;
};


Room.prototype.getPlayerId = function (connection_id) {
  let playerId = -1;
  for (let i = 0; i < this.players.length; i++) {
    if (this.players[i].playerId === connection_id) {
      playerId = i;
      break;
    }
  }
  return playerId;
};


Room.prototype.getActivePlayers = function () {
  let count = 0;
  for (let i = 0; i < this.players.length; i++) {
    if (this.players[i] !== null) {
      if (!this.players[i].isFold) {
        count = count + 1;
      }
    }
  }
  return count > 1;
};


// Function checks if some one has all in
Room.prototype.someOneHasAllIn = function () {
  let count = 0;
  for (let i = 0; i < this.players.length; i++) {
    if (this.players[i].isAllIn) {
      count = count + 1;
    }
  }
  return count > 0;
};


// Set next dealer player
Room.prototype.setNextDealerPlayer = function () {
  this.dealerPlayerArrayIndex = this.dealerPlayerArrayIndex + 1;
  if (this.dealerPlayerArrayIndex >= this.players.length) {
    this.dealerPlayerArrayIndex = 0;
  }
  this.players[this.dealerPlayerArrayIndex].isDealer = true;
};


// Get next small blind player
Room.prototype.getNextSmallBlindPlayer = function () {
  if (this.players.length > 2) {
    this.smallBlindPlayerArrayIndex = this.dealerPlayerArrayIndex + 1;
    if (this.smallBlindPlayerArrayIndex >= this.players.length) {
      this.smallBlindPlayerArrayIndex = 0;
    }
  } else {
    this.smallBlindPlayerArrayIndex = this.dealerPlayerArrayIndex;
  }
};


// Get next big blind player
// Note: always get thru smallBlindPlayerArrayIndex since +2 can convert position to one backwards after >= checking 2 comes 1
Room.prototype.getNextBigBlindPlayer = function () {
  let bigBlindPlayerIndex = this.smallBlindPlayerArrayIndex + 1;
  if (bigBlindPlayerIndex >= this.players.length) {
    bigBlindPlayerIndex = 0;
  }
  return bigBlindPlayerIndex;
};


// Reset player round related parameters
Room.prototype.resetRoundParameters = function () {
  for (let i = 0; i < this.players.length; i++) {
    this.players[i].roundPlayed = false;
  }
};


// Get player which has not played round
Room.prototype.getNotRoundPlayedPlayer = function () {
  // Check that all players have had their turn
  for (let i = 0; i < this.players.length; i++) {
    if (!this.players[i].isFold && !this.players[i].roundPlayed && !this.players[i].isAllIn) {
      return i;
    }
  }
  // Check that big blind player have had it's turn
  if (this.currentStage === Room.HOLDEM_STAGE_TWO_PRE_FLOP && this.smallBlindGiven && this.bigBlindGiven && this.bigBlindPlayerHadTurn === false) {
    this.bigBlindPlayerHadTurn = true;
    let bigBlindPlayer = this.getNextBigBlindPlayer();
    this.players[bigBlindPlayer].playerState = player.Player.PLAYER_STATE_NON;
    this.players[bigBlindPlayer].roundPlayed = false;
    //logger.log('Big blind player: ' + bigBlindPlayer, logger.LOG_CYAN);
    return bigBlindPlayer;
  }
  // Otherwise return -1 to continue
  return -1;
};


// Evaluate player hand
Room.prototype.evaluatePlayerCards = function (current_player) {
  let cardsToEvaluate = [];
  let ml = this.middleCards.length;
  // Push available middle cards
  for (let i = 0; i < ml; i++) {
    if (this.middleCards[i] !== void 0) { // Index is not 'undefined'
      cardsToEvaluate.push(this.middleCards[i]);
    }
  }
  // Push player hole cards
  if (this.players[current_player] === undefined) {
    return {value: 0, handName: null};
  } else {
    if (this.players[current_player].playerCards == null || this.players[current_player].playerCards === undefined) { // 03.08.2018 bug fix
      return {value: 0, handName: null};
    } else {
      cardsToEvaluate.push(this.players[current_player].playerCards[0]);
      cardsToEvaluate.push(this.players[current_player].playerCards[1]);
      let cl = cardsToEvaluate.length;
      if (cl === 3 || cl === 5 || cl === 6 || cl === 7) {
        return evaluator.evalHand(cardsToEvaluate);
      } else {
        return {value: null, handName: null};
      }
    }
  }
};


// Update logged in users database statistics (Input is array of this.players indexes)
Room.prototype.updateLoggedInPlayerDatabaseStatistics = function (winnerPlayers, lastWinnerPlayers) {
  for (let i = 0; i < this.players.length; i++) {
    if (this.players[i] !== null) {
      if (this.players[i].connection !== null) {
        if (!this.players[i].isBot && this.players[i].isLoggedInPlayer()) {

          // this.fancyLogGreen(this.arrayHasValue(winnerPlayers, i));
          if (this.arrayHasValue(winnerPlayers, i)) { // Update win count
            let winStreak = this.arrayHasValue(lastWinnerPlayers, i);
            dbUtils.UpdatePlayerWinCountPromise(this.sequelizeObjects, this.eventEmitter, this.players[i].playerId, this.players[i].playerDatabaseId, winStreak).then(() => {
            });
            this.players[i].playerWinCount = this.players[i].playerWinCount + 1;

          } else {

            // Update lose count (update only if money is raised up from small and big blinds)
            if (this.totalPot > (this.roomMinBet * this.players.length)) {
              this.players[i].playerLoseCount = this.players[i].playerLoseCount + 1;
              dbUtils.UpdatePlayerLoseCountPromise(this.sequelizeObjects, this.players[i].playerDatabaseId).then(() => {
              });
            }
          }

          // Update player funds
          dbUtils.UpdatePlayerMoneyPromise(this.sequelizeObjects, this.players[i].playerDatabaseId, this.players[i].playerMoney).then(() => {
          });
          dbUtils.InsertPlayerStatisticPromise(
            this.sequelizeObjects, this.players[i].playerDatabaseId,
            this.players[i].playerMoney, this.players[i].playerWinCount,
            this.players[i].playerLoseCount
          ).then(() => {
            logger.log('Updated player ' + this.players[i].playerName + ' statistics.', logger.LOG_GREEN);
          }).catch(error => {
            logger.log(error, logger.LOG_RED);
          });
        }
      }
    }
  }
};


// Array has player
Room.prototype.arrayHasValue = function (array, value) {
  let l = array.length;
  for (let i = 0; i < l; i++) {
    if (array[i] === value) {
      return true;
    }
  }
  return false;
};


// ---------------------------------------------------------------------------------------------------------------------


Room.prototype.botActionHandler = function (current_player_turn) {
  const _this = this;
  let check_amount = (this.currentHighestBet === 0 ? this.roomMinBet : (this.currentHighestBet - this.players[current_player_turn].totalBet));
  let playerId = this.players[current_player_turn].playerId;
  let botObj = new bot.Bot(
    this.holdemType,
    this.players[current_player_turn].playerName,
    this.players[current_player_turn].playerMoney,
    this.players[current_player_turn].playerCards,
    this.isCallSituation,
    this.roomMinBet,
    check_amount,
    this.smallBlindGiven,
    this.bigBlindGiven,
    this.evaluatePlayerCards(current_player_turn).value,
    this.currentStage,
    this.players[current_player_turn].totalBet
  );
  let resultSet = botObj.performAction();
  let tm = setTimeout(function () {
    switch (resultSet.action) {
      case 'bot_fold':
        _this.playerFold(playerId);
        break;
      case 'bot_check':
        _this.playerCheck(playerId);
        break;
      case 'bot_call':
        _this.playerCheck(playerId);
        break;
      case 'bot_raise':
        _this.playerRaise(playerId, null, resultSet.amount);
        break;
      case 'remove_bot': // Bot run out of money
        _this.playerFold(playerId);
        _this.removeBotFromRoom(current_player_turn);
        break;
      default:
        _this.playerCheck(playerId);
        break;
    }
    _this.sendStatusUpdate();

    clearTimeout(tm);
  }, config.games.holdEm.bot.turnTimes[utils.getRandomInt(1, 4)]);
};


Room.prototype.removeBotFromRoom = function (current_player_turn) {
  this.eventEmitter.emit('needNewBot', this.roomId);
  this.players[current_player_turn].connection = null;
};


// Returns count of bots in this room
Room.prototype.getRoomBotCount = function () {
  let l = this.players.length;
  let c = 0;
  for (let i = 0; i < l; i++) {
    if (this.players[i].isBot) {
      c++;
    }
  }
  return c;
};


// ---------------------------------------------------------------------------------------------------------------------

// Extend array capabilities
// noinspection JSUnusedGlobalSymbols
Room.prototype.contains = function (array, element) {
  return this.indexOf(element) > -1;
};


Room.prototype.indexOf = function indexOf(member, startFrom) {
  if (this == null) {
    throw new TypeError('Array.prototype.indexOf() - can\'t convert `\' + this + \'` to object');
  }
  let index = isFinite(startFrom) ? Math.floor(startFrom) : 0,
    that = this instanceof Object ? this : new Object(this),
    length = isFinite(that.length) ? Math.floor(that.length) : 0;
  if (index >= length) {
    return -1;
  }
  if (index < 0) {
    index = Math.max(length + index, 0);
  }
  if (member === undefined) {
    do {
      if (index in that && that[index] === undefined) {
        return index;
      }
    } while (++index < length);
  } else {
    do {
      if (that[index] === member) {
        return index;
      }
    } while (++index < length);
  }
  return -1;
};

// ---------------------------------------------------------------------------------------------------------------------
