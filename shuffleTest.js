const poker = require("./app/poker");

console.log(JSON.stringify(
  poker.visualize(
    poker.randomize(
      poker.newSet()
    )
  )
));
