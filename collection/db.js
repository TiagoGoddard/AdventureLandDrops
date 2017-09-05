const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbFile = __dirname + '/../db/drops.sqlite';
const db = new sqlite3.Database(dbFile);

const createQuery = fs.readFileSync(__dirname + '/queries/create.sql', 'utf-8');
const listDropsQuery = fs.readFileSync(__dirname + '/queries/droprate.sql', 'utf-8');
const listMarketQuery = fs.readFileSync(__dirname + '/queries/marketlist.sql', 'utf-8');
const listMarketItemQuery = fs.readFileSync(__dirname + '/queries/marketlistitem.sql', 'utf-8');
const listExchangeQuery = fs.readFileSync(__dirname + '/queries/exchanges.sql', 'utf-8');

db.exec(createQuery);

const deleteMarketStatement = db.prepare('DELETE FROM market WHERE player = ?');
const deleteMarketItemStatement = db.prepare('DELETE FROM market_items where marketid in ( SELECT id FROM market WHERE player = ?);');

const dropStatement = db.prepare('INSERT INTO drops (type, monster, map, gold, items, player, userkey, version, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const itemStatement = db.prepare('INSERT INTO items (name, dropid) VALUES (?, ?)');
const marketStatement = db.prepare('INSERT INTO market (type, price, level, map, server, items, player, userkey, version, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const marketItemStatement = db.prepare('INSERT INTO market_items (name, marketid) VALUES (?, ?)');
const upgradeStatement = db.prepare('INSERT INTO upgrades (item, level, scroll, offering, success, userkey, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
const compoundStatement = db.prepare('INSERT INTO compounds (item, level, success, userkey, time) VALUES (?, ?, ?, ?, ?)');
const exchangeStatement = db.prepare('INSERT INTO exchanges (item, result, amount, userkey, time, level) VALUES (?, ?, ?, ?, ?, ?)');

const listPlayerMarketStatement = db.prepare('SELECT id FROM market WHERE player = ?');
const listDropsStatement = db.prepare(listDropsQuery);
const listMarketStatement = db.prepare(listMarketQuery);
const listMarketItemStatement = db.prepare(listMarketItemQuery);
const listExchangeStatement = db.prepare(listExchangeQuery);

let currentCommand = Promise.resolve();

function runCommand(command) {
    const oldCommand = currentCommand;
    currentCommand = new Promise((res) => {
        oldCommand.then(() => {
            command(res);
        });
    });
}

const addDrop = function(dropData) {
    const time = Math.floor(Date.now() / 1000);

    runCommand((res) => {
        dropStatement.run(
            dropData.type,
            dropData.monster,
            dropData.map,
            dropData.gold,
            dropData.items.length,
            dropData.player,
            dropData.key,
            dropData.version,
            time,

            function() {
                const lastID = this.lastID;

                for (let item of dropData.items) {
                    runCommand((res) => {
                        itemStatement.run(item, lastID, res);
                    });
                }

                res();
            }
        );
    });
};

const addMarket = function(dataArray, player, map, server, key, version) {
    const time = Math.floor(Date.now() / 1000);

    runCommand((res) => {
        deleteMarketItemStatement.run(
            player,
            function(err) {
                if(err) {
                    console.error(err);
                    res();
                    return;
                }
                res();
            }
        );
        deleteMarketStatement.run(
            player,
            function(err) {
                if(err) {
                    console.error(err);
                    res();
                    return;
                }
                res();
            }
        );

        for(let marketData of dataArray) {
            marketStatement.run(
                marketData.name,
                marketData.price,
                marketData.level,
                map,
                server,
                dataArray.length,
                player,
                key,
                version,
                time,

                function(err) {
                    if(err) {
                        console.error(err);
                        res();
                        return;
                    }
                    const lastID = this.lastID;

                    runCommand((res) => {
                        marketItemStatement.run(marketData.name, lastID, res);
                    });
                    res();
                }
            );
        }
        res();
    });
};

const addDrops = function(dataArray, key, version) {
    const time = Math.floor(Date.now() / 1000);

    runCommand((res) => {
        for(let dropData of dataArray) {
            dropStatement.run(
                dropData.type,
                dropData.monster,
                dropData.map,
                dropData.gold,
                dropData.items.length,
                dropData.player,
                key,
                version,
                time,

                function(err) {
                    if(err) {
                        console.error(err);
                        res();
                        return;
                    }
                    const lastID = this.lastID;

                    for (let item of dropData.items) {
                        runCommand((res) => {
                            itemStatement.run(item, lastID, res);
                        });
                    }
                    res();
                }
            );
        }
        res();
    });
};

const addUpgrade = function(upgradeData) {
    const time = Math.floor(Date.now() / 1000);

    for (let entry of upgradeData.entries) {
        runCommand((res) => {
            upgradeStatement.run(
                entry.item,
                entry.level,
                entry.scroll,
                entry.offering,
                entry.success,
                upgradeData.key,
                time,
                res
            );
        });
    }
};

const addCompound = function(compoundData) {
    const time = Math.floor(Date.now() / 1000);

    runCommand((res) => {
        compoundStatement.run(
            compoundData.item,
            compoundData.level,
            compoundData.success,
            compoundData.key,
            time,
            res
        );
    });
};

const addExchange = function(exchangeData) {
    const time = Math.floor(Date.now() / 1000);
    //(item, result, amount, userkey, time)
    runCommand((res) => {
        exchangeStatement.run(
            exchangeData.item,
            exchangeData.result,
            exchangeData.amount,
            exchangeData.key,
            time,
            exchangeData.level,
            res
        );
    });
};

const getDropTable = function() {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            listDropsStatement.all((err, rows) => {
                cmdRes();

                const monsters = new Map();
                for (let row of rows) {
                    let monster = row.monster;

                    if (!monsters.has(monster)) {
                        monsters.set(monster, []);
                    }

                    monsters.get(monster).push({
                        item: row.item,
                        map: row.map,
                        rate: row.rate,
                        drops: row.drops,
                        kills: row.kills
                    });
                }

                res(monsters);
            });
        });
    });
};

