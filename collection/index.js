exports.db = require('./sqlite');
exports.server = require('./server');

if (require.main === module) {
    exports.server.start();
}
