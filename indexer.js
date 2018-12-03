process.on('uncaughtException', function (exception) {
    console.log(exception);
    console.log(exception.stack);
});
const collection = require('./collection');
const data = require('./data');


let dropTable = new Map();
let monsterGoldTable = new Map();
let reverseDropTable = new Map();
let priceTable = new Map();
let contribTable = new Map();
let upgradeTable = {};
let exchangeTable = {};
let marketTable = {};

async function updateDropTable() {
    var table = await collection.db.getDropTable();
    console.log(table);
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

            if (data.monsters[monster]) {
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


    monsterGoldTable = await collection.db.getGoldTable();
    contribTable = await collection.db.getContribTable();
}

async function updateUpgradeTable() {
    var table = collection.db.getUpgradeAndCompoundsTable()


    let upgradeData = {
        'Weapons': {
            types: ['weapon', 'quiver', 'shield'],
            max_level: 12,
            data: []
        },
        'Armor': {
            types: ['helmet', 'chest', 'pants', 'gloves', 'shoes', 'cape'],
            max_level: 12,
            data: []
        },
        'Accessories': {
            types: ['amulet', 'ring', 'earring', 'tome', 'belt', 'source'],
            max_level: 10,
            data: []
        },
        'Misc': {
            types: [],
            max_level: 12,
            data: []
        },
    };

    for (let key in table) {
        let upgrade_info = table[key];
        let item = data.items[upgrade_info.name];

        let group_type = 'Misc';
        if (item) {
            for (let group in upgradeData) {
                if (upgradeData[group].types.indexOf(item.type) > -1)
                    group_type = group;
            }
        }

        let new_info = {
            name: item.name,
            item: upgrade_info.name,
            results: []
        };

        for (let level in upgrade_info.results) {
            new_info.results[level] = upgrade_info.results[level];
        }
        upgradeData[group_type].data.push(new_info);
    }

    function compare(a, b) {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    }

    upgradeData['Weapons'].data.sort(compare);
    upgradeData['Armor'].data.sort(compare);
    upgradeData['Accessories'].data.sort(compare);
    upgradeData['Misc'].data.sort(compare);
    upgradeTable = upgradeData;

}

async function updateMarketTable() {
    marketTable = await collection.db.getMarketTable()
}

async function updatePriceTable() {
    priceTable = await collection.db.getPriceTable()
}

async function updateExchangeTable() {
    exchangeTable = await collection.db.getExchangesTable()
}

async function main() {
    await updateDropTable();
    await updateUpgradeTable();
    await updateExchangeTable();
    await updateMarketTable();
    await updatePriceTable();
    process.send({
        type: "done",
        data: {
            dropTable: dropTable,
            monsterGoldTable: monsterGoldTable,
            reverseDropTable: reverseDropTable,
            priceTable: priceTable,
            contribTable: contribTable,
            upgradeTable: upgradeTable,
            exchangeTable: exchangeTable,
            marketTable: marketTable,
        }
    });
    process.exit(0);
}
main();



