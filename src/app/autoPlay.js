// Bot for game play
const config = require('../../config');
const utils = require('./utils');
const roomStages = require('./room');
const logger = require('./logger');
const pokerOdds = require('poker-odds');

// Actions
AutoPlay.BOT_FOLD = "bot_fold";
AutoPlay.BOT_CHECK = "bot_check";
AutoPlay.BOT_CALL = "bot_call";
AutoPlay.BOT_RAISE = "bot_raise";
AutoPlay.REMOVE_BOT = "remove_bot";

/*
    Changelog:
        05.11.2018 - Created autoPlay action file for user based autoPlay actions. This is good for future development
 */

// checkAmount is amount needed for call / check, so if bot does not have funds --> fold instantly
function AutoPlay(holdemType, botName, playerMoney, myHand, middleCards, isCallSituation, roomMinBet, checkAmount, smallBlindGiven,
                  bigBlindGiven, handValue, currentStage, myTotalBet) {
  this.holdemType = holdemType;
  this.name = botName;
  this.playerMoney = playerMoney; // Funds left
  this.myHand = myHand;
  this.middleCards = middleCards;
  this.isCallSituation = isCallSituation;
  this.roomMinBet = roomMinBet;
  this.checkAmount = checkAmount;
  this.resultsSet = {action: '', amount: 0};
  this.smallBlindGiven = smallBlindGiven;
  this.bigBlindGiven = bigBlindGiven;
  this.handValue = handValue;
  this.currentStage = currentStage;
  this.myTotalBet = myTotalBet; // My total bet
}

exports.AutoPlay = AutoPlay;


AutoPlay.prototype.performAction = function () {

  // Error case checking
  if (this.myHand === undefined) {
    this.resultsSet.action = AutoPlay.BOT_FOLD;
    return this.resultsSet;
  }
  if (this.myHand[0] === undefined) {
    this.resultsSet.action = AutoPlay.BOT_FOLD;
    return this.resultsSet;
  }


  // Check bot's funds
  if (this.playerMoney <= (this.roomMinBet + 500)) { // Remove bot and add new one
    this.resultsSet.action = AutoPlay.REMOVE_BOT;
  }

  // If call situation and not enough money, fold out
  else if (this.isCallSituation && this.checkAmount > this.playerMoney) {
    this.resultsSet.action = AutoPlay.BOT_FOLD;

  } else {

    // --------------------------------------------------------------------------------------

    // # 1 First stage (two cards)
    if (this.currentStage === roomStages.Room.HOLDEM_STAGE_TWO_PRE_FLOP) {
      // Here we have hole cards only
      if (this.hasBadHoleCardsHand()) { // If true, fold out
        this.resultsSet.action = AutoPlay.BOT_FOLD;
      } else {
        let hasSameCards = this.myHand[0].charAt(0) === this.myHand[1].charAt(0);
        if (hasSameCards && !this.isCallSituation) { // Raise if same card numbers
          this.resultsSet.action = AutoPlay.BOT_RAISE;
          this.resultsSet.amount = this.getCalculatedRaiseAmount();
        } else {
          if (this.isCallSituation && !hasSameCards && utils.getRandomInt(0, 4) === 4) {
            this.resultsSet.action = AutoPlay.BOT_FOLD;
          } else {
            this.BOT_CHECK_CALL();
          }
        }
      }
    }

    // --------------------------------------------------------------------------------------

    // # 2 Second stage (two cards + three middle cards)
    else if (this.currentStage === roomStages.Room.HOLDEM_STAGE_FOUR_POST_FLOP) {
      // Here we have hole cards and three middle cards => 5 cards
      if (this.handValue < 4300 && this.isCallSituation) { // never fold if have nothing to call against (no money to lose on checks)
        this.resultsSet.action = AutoPlay.BOT_FOLD;
      } else {
        if ((this.handValue > 10000 || this.hasGoodOdds()) && !this.isCallSituation) {
          this.resultsSet.action = AutoPlay.BOT_RAISE;
          this.resultsSet.amount = this.getCalculatedRaiseAmount();
        } else {
          if (this.handValue < 7000 && this.isCallSituation) { // 02.08.2018 - added case to fold if call situation and bad cards
            this.resultsSet.action = AutoPlay.BOT_FOLD;
          } else {
            this.BOT_CHECK_CALL();
          }
        }
      }
    }

    // --------------------------------------------------------------------------------------

    // # 3 Third stage (two cards + four middle cards)
    else if (this.currentStage === roomStages.Room.HOLDEM_STAGE_SIX_THE_POST_TURN) {
      // Hole cards + four cards in the middle
      if (this.handValue < 4500 && this.isCallSituation) {
        this.resultsSet.action = AutoPlay.BOT_FOLD;
      } else {
        //if (this.checkAmount >= (2 * this.totalBet)) {
        //    this.resultsSet.action = AutoPlay.BOT_FOLD;
        //} else {
        if ((this.handValue > 15000 || this.hasGoodOdds()) && !this.isCallSituation) {
          this.resultsSet.action = AutoPlay.BOT_RAISE;
          this.resultsSet.amount = this.getCalculatedRaiseAmount();
        } else {
          if (this.handValue < 9000 && this.isCallSituation) { // 02.08.2018 - added case to fold if call situation and bad cards
            this.resultsSet.action = AutoPlay.BOT_FOLD;
          } else {
            this.BOT_CHECK_CALL();
          }
        }
        //}
      }
    }

    // --------------------------------------------------------------------------------------

    // # 4 Fourth stage (two cards + five middle cards *ALL OF THEM*), 02.08.2018 - added this whole case
    else if (this.currentStage === roomStages.Room.HOLDEM_STAGE_EIGHT_THE_SHOW_DOWN) {
      if ((this.handValue > 20000 || this.hasGoodOdds()) && !this.isCallSituation) {
        this.resultsSet.action = AutoPlay.BOT_RAISE;
        this.resultsSet.amount = this.getCalculatedRaiseAmount();
      } else {
        if ((this.handValue < 9000 || !this.hasGoodOdds()) && this.isCallSituation) {
          this.resultsSet.action = AutoPlay.BOT_FOLD;
        } else {
          this.BOT_CHECK_CALL();
        }
      }
    }

    // --------------------------------------------------------------------------------------

  }

  // Log bot action result
  logger.log(this.name + ' | ' + this.resultsSet.action + (this.resultsSet.amount > 0 ? (' ' + this.resultsSet.amount) : '') + (this.handValue !== null ? ' | ' + 'hand value: ' + this.handValue : '')
    + ' | ' + 'cA: ' + this.checkAmount, logger.LOG_YELLOW);
  return this.resultsSet;
};


