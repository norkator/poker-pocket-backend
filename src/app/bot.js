// Bot for game play
const config = require('../../config');
const utils = require('./utils');
const roomStages = require('./room');
const logger = require('./logger');


// Actions
Bot.BOT_FOLD = "bot_fold";
Bot.BOT_CHECK = "bot_check";
Bot.BOT_CALL = "bot_call";
Bot.BOT_RAISE = "bot_raise";
Bot.REMOVE_BOT = "remove_bot";

/*
    Changelog:
        05.08.2018 - Added isBot bit to separate bots from autoPlay actions (to tweak parameters)
        05.08.2018 - Added logic to never fold if have nothing to call against (no money to lose on checks)
        06.08.2018 - Added logic for # 1 First stage, fixed getCalculatedRaiseAmount function over playerMoney problem
        08.08.2018 - Many modifications because bots suddenly folded all time caused by myTotalBet change on collectPotAction
        05.11.2018 - Removed this.isBot logic check. Making autoPlay action for own file for future tricks
 */

// checkAmount is amount needed for call / check, so if bot does not have funds --> fold instantly
function Bot(holdemType, botName, playerMoney, myHand, isCallSituation, roomMinBet, checkAmount, smallBlindGiven,
             bigBlindGiven, handValue, currentStage, myTotalBet) {
  this.holdemType = holdemType;
  this.name = botName;
  this.playerMoney = playerMoney; // Funds left
  this.myHand = myHand;
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

exports.Bot = Bot;


Bot.prototype.performAction = function () {

  // Check bot's funds
  if (this.playerMoney <= (this.roomMinBet + 500)) { // Remove bot and add new one
    this.resultsSet.action = Bot.REMOVE_BOT;
  }

  // If call situation and not enough money, fold out
  else if (this.isCallSituation && this.checkAmount > this.playerMoney) {
    this.resultsSet.action = Bot.BOT_FOLD;

  } else {

    // --------------------------------------------------------------------------------------

    // # 1 First stage (two cards)
    if (this.currentStage === roomStages.Room.HOLDEM_STAGE_TWO_PRE_FLOP) {
      // Here we have hole cards only
      if (this.hasBadHoleCardsHand()) { // If true, fold out
        this.resultsSet.action = Bot.BOT_FOLD;
      } else {
        let hasSameCards = this.myHand[0].charAt(0) === this.myHand[1].charAt(0);
        if (hasSameCards && !this.isCallSituation) { // Raise if same card numbers
          this.resultsSet.action = Bot.BOT_RAISE;
          this.resultsSet.amount = this.getCalculatedRaiseAmount();
        } else {
          if (this.isCallSituation && !hasSameCards && utils.getRandomInt(0, 4) === 4) {
            this.resultsSet.action = Bot.BOT_FOLD;
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
        this.resultsSet.action = Bot.BOT_FOLD;
      } else {
        if (this.handValue > 10000 && !this.isCallSituation) {
          this.resultsSet.action = Bot.BOT_RAISE;
          this.resultsSet.amount = this.getCalculatedRaiseAmount();
        } else {
          if (this.handValue < 7000 && this.isCallSituation) { // 02.08.2018 - added case to fold if call situation and bad cards
            this.resultsSet.action = Bot.BOT_FOLD;
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
        this.resultsSet.action = Bot.BOT_FOLD;
      } else {
        //if (this.checkAmount >= (2 * this.totalBet)) {
        //    this.resultsSet.action = Bot.BOT_FOLD;
        //} else {
        if (this.handValue > 15000 && !this.isCallSituation) {
          this.resultsSet.action = Bot.BOT_RAISE;
          this.resultsSet.amount = this.getCalculatedRaiseAmount();
        } else {
          if (this.handValue < 9000 && this.isCallSituation) { // 02.08.2018 - added case to fold if call situation and bad cards
            this.resultsSet.action = Bot.BOT_FOLD;
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
      if (this.handValue > 20000 && !this.isCallSituation) {
        this.resultsSet.action = Bot.BOT_RAISE;
        this.resultsSet.amount = this.getCalculatedRaiseAmount();
      } else {
        if (this.handValue < 9000 && this.isCallSituation) {
          this.resultsSet.action = Bot.BOT_FOLD;
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


Bot.prototype.getRandomRaiseAmount = function () {
  let raise = config.games.holdEm.bot.betAmounts[this.holdemType][utils.getRandomInt(0, 3)];
  if (raise > this.playerMoney) {
    return this.getRandomRaiseAmount();
  } else {
    return raise;
  }
};


// Logically calculated amount to raise
Bot.prototype.getCalculatedRaiseAmount = function () {
  let value1 = this.myTotalBet + this.checkAmount; // need to change what to take in count?
  let value2 = (value1 / 3); // Looking for third of the total to raise, topped to total
  let v = Math.ceil(((value1 + value2) + 1) / 10) * 10;
  v = v + [10, 25, 50, 75, 100][utils.getRandomInt(0, 4)]; // Random heap on top of it
  logger.log('Calculated raise amount: ' + v);
  v = (v > this.playerMoney ? this.playerMoney : v);
  return v;
};


// Helper to make right choice
Bot.prototype.BOT_CHECK_CALL = function () {
  if (this.isCallSituation) {
    this.resultsSet.action = Bot.BOT_CALL;
  } else {
    this.resultsSet.action = Bot.BOT_CHECK;
  }
};


// Continues if hand is not bad starting hand
Bot.prototype.hasBadHoleCardsHand = function () {
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


// ---------------------------------------------------------------------------------------------------------------------

// Extend array capabilities
Bot.prototype.contains = function (array, element) {
  return this.indexOf(element) > -1;
};


Bot.prototype.indexOf = function indexOf(member, startFrom) {
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
