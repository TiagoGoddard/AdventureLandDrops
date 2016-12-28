const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbFile = __dirname + '/../db/drops.sqlite';
const db = new sqlite3.Database(dbFile);

const createQuery = fs.readFileSync(__dirname + '/queries/create.sql', 'utf-8');
const listDropsQuery = fs.readFileSync(__dirname + '/queries/droprate.sql', 'utf-8');

db.exec(createQuery);

const dropStatement = db.prepare('INSERT INTO drops (id, type, monster, map, gold, items, player, userkey, time, version) VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const itemStatement = db.prepare('INSERT INTO items VALUES (null, ?, ?)');
const upgradeStatement = db.prepare('INSERT INTO upgrades VALUES (null, ?, ?, ?, ?, ?, ?, ?)');
const compoundStatement = db.prepare('INSERT INTO compounds (item, level, success, userkey, time) VALUES (?, ?, ?, ?, ?)');
const exchangeStatement = db.prepare('INSERT INTO exchanges (item, result, amount, userkey, time) VALUES (?, ?, ?, ?, ?)');
const listDropsStatement = db.prepare(listDropsQuery);


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
                    if(row.success)
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
            let query = `
            SELECT item, result, AVG(amount) AS avg_amount FROM exchanges WHERE result <> 'gold' GROUP BY item, result
            UNION ALL
            SELECT item, result, AVG(amount) AS avg_amount FROM exchanges WHERE result == 'gold' GROUP BY item;`;

            db.prepare(query).all((err, rows) => {
                cmdRes();

                const exchanges = {};
                for (let row of rows) {
                    let item = row.item;
                    if(!exchanges[item])
                        exchanges[item] = [];
                    let result = row.result;
                    let avg_amount = row.avg_amount;
                    exchanges[item].push({result: result, amount : avg_amount});
                }

                res(exchanges);
            });
        });
    });
}

exports.addDrop = addDrop;
exports.addUpgrade = addUpgrade;
exports.addCompound = addCompound;
exports.addExchange = addExchange;
exports.getDropTable = getDropTable;
exports.getGoldTable = getGoldTable;
exports.getContribTable = getContribTable;
exports.getUpgradesTable = getUpgradesTable;
exports.getUpgradeAndCompoundsTable = getUpgradeAndCompoundsTable;
exports.getUpgradeInfo = getUpgradeInfo;
exports.getExchangesTable = getExchangesTable;
