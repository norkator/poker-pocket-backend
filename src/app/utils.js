// Some utilities functions for all classes
const fs = require('fs');
const randomNamesList = fs.readFileSync('./src/assets/names.txt').toString().split('\n');


/**
 * Get random name for bot from assets names list
 * @returns {string}
 */
exports.getRandomBotName = function (currentRoomBotNames) {
  let randomName = randomNamesList[this.getRandomInt(0, randomNamesList.length)];
  for (let i = 0; i < randomNamesList.length; i++) {
    if (!this.contains(currentRoomBotNames, randomName)) {
      return randomName;
    }
  }
  return 'Bot';
};


/**
 * Random integer for any use
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
exports.getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


// Returns array of string cards
exports.asciiToStringCardsArray = function (asciiCardsArray) {
  let stringCardsArray = [];
  for (let i = 0; i < asciiCardsArray.length; i++) {
    stringCardsArray.push(this.asciiCardToStringCard(asciiCardsArray[i]));
  }
  return stringCardsArray;
};

// For example convert A♦ to Ad
exports.asciiCardToStringCard = function (ascii) {
  switch (ascii) {
    case '2♣':
      return '2c';
    case '3♣':
      return '3c';
    case '4♣':
      return '4c';
    case '5♣':
      return '5c';
    case '6♣':
      return '6c';
    case '7♣':
      return '7c';
    case '8♣':
      return '8c';
    case '9♣':
      return '9c';
    case '10♣':
      return 'Tc';
    case 'J♣':
      return 'Jc';
    case 'Q♣':
      return 'Qc';
    case 'K♣':
      return 'Kc';
    case 'A♣':
      return 'Ac';

    case '2♦':
      return '2d';
    case '3♦':
      return '3d';
    case '4♦':
      return '4d';
    case '5♦':
      return '5d';
    case '6♦':
      return '6d';
    case '7♦':
      return '7d';
    case '8♦':
      return '8d';
    case '9♦':
      return '9d';
    case '10♦':
      return 'Td';
    case 'J♦':
      return 'Jd';
    case 'Q♦':
      return 'Qd';
    case 'K♦':
      return 'Kd';
    case 'A♦':
      return 'Ad';

    case '2♥':
      return '2h';
    case '3♥':
      return '3h';
    case '4♥':
      return '4h';
    case '5♥':
      return '5h';
    case '6♥':
      return '6h';
    case '7♥':
      return '7h';
    case '8♥':
      return '8h';
    case '9♥':
      return '9h';
    case '10♥':
      return 'Th';
    case 'J♥':
      return 'Jh';
    case 'Q♥':
      return 'Qh';
    case 'K♥':
      return 'Kh';
    case 'A♥':
      return 'Ah';

    case '2♠':
      return '2s';
    case '3♠':
      return '3s';
    case '4♠':
      return '4s';
    case '5♠':
      return '5s';
    case '6♠':
      return '6s';
    case '7♠':
      return '7s';
    case '8♠':
      return '8s';
    case '9♠':
      return '9s';
    case '10♠':
      return 'Ts';
    case 'J♠':
      return 'Js';
    case 'Q♠':
      return 'Qs';
    case 'K♠':
      return 'Ks';
    case 'A♠':
      return 'As';
  }
};


// Returns array of ascii cards
exports.stringToAsciiCardsArray = function (stringCardsArray) {
  let asciiCardsArray = [];
  for (let i = 0; i < stringCardsArray.length; i++) {
    asciiCardsArray.push(this.stringCardToAsciiCard(stringCardsArray[i].value + stringCardsArray[i].suit));
  }
  return asciiCardsArray;
};

// For example convert Ad to A♦
exports.stringCardToAsciiCard = function (ascii) {
  switch (ascii) {
    case '2c':
      return '2♣';
    case '3c':
      return '3♣';
    case '4c':
      return '4♣';
    case '5c':
      return '5♣';
    case '6c':
      return '6♣';
    case '7c':
      return '7♣';
    case '8c':
      return '8♣';
    case '9c':
      return '9♣';
    case 'Tc':
      return '10♣';
    case 'Jc':
      return 'J♣';
    case 'Qc':
      return 'Q♣';
    case 'Kc':
      return 'K♣';
    case 'Ac':
      return 'A♣';

    case '2d':
      return '2♦';
    case '3d':
      return '3♦';
    case '4d':
      return '4♦';
    case '5d':
      return '5♦';
    case '6d':
      return '6♦';
    case '7d':
      return '7♦';
    case '8d':
      return '8♦';
    case '9d':
      return '9♦';
    case 'Td':
      return '10♦';
    case 'Jd':
      return 'J♦';
    case 'Qd':
      return 'Q♦';
    case 'Kd':
      return 'K♦';
    case 'Ad':
      return 'A♦';

    case '2h':
      return '2♥';
    case '3h':
      return '3♥';
    case '4h':
      return '4♥';
    case '5h':
      return '5♥';
    case '6h':
      return '6♥';
    case '7h':
      return '7♥';
    case '8h':
      return '8♥';
    case '9h':
      return '9♥';
    case 'Th':
      return '10♥';
    case 'Jh':
      return 'J♥';
    case 'Qh':
      return 'Q♥';
    case 'Kh':
      return 'K♥';
    case 'Ah':
      return 'A♥';

    case '2s':
      return '2♠';
    case '3s':
      return '3♠';
    case '4s':
      return '4♠';
    case '5s':
      return '5♠';
    case '6s':
      return '6♠';
    case '7s':
      return '7♠';
    case '8s':
      return '8♠';
    case '9s':
      return '9♠';
    case 'Ts':
      return '10♠';
    case 'Js':
      return 'J♠';
    case 'Qs':
      return 'Q♠';
    case 'Ks':
      return 'K♠';
    case 'As':
      return 'A♠';
  }
};


// Appends ranks medal icons to the ranks array
exports.fetchRanksMedals = function (ranksJson) {
  for (let i = 0; i < ranksJson.length; i++) {
    ranksJson[i].icon = this.getMedalIconAndNextMedalXP(ranksJson[i].xp).image;
  }
  return ranksJson;
};


// Return medal icon name for xp level (easier to change levels here)
// Changes will affect both web and android front ends immediately
exports.getMedalIconAndNextMedalXP = function (currentXP) {
  let result = {image: 'shaded_medal_blank', nextMedalXP: 1000, havingMedals: []}; // Default blank
  if (currentXP >= 1000) { // 1k
    result.image = 'shaded_medal_one';
    result.nextMedalXP = 5000;
    result.havingMedals.push({image: 'shaded_medal_one', title: '1k'});
  }
  if (currentXP >= 5000) { // 5k
    result.image = 'shaded_medal_two';
    result.nextMedalXP = 10 * 1000;
    result.havingMedals.push({image: 'shaded_medal_two', title: '5k'});
  }
  if (currentXP >= (10 * 1000)) { // 10k
    result.image = 'shaded_medal_three';
    result.nextMedalXP = 17 * 1000;
    result.havingMedals.push({image: 'shaded_medal_three', title: '10k'});
  }
  if (currentXP >= (17 * 1000)) { // 17k
    result.image = 'shaded_medal_four';
    result.nextMedalXP = 30 * 1000;
    result.havingMedals.push({image: 'shaded_medal_four', title: '17k'});
  }
  if (currentXP >= (30 * 1000)) { // 30k
    result.image = 'shaded_medal_five';
    result.nextMedalXP = 45 * 1000;
    result.havingMedals.push({image: 'shaded_medal_five', title: '30k'});
  }
  if (currentXP >= (45 * 1000)) { // 45k
    result.image = 'shaded_medal_six';
    result.nextMedalXP = 70 * 1000;
    result.havingMedals.push({image: 'shaded_medal_six', title: '45k'});
  }
  if (currentXP >= (70 * 1000)) { // 70k
    result.image = 'shaded_medal_seven';
    result.nextMedalXP = 100 * 1000;
    result.havingMedals.push({image: 'shaded_medal_seven', title: '70k'});
  }
  if (currentXP >= (100 * 1000)) { // 100k
    result.image = 'shaded_medal_eight';
    result.nextMedalXP = 150 * 1000;
    result.havingMedals.push({image: 'shaded_medal_eight', title: '100k'});
  }
  if (currentXP >= (150 * 1000)) { // 150k
    result.image = 'shaded_medal_nine';
    result.nextMedalXP = 200 * 1000;
    result.havingMedals.push({image: 'shaded_medal_nine', title: '150k'});
  }
  return result;
};


// ---------------------------------------------------------------------------------------------------------------------

// Extend array capabilities
// noinspection JSUnusedGlobalSymbols
exports.contains = function (array, element) {
  return this.indexOf(element) > -1;
};


exports.indexOf = function indexOf(member, startFrom) {
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