AutoPlay.prototype.getRandomRaiseAmount = function () {
  let raise = config.games.holdEm.bot.betAmounts[this.holdemType][utils.getRandomInt(0, 3)];
  if (raise > this.playerMoney) {
    return this.getRandomRaiseAmount();
  } else {
    return raise;
  }
};


// Logically calculated amount to raise
AutoPlay.prototype.getCalculatedRaiseAmount = function () {
  let value1 = this.myTotalBet + this.checkAmount; // need to change what to take in count?
  let value2 = (value1 / 3); // Looking for third of the total to raise, topped to total
  let v = Math.ceil(((value1 + value2) + 1) / 10) * 10;
  v = v + [500, 750, 800, 1000, 1500][utils.getRandomInt(0, 4)]; // Random heap on top of it
  logger.log('Calculated raise amount: ' + v);
  v = (v > this.playerMoney ? this.playerMoney : v);
  return v;
};


// Helper to make right choice
AutoPlay.prototype.BOT_CHECK_CALL = function () {
  if (this.isCallSituation) {
    this.resultsSet.action = AutoPlay.BOT_CALL;
  } else {
    this.resultsSet.action = AutoPlay.BOT_CHECK;
  }
};


// Continues if hand is not bad starting hand
AutoPlay.prototype.hasBadHoleCardsHand = function () {
  let c = this.myHand[0][0] + this.myHand[1][0];
  let bc = ['Q7', 'Q6', 'Q5', 'Q4', 'Q3', 'Q2', 'J6', 'J5', 'J4', 'J3', 'J2', '95', '94', '93', '92', '85', '84', '83', '82',
    '74', '73', '72', '64', '63', '62', '53', '52', '43', '42', '32'];
  for (let i = 0; i < bc.length; i++) {
    if (this.contains(c, bc[i].charAt(0) && this.contains(c, bc[i].charAt(1)))) {
      return true;
    }
  }
  return false;
};


// Odds calculator
AutoPlay.prototype.hasGoodOdds = function () {
  // Check for valid stage
  if (this.currentStage >= roomStages.Room.HOLDEM_STAGE_FOUR_POST_FLOP) {
    // Convert my ascii hand to string hand
    const hand = [[
      utils.asciiCardToStringCard(this.myHand[0]),
      utils.asciiCardToStringCard(this.myHand[1])
    ]];
    // Convert board cards
    let board = [];
    for (let i = 0; i < this.middleCards.length; i++) {
      board.push(
        utils.asciiCardToStringCard(this.middleCards[i])
      );
    }
    // Run the numbers
    const iterations = 100000; // optional
    const result = pokerOdds.calculateEquity(hand, board, iterations);
    const count = result[0].count;
    for (let a = 0; a < result[0].handChances.length; a++) {
      result[0].handChances[a].percentage = (100 / count) * result[0].handChances[a].count;
    }
    // Save result
    let handChance = result[0].handChances;
    // console.log(handChance);
    // Return result
    return handChance[5].percentage > 10 || handChance[6].percentage > 10 || handChance[7].percentage > 10 || handChance[8].percentage > 8 || handChance[9].percentage > 8;
  } else {
    return false;
  }
};


// ---------------------------------------------------------------------------------------------------------------------

// Extend array capabilities
AutoPlay.prototype.contains = function (array, element) {
  return this.indexOf(element) > -1;
};


AutoPlay.prototype.indexOf = function indexOf(member, startFrom) {
  if (this == null) {
    throw new TypeError("Array.prototype.indexOf() - can't convert `" + this + "` to object");
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
