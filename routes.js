const data = require('./data');
const sprites = require('./sprites');
const sortOrder = require('./sortOrder');
const child_process = require('child_process');

let monsters = [];
let npcs = [];
let items = [];

let quest_items = [];
let e_items = [];

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

let itemsData = {
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

var dropTable = new Map();
var monsterGoldTable = new Map();
var reverseDropTable = new Map();
var priceTable = new Map();
var contribTable = new Map();
var upgradeTable = {};
var exchangeTable = {};
var marketTable = {};

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
        avggold: mgt ? mgt.avggold : 0,
        kills: mgt ? mgt.kills : 0,
        contribs: contribTable.get(monsterType) || [],
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

const itemHandler = function (request, reply) {
    const itemType = request.params.item;
    const itemData = data.items[itemType];

    var hide_exchange = true;
    var hide_upgrades = true;

    if (!itemData) {
        return reply().code(404);
    }

    if (exchangeTable) {
        hide_exchange = (Object.keys(exchangeTable).length === 0);
    }
    if (upgradeTable) {
        hide_upgrades = (Object.keys(upgradeTable).length === 0);
    }

    reply.view('item', {
        item: itemData,
        type: itemType,
        show_dropped: true,
        dropped: reverseDropTable.get(itemType) || [],
        show_upgrades: !hide_upgrades,
        upgrades: upgradeTable,
        show_exchanges: !hide_exchange,
        exchanges: exchangeTable,
        npcs: npcs,
        show_price: false,
        price_data: [],
        npcs_data: data.npcs,
        items_data: data.items,
        scroll_cost: scroll_cost,
        sprites
    });
};

const priceHandler = function (request, reply) {
    const itemType = request.params.item;
    const itemData = data.items[itemType];

    if (!itemData) {
        return reply().code(404);
    }

    reply.view('price', {
        item: itemData,
        type: itemType,
        show_dropped: false,
        dropped: [],
        show_upgrades: false,
        upgrades: [],
        show_exchanges: false,
        exchanges: [],
        show_price: true,
        price_data: priceTable.get(itemType) || [],
        npcs_data: data.npcs,
        items_data: data.items,
        scroll_cost: scroll_cost,
        sprites
    });
};

const marketHandler = function (request, reply) {
    reply.view('market', {
        items: itemsData,
        items_data: data.items,
        market: marketTable,
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

const upgradesHandler = function (request, reply) {
    reply.view('upgrades', {
        upgrades: upgradeTable,
        scroll_cost: scroll_cost,
        sprites
    });
};

const exchangesHandler = function (request, reply) {
    reply.view('exchanges', {
        exchanges: exchangeTable,
        items_data: data.items,
        sprites
    });
};


function startJournalProcess() {
    let start = new Date();
    let childProcess = child_process.fork("./indexer", {
        stdio: [0, 1, 2, 'ipc']
    });

    childProcess.on('message', (m) => {
        if (m.type === "done") {
            dropTable = new Map(Object.entries(m.data.dropTable));
            monsterGoldTable = new Map(Object.entries(m.data.monsterGoldTable));
            reverseDropTable = new Map(Object.entries(m.data.reverseDropTable));
            priceTable = new Map(Object.entries(m.data.priceTable));
            contribTable = new Map(Object.entries(m.data.contribTable));
            upgradeTable = new Map(Object.entries(m.data.upgradeTable));
            exchangeTable = m.data.exchangeTable;
            marketTable = m.data.marketTable;
            console.log("Journal completed "+((new Date().getTime()-start.getTime())/1000)+" seconds");
            childProcess.kill('SIGKILL');
        }
    });
}

startJournalProcess();
setInterval(startJournalProcess, 1000 * 60 * 60);


exports.root = rootHandler;

exports.monsters = monstersHandler;
exports.monster = monsterHandler;

exports.npcs = npcsHandler;
exports.npc = npcHandler;

exports.market = marketHandler;
exports.price = priceHandler;

exports.items = itemsHandler;
exports.item = itemHandler;

exports.upgrades = upgradesHandler;
exports.exchanges = exchangesHandler;
