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

    reply.view('item', {
        item: itemData,
        type: itemType,
        dropped: reverseDropTable.get(itemType) || [],
        sprites
    });
};

const upgradesHandler = function(request, reply) {
    collection.db.getUpgradeAndCompoundsTable()
    .then((table) => {

        let group_types = ['Weapons','Armor','Accessories', 'Misc'];
        let slot_grouping = {
            weapon: 'Weapons',
            quiver: 'Weapons',
            shield: 'Weapons',

            helmet: 'Armor',
            chest : 'Armor',
            pants : 'Armor',
            gloves: 'Armor',
            shoes : 'Armor',
            cape:   'Armor',

            amulet: 'Accessories',
            ring :  'Accessories',
            earring:'Accessories',
            tome :  'Accessories'
        };
        let misc_group = 'Misc';

        let upgradeData = {
            'Weapons' : { max_level : 10, data : [] },
            'Armor' : { max_level : 10, data : [] },
            'Accessories' : { max_level : 5, data : [] },
            'Misc' : { max_level : 10, data : [] },
        };

        for(let key in table) {
            let upgrade_info = table[key];
            let item = data.items[upgrade_info.name];
            let group_type = slot_grouping[item.type] ? slot_grouping[item.type] : misc_group;

            let new_info = {
                name : item.name,
                group : group_type,
                results : []};

            for(let level in upgrade_info.results) {
                new_info.results[level] = upgrade_info.results[level];
            }
            upgradeData[group_type].data.push(new_info);
        }
        reply.view('upgrades', {
            upgrades: upgradeData,
            group_types: group_types
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

setInterval(updateDropTable, 1000 * 60 * 10);
updateDropTable();

exports.root = rootHandler;

exports.monsters = monstersHandler;
exports.monster = monsterHandler;

exports.items = itemsHandler;
exports.item = itemHandler;

exports.upgrades = upgradesHandler;
