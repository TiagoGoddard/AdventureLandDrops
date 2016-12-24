exports.db = require('./db');
exports.server = require('./server');

if (require.main === module) {
    exports.server.start();
}
