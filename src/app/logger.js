/**
 * Logger util for helping disable normal logging easier way
 * and to give log's nicer look
 */
let config = require('../../config');

// Logging color types
exports.LOG_DEFAULT = 0; // No coloring
exports.LOG_GREEN = 1;
exports.LOG_YELLOW = 2;
exports.LOG_CYAN = 3;
exports.LOG_UNDERSCORE = 4;
exports.LOG_RED = 5;


// Log function
exports.log = function (logStr, type = this.LOG_DEFAULT) {
  if (config.logging) {
    switch (type) {
      case this.LOG_DEFAULT:
        console.log(logStr);
        break;
      case this.LOG_GREEN:
        console.log('\x1b[32m%s\x1b[0m', logStr);
        break;
      case this.LOG_YELLOW:
        console.log('\x1b[33m%s\x1b[0m', logStr);
        break;
      case this.LOG_CYAN:
        console.log('\x1b[36m%s\x1b[0m', logStr);
        break;
      case this.LOG_UNDERSCORE:
        console.log('\x1b[4m%s\x1b[0m', logStr);
        break;
      case this.LOG_RED:
        console.log('\x1b[31m%s\x1b[0m', logStr);
        break;
    }
  }
};
