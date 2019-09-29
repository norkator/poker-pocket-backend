// Require libraries
let seedRandom = require('./seedrandom');

const POKER_COLORS = {
  4: '♠', 	// spade
  3: '♥', 	// heart
  2: '♣', 	// club
  1: '♦' 		// diamond
};

const POKER_NUMBERS = {
  14: 'A',
  13: 'K',
  12: 'Q',
  11: 'J',
  10: '10',
  9: '9',
  8: '8',
  7: '7',
  6: '6',
  5: '5',
  4: '4',
  3: '3',
  2: '2',
  0: '?'
};

const POKER_NUMBER_RANK = {
  'A': 14,
  'K': 13,
  'Q': 12,
  'J': 11,
  '10': 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
  '?': 0,
  '': 0
};

const POKER_COLOR_RANK = {
  'S': 4,
  'H': 3,
  'C': 2,
  'D': 1,
  '': 0
};

let POKER_CARDS = {};
for (let color = 1; color <= 4; color++) {
  for (let number = 2; number <= 14; number++) {
    let card = (color << 4) | number;
    POKER_CARDS[card] = POKER_NUMBERS[number] + '' + POKER_COLORS[color];
  }
}

POKER_CARDS[0] = '?';

exports = module.exports = Poker;


/**
 * @return {object}
 */
function Poker(str) {
  if (typeof str === 'string') {
    let c = POKER_COLOR_RANK[str.charAt(0)];
    let n = POKER_NUMBER_RANK[str.substring(1)];
    if (c && n) {
      return (c << 4) | n;
    } else {
      return 0;
    }
  } else if (typeof str === 'object') {
    let cards = [];
    for (let i = 0; i < str.length; i++) {
      cards.push(Poker(str[i]));
    }
    return cards;
  } else {
    return 0;
  }
}

Poker.SPADE = 4;
Poker.HEART = 3;
Poker.CLUB = 2;
Poker.DIAMOND = 1;

Poker.COLORS = POKER_COLORS;
Poker.NUMBERS = POKER_NUMBERS;
Poker.CARDS = POKER_CARDS;
Poker.NUMBER_RANK = POKER_NUMBER_RANK;


Poker.visualize = function (cards) {
  if (typeof cards === 'number') return POKER_CARDS[cards];

  let v_cards = [];
  for (let i = 0, len = cards.length; i < len; i++) {
    v_cards.push(POKER_CARDS[cards[i]]);
  }
  return v_cards;
};


// noinspection JSUnusedLocalSymbols
Poker.newSet = function (options) {
  let no_color = [];
  let no_number = [];
  let no_card = [];
  let cards = [];
  for (let color = 1; color <= 4; color++) {
    if (no_color.indexOf(color) >= 0) continue;
    for (let number = 2; number <= 14; number++) {
      if (no_number.indexOf(number) >= 0) continue;
      let card = (color << 4) | number;
      if (no_card.indexOf(card) >= 0) continue;
      cards.push(card);
    }
  }
  return cards;
};


Poker.clone = function (cards) {
  let cloned = [];
  for (let i = 0; i < cards.length; i++) {
    cloned[i] = cards[i];
  }
  return cloned;
};


Poker.draw = function (cards, n) {
  let len = cards.length;
  if (len < n) return [];

  let subset = [];
  while (n-- > 0) {
    let i = Math.floor(Math.random() * len);
    subset.push(cards[i]);
    cards.splice(i, 1); // NOTICE: splice will return an array
    len--;
  }
  return subset;
};


Poker.drawRandom = function (cards, n) {
  let rng = seedRandom();
  let len = cards.length;
  if (len < n) return [];

  let subset = [];
  while (n-- > 0) {
    let i = Math.floor(rng(len) * len);
    // console.log(i + ' seed was ' + len);
    subset.push(cards[i]);
    cards.splice(i, 1); // NOTICE: splice will return an array
    len--;
  }
  return subset;
};


Poker.randomize = function (cards) {
  let randomized = this.drawRandom(cards, cards.length);
  while (randomized.length > 0) {
    cards.push(randomized.shift());
  }
  return cards;
};


Poker.compareColorNumber = function (a, b) {
  if (a === b) return 0;
  else {
    let aColor = a >> 4, aNumber = a & 0x0f;
    let bColor = b >> 4, bNumber = b & 0x0f;
    if (aColor === bColor) return aNumber - bNumber;
    else return aColor - bColor;
  }
};


Poker.compareNumberColor = function (a, b) {
  if (a === b) return 0;
  else {
    let aColor = a >> 4, aNumber = a & 0x0f;
    let bColor = b >> 4, bNumber = b & 0x0f;
    if (aNumber === bNumber) return aColor - bColor;
    else return aNumber - bNumber;
  }
};


Poker.compare = function (a, b) {
  return (a & 0xff) - (b & 0xff);
};


Poker.sort = Poker.sortByColor = function (cards) {
  return cards.sort(Poker.compareColorNumber).reverse();
};


Poker.sortByNumber = function (cards) {
  return cards.sort(Poker.compareNumberColor).reverse();
};


Poker.merge = function (a, b) {
  return a.concat(b);
};


Poker.print = function (cards) {
  let str = cards.join(',');
  console.log(str);
};


Poker.view = function (cards) {
  let str = Poker.visualize(cards).join(',');
  console.log(str);
};
