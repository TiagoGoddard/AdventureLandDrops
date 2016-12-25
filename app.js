const Hapi = require('hapi');
const Vision = require('vision');
const Inert = require('inert');

const routes = require('./routes');
const collection = require('./collection');

const server = new Hapi.Server({
    debug: { request: ['error'] }
});

server.connection({ port: 8081 });

const defaultContext = {
    formatNumber(number, precision = 0) {
        if(number){
            return number.toLocaleString('en-US', { maximumFractionDigits: precision });
        } else {
            return 0;
        }
    }
};

server.register(Vision, (err) => {
    server.views({
        engines: { pug: require('pug') },
        context: defaultContext,
        path: __dirname + '/views',
        compileOptions: {
            pretty: true
        },
        isCached: process.env.NODE_ENV == 'production',
    });

    server.route({ method: 'GET', path: '/', handler: routes.root });

    server.route({ method: 'GET', path: '/monsters', handler: routes.monsters });
    server.route({ method: 'GET', path: '/monsters/{monster}', handler: routes.monster });

    server.route({ method: 'GET', path: '/items', handler: routes.items });
    server.route({ method: 'GET', path: '/items/{item}', handler: routes.item });

    server.route({
        method: 'GET',
        path: '/script',
        handler: {
            file: "script.js"
        }
    });

    server.route({
        method: 'GET',
        path: '/upgradescript',
        handler: {
            file: "upgrade.js"
        }
    });
});

server.register(Inert, (err) => {
    server.route({
        method: 'GET',
        path: '/static/{param*}',
        handler: {
            directory: {
                path: 'static'
            }
        }
    });
});

server.start((err) => {
    if (err) throw err;
    console.log('Web server running at:', server.info.uri);
    collection.server.start();
});
