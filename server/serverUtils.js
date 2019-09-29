const fs = require('fs');
const config = require('../config');

/* its a change */

/**
 * Get web socket server options
 * @returns {{secure: boolean, key: null, cert: null, ca: null}}
 * @constructor
 */
exports.GetCertOptions = function () {
  if (config.isDev) {
    return {
      secure: false,
    };
  } else {
    return {
      secure: true,
      key: fs.readFileSync('/etc/letsencrypt/live/pokerpocket.nitramite.com/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/pokerpocket.nitramite.com/cert.pem'),
      ca: fs.readFileSync('/etc/letsencrypt/live/pokerpocket.nitramite.com/chain.pem')
    };
  }
};
