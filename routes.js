var data = require('./data');
const dataFetcher = require("./data/DataFetcher");
const sprites = require('./sprites');
const sortOrder = require('./sortOrder');
const mysql = require('./collection/mysql.js');

let monsters = [];
let npcs = [];
let items = [];

let quest_items = [];
let e_items = [];
var itemsData;

function updateData(){
    data = dataFetcher.getData();
    monsters = [];
    npcs = [];
    items = [];
    quest_items = [];
    e_items = [];
    for (let monsterType in data.monsters) {
        monsters.push({
            type: monsterType,
            name: data.monsters[monsterType].name
        });
    }
    for (let npcType in data.npcs) {
        npcs.push({
            type: npcType,
            name: data.npcs[npcType].name,
            skin: data.npcs[npcType].skin,
            role: data.npcs[npcType].role
        });
    }
    itemsData = {
        'Weapons': {
            types: ['weapon', 'quiver', 'shield'],
            data: []
        },
        'Armor': {
            types: ['helmet', 'chest', 'pants', 'gloves', 'shoes', 'cape'],
            data: []
        },
        'Accessories': {
            types: ['amulet', 'ring', 'earring', 'tome', 'belt', 'source'],
            data: []
        },
        'Misc': {
            types: [],
            data: []
        },
    };
    for (let itemType in data.items) {
        let itemU = {
            type: itemType,
            name: data.items[itemType].name,
            item: itemType.name
        }
        let item = data.items[itemType];

        let group_type = 'Misc';
        if (item) {
            for (let group in itemsData) {
                if (itemsData[group].types.indexOf(item.type) > -1) {
                    group_type = group;
                }
            }
            if (item.quest) {
                quest_items.push(item);
            }
            if (item.e) {
                e_items.push(item);
            }
        }
        let new_info = {
            type: itemType,
            name: item.name,
            item: itemType.name
        };
        itemsData[group_type].data.push(new_info);
        items.push(itemU);
    }

    for (let group in itemsData) {
        itemsData[group].data.sort((a, b) => sortOrder[b.type] - sortOrder[a.type]);
    }

    monsters.sort((a, b) => a.name.localeCompare(b.name));
    items.sort((a, b) => sortOrder[b.type] - sortOrder[a.type]);

}

var currentVersion = dataFetcher.dataVersion();
updateData();
setInterval(function(){
   if(currentVersion < dataFetcher.dataVersion()){
        updateData();
        currentVersion = dataFetcher.dataVersion();
    }
},10000);

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

const npcsHandler = function (request, reply) {
    reply.view('npcs', {
        npcs,
        sprites
    });
};

const itemsHandler = function (request, reply) {
    reply.view('items', {
        items: itemsData,
        sprites
    });
};


const monsterHandler = async function (request, reply) {
    const monsterType = request.params.monster;
    const monsterLevel = request.params.level ? request.params.level : 1;
    const monsterData = data.monsters[monsterType];

    if (!monsterData) {
        return reply().code(404);
    }
    try {
        var killTable = await mysql.getKillsByMonster(monsterType, monsterLevel);
        var drops = await mysql.getDropsByMonster(monsterType);
    } catch (e) {
        console.error(e);
    }

    //Sue me
    var kills = {};
    var total_kills = 0;
    var total_gold = 0;
    for (let key in killTable) {
        total_kills += killTable[key].kills;
        total_gold += killTable[key].total_gold;
        if (kills[killTable[key].map]) {
            kills[killTable[key].map] += killTable[key].kills;
        } else {
            kills[killTable[key].map] = killTable[key].kills;
        }
    }
    var avgGold = total_gold / total_kills;
    for (let key in drops) {
        drops[key].rate = drops[key].seen * 100 / (kills[drops[key].map]);
        drops[key].kills = kills[drops[key].map];
    }
    reply.view('monster', {
        monster: monsterData,
        type: monsterType,
        drops: drops || [],
        avggold: avgGold ? avgGold : 0,
        kills: total_kills ? total_kills : 0,
        contribs: killTable || [],
        sprites
    });
};

const npcHandler = function (request, reply) {
    const npcType = request.params.npc;
    const npcData = data.npcs[npcType];

    if (!npcData) {
        return reply().code(404);
    }

    reply.view('npc', {
        npc: npcData,
        type: npcType,
        items: data.items,
        quest_items: quest_items,
        e_items: e_items,
        sprites
    });
};

const itemHandler = async function (request, reply) {
    const itemName = request.params.item;
    const itemData = data.items[itemName];

    var hide_exchange = true;
    var hide_upgrades = true;

    if (!itemData) {
        return reply().code(404);
    }

    try {
        var exchanges = await mysql.getExchangesByItemName(itemName);
        var upgrades = [];
        if (itemData.compound)
            upgrades = await mysql.getCompoundsByItemName(itemName);
        else if (itemData.upgrade)
            upgrades = await mysql.getUpgradesByItemName(itemName);
        var reverseDrop = await mysql.getReverseDrop(itemName);
    } catch (e) {
        console.error(e);
    }
    if (exchanges) {
        hide_exchange = (exchanges.length === 0);
    }
    if (upgrades) {
        hide_upgrades = (upgrades.length === 0);
    }
    var total = 0;

    //Sue me
    for (let exchange of exchanges) {
        total += exchange.seen;
    }
    for (let exchange of exchanges) {
        exchange.total = total;
    }

    reply.view('item', {
        item: itemData,
        type: itemName,
        show_dropped: (reverseDrop.length > 0),
        dropped: reverseDrop,
        show_upgrades: !hide_upgrades,
        upgrades: upgrades,
        show_exchanges: !hide_exchange,
        exchanges: exchanges,
        npcs: npcs,
        show_price: false,
        price_data: [],
        npcs_data: data.npcs,
        items_data: data.items,
        scroll_cost: scroll_cost,
        sprites
    });
};


function scroll_cost(item, level) {
    let scroll0_cost = 1000, scroll1_cost = 40000, scroll2_cost = 1600000;
    let item_cost = data.items[item].g;
    let item_grades = data.items[item].grades;
    if (level == 1) return item_cost + scroll0_cost;
    else {
        if (level >= item_grades[1]) return scroll2_cost;
        if (level >= item_grades[0]) return scroll1_cost;
        return scroll0_cost;
    }
}

exports.root = rootHandler;

exports.monsters = monstersHandler;
exports.monster = monsterHandler;

exports.npcs = npcsHandler;
exports.npc = npcHandler;

exports.items = itemsHandler;
exports.item = itemHandler;
