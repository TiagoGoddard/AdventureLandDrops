const fs = require('fs');
const Hapi = require('hapi');
const data = require('../data');
const db = require('./db');

const keyFile = __dirname + '/keys.json';
let keys = require(keyFile);

const server = new Hapi.Server({
    debug: { request: ['error'] }
});

server.connection({ port: 13726, routes: { cors: true }});

const itemTypeByName = {};
for (let itemType of Object.keys(data.items)) {
    let item = data.items[itemType];
    let itemName = item.name;
    itemTypeByName[itemName] = itemType;
}

server.route({
    method: 'POST',
    path: '/drop',
    handler: (request, reply) => {
        const dropData = JSON.parse(request.payload.json);

        if (!keys.includes(dropData.key)) return reply().code(403);

        dropData.items = dropData.items.map(name => itemTypeByName[name]);
        const dataValid = dropData.items.every(name => name != null);

        reply().code(200);
        if (!dataValid) return;

        db.addDrop(dropData);
    }
});

server.route({
    method: 'POST',
    path: '/upgrade',
    handler: (request, reply) => {
        const upgradeData = JSON.parse(request.payload.json);
        if (!keys.includes(upgradeData.key)) return reply().code(403);

        reply().code(200);
        db.addUpgrade(upgradeData);
    }
});

module.exports.start = function() {
    server.start((err) => {
        if (err) throw err;
        console.log('Collection server running at:', server.info.uri);
    });

    fs.watch(__dirname + '/keys.json', { persistent: false }, () => {
        keys = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));
    });
}
