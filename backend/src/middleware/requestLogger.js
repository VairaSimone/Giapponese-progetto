'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');


const morganFormat =
  ':method :url :status :res[content-length] - :response-time ms - :remote-addr';

const requestLogger = morgan(morganFormat, {
  stream: {

    write: (message) => logger.http(message.trim()),
  },

  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = requestLogger;
