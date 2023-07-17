const fs = require('fs');
const path = require('path');

module.exports = {
  HANDTYPES: [
    "invalid hand",
    "high card",
    "one pair",
    "two pairs",
    "three of a kind",
    "straight",
    "flush",
    "full house",
    "four of a kind",
    "straight flush"
  ],

  CARDS: {
    "2♣": 1,
    "2♦": 2,
    "2♥": 3,
    "2♠": 4,
    "3♣": 5,
    "3♦": 6,
    "3♥": 7,
    "3♠": 8,
    "4♣": 9,
    "4♦": 10,
    "4♥": 11,
    "4♠": 12,
    "5♣": 13,
    "5♦": 14,
    "5♥": 15,
    "5♠": 16,
    "6♣": 17,
    "6♦": 18,
    "6♥": 19,
    "6♠": 20,
    "7♣": 21,
    "7♦": 22,
    "7♥": 23,
    "7♠": 24,
    "8♣": 25,
    "8♦": 26,
    "8♥": 27,
    "8♠": 28,
    "9♣": 29,
    "9♦": 30,
    "9♥": 31,
    "9♠": 32,
    "10♣": 33,
    "10♦": 34,
    "10♥": 35,
    "10♠": 36,
    "J♣": 37,
    "J♦": 38,
    "J♥": 39,
    "J♠": 40,
    "Q♣": 41,
    "Q♦": 42,
    "Q♥": 43,
    "Q♠": 44,
    "K♣": 45,
    "K♦": 46,
    "K♥": 47,
    "K♠": 48,
    "A♣": 49,
    "A♦": 50,
    "A♥": 51,
    "A♠": 52
  },

  evalHand: function (cards) {
    if (!this.ranks) {
      throw new Error("HandRanks.dat not loaded");
    }

    if (cards.length !== 7 && cards.length !== 6 && cards.length !== 5 && cards.length !== 3) {
      throw new Error("Hand must be 3, 5, 6, or 7cards");
    }

    //if passing in string formatted hand, convert first
    if (typeof cards[0] === "string") {
      cards = cards.map(function (card) {
        return this.CARDS[card];
      }.bind(this));
    }

    return this.eval(cards);
  },

  eval: function (cards) {
    let p = 53;
    for (let i = 0; i < cards.length; i++) {
      p = this.evalCard(p + cards[i]);
    }

    if (cards.length === 5 || cards.length === 6) {
      p = this.evalCard(p)
    }

    return {
      handType: p >> 12,
      handRank: p & 0x00000fff,
      value: p,
      handName: this.HANDTYPES[p >> 12]
    }
  },

  evalCard: function (card) {
    return this.ranks.readUInt32LE(card * 4);
  }
};

let ranksFile = path.join(__dirname, '../app/HandRanks.dat');
module.exports.ranks = fs.readFileSync(ranksFile);
