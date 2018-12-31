exports.db = require('./mysql');
exports.server = require('./server');

if (require.main === module) {
    exports.server.start();
}
