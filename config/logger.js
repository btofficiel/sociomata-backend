const { createLogger, format, transports } = require('winston');
const LEVEL = Symbol.for('level');

const { combine, colorize } = format;

const filterOnly = (level) => {
  return format(function (info) {
    if (info[LEVEL] === level) {
      return info;
    }
  })();
};

const getColoredStatuCode = code => {
  switch(code){
    case 200:
      return `\x1b[32m${code}`;
      break;
    case 401:
      return `\x1b[33m${code}`;
      break;
    case 301:
    case 302:
      return `\x1b[36m${code}`;
      break;
    case 404:
      return `\x1b[34m${code}`;
      break;
    default:
      return `\x1b[31m${code}`;
      break;
  }
};

    
const myFormat = format.printf(({ 
  level, 
  message, 
  error, 
  userid="Signed Out", 
  path,
  method="NA",
  statusCode,
  timestamp
}) => {
  if(error) {
    return `${level}: userId: ${userid} | ${message} | ${error}`;
  }
  else {
    return `\x1b[1m${getColoredStatuCode(statusCode)}\x1b[0m ${method.toUpperCase()} ${path} ${level}: userId: ${userid}` 
  }
});


let tport = [
      new transports.File({ 
        filename: `${process.env.LOG_DIRECTORY}/error.log`, 
        format: format.json(),
        level: 'error' 
      }),
      new transports.File({ 
        filename: `${process.env.LOG_DIRECTORY}/request.log`, 
        level: 'info',
        format: filterOnly('info')
      })
];

if(process.env.ENV === 'dev') {
  const consoleConfig = new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        myFormat
      )
  });
  tport.push(consoleConfig);
}

const logger = createLogger({
  transports: tport
});

module.exports = logger;
