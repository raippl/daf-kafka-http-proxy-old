var express         = require('express'),
    app             = express(),
    bodyParser      = require('body-parser'),
    config          = require('./config'),
    log             = require('./logger.js'),
    logger          = log.logger,

    fs              = require('fs'),
    morgan          = require('morgan');

logger.info('Starting application...');

logger.info({ kafka: config.kafka }, 'Config.');

app.use(morgan('combined'));

app.use(function(req, res, next) {
    var request = {
        url: req.url,
        method: req.method
    };

    var response = res.err || {};

    logger.trace({req: request, res: response}, 'Received request.');
    next();
});

app.use(bodyParser.json({ type: config.http.jsonContentType, limit: config.http.requestEntityLimit }));

require('./controllers/topics')(app);
require('./controllers/consumers')(app);
require('./controllers/health')(app);

// catch all for unknown routes
app.get('*', function(req, res) {
    logger.warn({url: req.url}, 'unknown path sent to server');
    res.status(404).send('Unknown route');
});

// handle any errors that manage to slip through the cracks
//process.on('uncaughtException', function(err) {
//    logger.error({err : err}, 'unprocessed and unhandled exception!');
//});

app.use(function errorHandler(err, req, res, next) {
    logger.error({method: req.method, url: req.url}, 'error on request ');
    if (!res.headersSent) {
        res.status(500).json({ 'error_code': 500, 'message': err });
        return next(err);
    }
});

// setup the sockets
var server = require('http').createServer(app);
require('./sockets/consumer')(server);
require('./sockets/producer')(server);

server.listen(config.port, function () {
    logger.info('Application listening on port ' + config.port);
});
