const data = require('./data');
const collection = require('./collection');
const sprites = require('./sprites');

let monsters = [];
let items = [];

for (let monsterType in data.monsters) {
    monsters.push({
        type: monsterType,
        name: data.monsters[monsterType].name
    });
}

for (let itemType in data.items) {
    items.push({
        type: itemType,
        name: data.items[itemType].name
    });
}

monsters.sort((a, b) => a.name.localeCompare(b.name));
items.sort((a, b) => a.name.localeCompare(b.name));

const rootHandler = function (request, reply) {
    reply.view('index', {
        monsters,
        items,
        sprites
    });
};

const monstersHandler = function (request, reply) {
    reply.view('monsters', {
        monsters,
        sprites
    });
};

const itemsHandler = function (request, reply) {
    reply.view('items', {
        items,
        sprites
    });
};

let dropTable = new Map();
let monsterGoldTable = new Map();
let reverseDropTable = new Map();
let contribTable = new Map();
let upgradeTable = {};

const monsterHandler = function (request, reply) {
    const monsterType = request.params.monster;
    const monsterData = data.monsters[monsterType];

    if (!monsterData) {
        return reply().code(404);
    }

    let mgt = monsterGoldTable.get(monsterType);

    reply.view('monster', {
        monster: monsterData,
        type: monsterType,
        drops: dropTable.get(monsterType) || [],
        avggold : mgt ? mgt.avggold : 0,
        kills : mgt ? mgt.kills : 0,
        contribs : contribTable.get(monsterType) || [],
        sprites
    });
};

const itemHandler = function (request, reply) {
    const itemType = request.params.item;
    const itemData = data.items[itemType];

    if (!itemData) {
        return reply().code(404);
    }

    collection.db.getUpgradeInfo(itemType)
    .then((table) => {
        reply.view('item', {
            item: itemData,
            type: itemType,
            dropped: reverseDropTable.get(itemType) || [],
            upgrades: table,
            sprites
        });
    });
};

function item_level_cost(item, level) {
    let scroll0_cost = 1000, scroll1_cost = 40000, scroll2_cost = 1600000;
    let item_cost = data.items[item].g ? data.items[item].g : 500000;
    let item_grades = data.items[item].grades;
    let cost_sc0 = (level > item_grades[0] ? item_grades[0] : level) * scroll0_cost;
    let cost_sc1 = (level > item_grades[0] ? level - item_grades[0] : 0) * scroll1_cost;
    let cost_sc2 = (level > item_grades[1] ? 1 : 0) * scroll2_cost;
    return item_cost + cost_sc0 + cost_sc1 + cost_sc2;
}

const upgradesHandler = function(request, reply) {
    reply.view('upgrades', {
        upgrades: upgradeTable,
        item_level_cost : item_level_cost,
        sprites
    });
};

const exchangesHandler = function(request, reply) {

    collection.db.getExchangesTable()
    .then((table) => {
        if(Object.keys(table).length == 0) {
            reply("No exchange data");
        }
        reply.view('exchanges', {
            exchanges: table,
            items_data : data.items,
            sprites
        });
    });
};

function updateDropTable() {
    collection.db.getDropTable().then((table) => {
        for (let drops of table.values()) {
            for (let drop of drops) {
                drop.name = data.items[drop.item].name;
                drop.mapName = data.maps[drop.map].name;
            }
        }

        dropTable = table;

        reverseDropTable = new Map();
        for (let [monster, drops] of table.entries()) {
            for (let drop of drops) {
                if (!reverseDropTable.has(drop.item)) {
                    reverseDropTable.set(drop.item, []);
                }

                reverseDropTable.get(drop.item).push({
                    monster: monster,
                    name: data.monsters[monster].name,
                    map: drop.map,
                    mapName: drop.mapName,
                    rate: drop.rate,
                    drops: drop.drops,
                    kills: drop.kills
                });
            }
        }
    });

    collection.db.getGoldTable().then((table) => {
        monsterGoldTable = table;
    });

    collection.db.getContribTable().then((table) => {
        contribTable = table;
    });
}

function updateUpgradeTable() {
    collection.db.getUpgradeAndCompoundsTable()
    .then((table) => {

        let upgradeData = {
            'Weapons' : {
                types : ['weapon', 'quiver', 'shield'],
                max_level : 10,
                data : []
            },
            'Armor' : {
                types : ['helmet', 'chest', 'pants', 'gloves', 'shoes', 'cape'],
                max_level : 10,
                data : []
            },
            'Accessories' : {
                types : ['amulet', 'ring', 'earring', 'tome'],
                max_level : 5,
                data : []
            },
            'Misc' : {
                types : [],
                max_level : 10,
                data : []
            },
        };

        for(let key in table) {
            let upgrade_info = table[key];
            let item = data.items[upgrade_info.name];

            let group_type = 'Misc';
            for(let group in upgradeData) {
                if(upgradeData[group].types.indexOf(item.type) > -1)
                    group_type = group;
            }

            let new_info = {
                name : item.name,
                item : upgrade_info.name,
                results : []
            };

            for(let level in upgrade_info.results) {
                new_info.results[level] = upgrade_info.results[level];
            }
            upgradeData[group_type].data.push(new_info);
        }

        upgradeTable = upgradeData;
    });
}

setInterval(updateDropTable, 1000 * 60 * 10);
setInterval(updateUpgradeTable, 1000 * 60);
updateDropTable();
updateUpgradeTable();

exports.root = rootHandler;

exports.monsters = monstersHandler;
exports.monster = monsterHandler;

exports.items = itemsHandler;
exports.item = itemHandler;

exports.upgrades = upgradesHandler;
exports.exchanges = exchangesHandler;
