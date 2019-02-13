const Hapi = require('hapi');
const data = require('../data');
const mysql = require("./mysql");

let SCRIPT_VERSION = 4;

const server = new Hapi.Server({
    debug: {request: ['error']}
});

server.connection({port: 8082, routes: {cors: true}});

server.route({
    method: 'POST',
    path: '/',
    handler: async (request, reply) => {
        const data = JSON.parse(request.payload);
        if (!mysql.validKey(data.apiKey))
            return reply().code(401);
        reply().code(200);

        if (data.upgrades && Array.isArray(data.upgrades)) {
            for (let upgrade of data.upgrades) {
                try {
                    await mysql.insertUpgrade(upgrade.item.name, upgrade.item.level, upgrade.scroll.name, upgrade.offering, upgrade.success ? 1 : 0, data.apiKey);
                    await mysql.updateUpgradesStatistics(upgrade.item.name, upgrade.item.level, 1, upgrade.success ? 1 : 0)
                } catch (e) {
                    console.error(e)
                }
            }
        }

        if (data.compounds && Array.isArray(data.compounds)) {
            for (let compound of data.compounds) {
                try {
                    await mysql.insertCompound(compound.item.name, compound.item.level, compound.scroll.name, compound.offering, compound.success + 0, data.apiKey);
                    await mysql.updateCompoundsStatistics(compound.item.name, compound.item.level, 1, compound.success + 0);
                } catch (e) {
                    console.error(e)
                }
            }
        }

    }
});

server.route({
    method: 'GET',
    path: '/apic',
    handler: (request, reply) => {
        const data = JSON.parse(request.payload.json);
        if (!mysql.validKey(data.key)) return reply().code(401);
        if (SCRIPT_VERSION !== data.version) return reply().code(426);
        reply().code(200);
    }
});
server.route({
    method: 'POST',
    path: '/upgrade',
    handler: async (request, reply) => {
        const upgradeData = JSON.parse(request.payload);
        if (!mysql.validKey(upgradeData.apiKey))
            return reply().code(401);
        reply().code(200);
        if (upgradeData.upgrades && Array.isArray(upgradeData.upgrades)) {
            for (let upgrade of upgradeData.upgrades) {
                await mysql.insertUpgrade(upgrade.item.name, upgrade.item.level, upgrade.scroll.name, upgrade.offering, upgrade.success ? 1 : 0, upgradeData.apiKey)
                await mysql.updateUpgradesStatistics(upgrade.item.name, upgrade.item.level, 1, upgrade.success ? 1 : 0)
            }
        }
    }
});

server.route({
    method: 'POST',
    path: '/compound',
    handler: async (request, reply) => {
        const compoundData = JSON.parse(request.payload);
        if (!mysql.validKey(compoundData.apiKey))
            return reply().code(401);
        reply().code(200);

        if (compoundData.compounds && Array.isArray(compoundData.compounds)) {
            for (let compound of compoundData.compounds) {
                try {
                    await mysql.insertCompound(compound.item.name, compound.item.level, compound.scroll.name, compound.offering, compound.success + 0, compoundData.apiKey);
                    await mysql.updateCompoundsStatistics(compound.item.name, compound.item.level, 1, compound.success + 0);
                } catch (e) {
                    console.error(e)
                }
            }
        }
    }
});

module.exports.start = function () {
    server.start((err) => {
        if (err) throw err;
        console.log('Collection server running at:', server.info.uri);
    });
};
