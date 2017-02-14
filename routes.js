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
let exchangeTable = {};

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

    var show_exchange = false;

    if (!itemData) {
        return reply().code(404);
    }

    if(exchangeTable) {
      show_exchange = (Object.keys(exchangeTable).length === 0);
    }

    reply.view('item', {
        item: itemData,
        type: itemType,
        dropped: reverseDropTable.get(itemType) || [],
        upgrades: upgradeTable,
        show_exchanges: show_exchange,
        exchanges: exchangeTable,
        items_data : data.items,
        scroll_cost : scroll_cost,
        sprites
    });
};

function scroll_cost(item, level) {
    let scroll0_cost = 1000, scroll1_cost = 40000, scroll2_cost = 1600000;
    let item_cost = data.items[item].g;
    let item_grades = data.items[item].grades;
    if(level == 1) return item_cost + scroll0_cost;
    else {
        if(level >= item_grades[1]) return scroll2_cost;
        if(level >= item_grades[0]) return scroll1_cost;
        return scroll0_cost;
    }
}

const upgradesHandler = function(request, reply) {
    reply.view('upgrades', {
        upgrades: upgradeTable,
        scroll_cost : scroll_cost,
        sprites
    });
};

const exchangesHandler = function(request, reply) {
    if(Object.keys(exchangeTable).length === 0) {
        reply("No exchange data");
    }
    reply.view('exchanges', {
        exchanges: exchangeTable,
        items_data : data.items,
        sprites
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
              
                if(data.monsters[monster]) {
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

        function compare(a,b) {
            if(a.name < b.name) return -1;
            if(a.name > b.name) return 1;
            return 0;
        }
        upgradeData['Weapons'].data.sort(compare);
        upgradeData['Armor'].data.sort(compare);
        upgradeData['Accessories'].data.sort(compare);
        upgradeData['Misc'].data.sort(compare);
        upgradeTable = upgradeData;
    });
}

function updateExchangeTable() {
    collection.db.getExchangesTable()
    .then((table) => {
        exchangeTable = table;
    });
}

setInterval(updateDropTable, 1000 * 60 * 10);
setInterval(updateUpgradeTable, 1000 * 60);
setInterval(updateExchangeTable, 1000 * 60);
updateDropTable();
updateUpgradeTable();
updateExchangeTable();

exports.root = rootHandler;

exports.monsters = monstersHandler;
exports.monster = monsterHandler;

exports.items = itemsHandler;
exports.item = itemHandler;

exports.upgrades = upgradesHandler;
exports.exchanges = exchangesHandler;
