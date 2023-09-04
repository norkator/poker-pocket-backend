// Player states
Player.PLAYER_STATE_NON = 0;
Player.PLAYER_STATE_FOLD = 1;
Player.PLAYER_STATE_CHECK = 2;
Player.PLAYER_STATE_RAISE = 3;


// Constructor
function Player(conn, socketKey, connection_id, player_money, isBot) {
  this.isBot = isBot;
  this.connection = conn; // Connection object to player
  this.socketKey = socketKey;
  this.playerId = connection_id; // Connection id
  this.playerDatabaseId = -1; // Use this to detect logged in player
  this.selectedRoomId = -1;
  this.playerName = null;
  this.playerMoney = player_money;
  this.playerWinCount = 0;
  this.playerLoseCount = 0;
  this.playerCards = [];
  this.playerState = Player.PLAYER_STATE_NON;
  this.totalBet = 0;
  this.isDealer = false;
  this.isPlayerTurn = false;
  this.playerTimeLeft = 0;
  this.isFold = false;
  this.isAllIn = false;
  this.roundPlayed = false;
  this.handValue = 0;
  this.handName = '';
  this.cardsInvolvedOnEvaluation = [];
}

exports.Player = Player;


Player.prototype.resetParams = function () {
  this.playerCards = [];
  this.totalBet = 0;
  this.isPlayerTurn = false;
  this.playerTimeLeft = 0;
  this.isFold = false;
  this.isAllIn = false;
  this.handValue = 0;
  this.handName = '';
  this.cardsInvolvedOnEvaluation = [];
  this.isDealer = false;
};


Player.prototype.checkFunds = function (roomMinBet) {
  if (this.playerMoney < roomMinBet) {
    this.setStateFold();
  }
};


Player.prototype.isLoggedInPlayer = function () {
  // noinspection RedundantIfStatementJS
  if (this.playerDatabaseId === -1) {
    return false;
  } else {
    return true;
  }
};


// noinspection JSUnusedGlobalSymbols
Player.prototype.setPlayerMoney = function (amount) {
  this.playerMoney = amount;
};


// Class method
// noinspection JSUnusedGlobalSymbols
Player.prototype.setStateNon = function () {
  this.playerState = Player.PLAYER_STATE_NON;
};

Player.prototype.setStateFold = function () {
  this.playerState = Player.PLAYER_STATE_FOLD;
  this.isFold = true;
  this.playerTimeLeft = 0;
  this.isPlayerTurn = false;
  this.roundPlayed = true;
};

Player.prototype.setStateCheck = function () {
  this.playerState = Player.PLAYER_STATE_CHECK;
  this.playerTimeLeft = 0;
  this.isPlayerTurn = false;
  this.roundPlayed = true;
};

Player.prototype.setStateRaise = function () {
  this.playerState = Player.PLAYER_STATE_RAISE;
  this.playerTimeLeft = 0;
  this.isPlayerTurn = false;
  this.roundPlayed = true;
};
