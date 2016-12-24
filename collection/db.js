const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbFile = __dirname + '/../db/drops.sqlite';
const db = new sqlite3.Database(dbFile);

const createQuery = fs.readFileSync(__dirname + '/queries/create.sql', 'utf-8');
const listDropsQuery = fs.readFileSync(__dirname + '/queries/droprate.sql', 'utf-8');

db.exec(createQuery);

const dropStatement = db.prepare('INSERT INTO drops VALUES (null, ?, ?, ?, ?, ?, ?, ?)');
const itemStatement = db.prepare('INSERT INTO items VALUES (null, ?, ?)');
const upgradeStatement = db.prepare('INSERT INTO upgrades VALUES (null, ?, ?, ?, ?, ?, ?, ?)');
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
            dropData.key,
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
}

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

exports.addDrop = addDrop;
exports.addUpgrade = addUpgrade;
exports.getDropTable = getDropTable;