const getMarketTable = function() {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            listMarketStatement.all((err, rows) => {
                cmdRes();

                const items = {};
                for (let row of rows) {
                    let item = row.item;
                    if(!items[item])
                        items[item] = [];

                    items[item].push({
                        item: row.item,
                        level: row.level,
                        avgprice: row.avgprice,
                        avaliable: row.avaliable
                    });
                }

                res(items);
            });
        });
    });
};

const getPriceTable = function() {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            listMarketItemStatement.all((err, rows) => {
                cmdRes();

                const sells = new Map();
                for (let row of rows) {
                    let item = row.item;
                    if (!sells.has(item)) {
                        sells.set(item, []);
                    }
                    sells.get(item).push({ price : row.price, level : row.level, player : row.player, map: row.map, server: row.server });
                }

                res(sells);
            });
        });
    });
};

const getGoldTable = function() {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            let avgGoldQuery = `SELECT monster, COUNT(*) AS kills, AVG(gold) AS avggold FROM drops GROUP BY monster`;

            db.prepare(avgGoldQuery).all((err, rows) => {
                cmdRes();

                const monstergold = new Map();
                for (let row of rows) {
                    let monster = row.monster;
                    let avggold = row.avggold;
                    let kills = row.kills;

                    monstergold.set(monster, { avggold : avggold, kills : kills });
                }

                res(monstergold);
            });
        });
    });
};

const getContribTable = function() {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            let playerContribQuery = `SELECT monster, COUNT(*) AS kills, player FROM drops GROUP BY monster, player ORDER BY monster, kills DESC`;

            db.prepare(playerContribQuery).all((err, rows) => {
                cmdRes();

                const contribs = new Map();
                for (let row of rows) {
                    let monster = row.monster;
                    if (!contribs.has(monster)) {
                        contribs.set(monster, []);
                    }
                    contribs.get(monster).push({ kills : row.kills, player : row.player });
                }

                res(contribs);
            });
        });
    });
};

const getUpgradesTable = function () {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            let upgradesQuery = `SELECT * FROM upgrades ORDER BY item`;

            db.prepare(upgradesQuery).all((err, rows) => {
                cmdRes();

                const upgrades = {};
                for (let row of rows) {
                    let item = row.item;
                    if (!upgrades[item]) {
                        upgrades[item] = { name : item, results : []};
                    }
                    let results = upgrades[item].results;
                    if(!results[row.level]) {
                        results[row.level] = { success : 0, fails : 0 };
                    }
                    if(row.success)
                        results[row.level].success++;
                    else
                        results[row.level].fails++;
                }

                res(upgrades);
            });
        });
    });
};

const getUpgradeAndCompoundsTable = function() {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            let query = `SELECT item, level, success FROM upgrades UNION ALL SELECT item, level, success FROM compounds`;

            db.prepare(query).all((err, rows) => {
                cmdRes();

                const data = {};
                for (let row of rows) {
                    let item = row.item;
                    if (!data[item]) {
                        data[item] = { name : item, results : []};
                    }
                    let results = data[item].results;
                    if(!results[row.level]) {
                        results[row.level] = { success : 0, fails : 0 };
                    }
                    if(row.success == '1')
                        results[row.level].success++;
                    else
                        results[row.level].fails++;
                }
                res(data);
            });
        });
    });
};

const getUpgradeInfo = function(item) {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            let query = `SELECT level, success FROM compounds WHERE item="${item}"`;

            db.prepare(query).all((err, rows) => {
                cmdRes();

                const results = [];
                for (let row of rows) {
                    if(!results[row.level]) {
                        results[row.level] = { success : 0, fails : 0 };
                    }
                    if(row.success == '1')
                        results[row.level].success++;
                    else
                        results[row.level].fails++;
                }
                res(results);
            });
        });
    });
};

const getExchangesTable = function() {
    return new Promise((res) => {
        runCommand((cmdRes) => {
            listExchangeStatement.all((err, rows) => {
                cmdRes();

                const exchanges = {};
                for (let row of rows) {
                    let item = row.item;
                    let level = row.level;
                    if(!exchanges[item])
                        exchanges[item] = [];
                    if(!exchanges[item][level])
                        exchanges[item][level] = [];

                    exchanges[item][level].push({result: row.result, amount : row.avg_amount, seen : row.seen, total : row.total});
                }

                res(exchanges);
            });
        });
    });
};

exports.addDrop = addDrop;
exports.addDrops = addDrops;
exports.addUpgrade = addUpgrade;
exports.addCompound = addCompound;
exports.addExchange = addExchange;
exports.addMarket = addMarket;
exports.getDropTable = getDropTable;
exports.getGoldTable = getGoldTable;
exports.getContribTable = getContribTable;
exports.getUpgradesTable = getUpgradesTable;
exports.getUpgradeAndCompoundsTable = getUpgradeAndCompoundsTable;
exports.getUpgradeInfo = getUpgradeInfo;
exports.getExchangesTable = getExchangesTable;
exports.getMarketTable = getMarketTable;
exports.getPriceTable = getPriceTable;
