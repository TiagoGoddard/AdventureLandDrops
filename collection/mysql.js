const settings = require("../settings");
const fs = require("fs");
const mysql = require('mysql');
const G = require("./../data/data");

var connection = mysql.createConnection({
    host: settings.database.hostname,
    user: settings.database.username,
    password: settings.database.password,
    database: settings.database.database,
    multipleStatements: true
});

connection.connect(function (err) {
    if (err) {
        console.error('Error connecting to Database: ' + err.stack);
        process.exit();
        return;
    }

    console.log('connected as id ' + connection.threadId);
});

const st = {
    insert: {
        kills: "INSERT INTO kills (monster_name, map, monster_level, gold, items, character_name, api_key, time) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP());",
        drops: "INSERT INTO drops (item_name, kill_id) VALUES (?,?);",
        exchanges: "INSERT INTO exchanges (item_name, item_level, result, amount, api_key, time) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP());",
        compounds: "INSERT INTO compounds (item_name, item_level, scroll_type, offering, success, api_key, time) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP());",
        upgrades: "INSERT INTO upgrades (item_name, item_level, scroll_type, offering, success, api_key, time) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP());",
        market: "",
        api_key: "INSERT INTO api_keys (player, api_key, valid) VALUES (?,?,?)",
    },
    tables: ["drops", "exchanges", "upgrades", "compounds", "kills"],
    limits: "SELECT \n" +
    "(SELECT id FROM ?? ORDER BY id LIMIT 1) as 'first',\n" +
    "(SELECT id FROM ?? ORDER BY id DESC LIMIT 1) as 'last'",
    aggregate: {
        kills: "SELECT i.monster_name, COUNT(*) AS kills, i.character_name, i.map, i.monster_level, SUM(i.gold) AS total_gold FROM (SELECT * FROM kills WHERE id >= ?  AND id < ?) AS i GROUP BY i.monster_name, i.character_name, i.map,i.monster_level;",
        drops: "SELECT k.monster_name, d.item_name, k.map, k.monster_level, COUNT(*) AS seen FROM (SELECT * FROM drops WHERE id >= ?  AND id < ? ) AS d INNER JOIN kills AS k ON d.kill_id = k.id GROUP BY k.monster_name, d.item_name, k.monster_level, k.map;",
        exchanges: "SELECT e.item_name, e.item_level, e.result, e.amount, COUNT(*) AS seen FROM (SELECT * FROM exchanges WHERE id >= ?  AND id < ? ) AS e GROUP BY e.item_name, e.item_level, e.result, e.amount;",
        upgrades: "SELECT u.item_name, u.item_level, COUNT(*) AS total, SUM(u.success) AS success FROM (SELECT * FROM upgrades WHERE id >= ?  AND id < ?) AS u GROUP BY u.item_name, u.item_level",
        compounds: "SELECT c.item_name, c.item_level, COUNT(*) AS total, SUM(c.success) AS success FROM (SELECT * FROM compounds WHERE id >= ?  AND id < ?) AS c GROUP BY c.item_name, c.item_level"
    },
    update_statistics: {
        kills: "INSERT INTO kill_statistics (character_name, monster_name, map, monster_level, kills, total_gold) Values (?,?,?,?,?,?) ON DUPLICATE KEY Update `kills` = `kills` + ?, `total_gold` = `total_gold` + ?;",
        drops: "INSERT INTO drop_statistics (monster_name, item_name, map, monster_level, seen) Values (?,?,?,?,?) ON DUPLICATE KEY Update `seen` = `seen` + ? ;",
        exchanges: "INSERT INTO exchange_statistics (item_name, item_level, result, amount, seen) Values (?,?,?,?,?) ON DUPLICATE KEY Update `seen` = `seen` + ? ;",
        compounds: "INSERT INTO compound_statistics (item_name, item_level, total, success) Values (?,?,?,?) ON DUPLICATE KEY Update `total` = `total` + ?, `success` = `success` + ? ;",
        upgrades: "INSERT INTO upgrade_statistics (item_name, item_level, total, success) Values (?,?,?,?) ON DUPLICATE KEY Update `total` = `total` + ?, `success` = `success` + ? ;",
        market: ""
    },
    get_statistics: {
        kills: "SELECT * FROM kill_statistics WHERE monster_name = ? AND monster_level = ? ORDER BY kills DESC",
        drops:  "SELECT * FROM drop_statistics WHERE monster_name = ?",
        exchanges:  "SELECT * FROM exchange_statistics WHERE item_name = ?",
        compounds:  "SELECT * FROM compound_statistics WHERE item_name = ?",
        upgrades: "SELECT * FROM upgrade_statistics WHERE item_name = ?",
        reverseDrop: "SELECT *, a.seen*100 / a.kills AS rate FROM(SELECT i.monster_name, SUM( `kill_statistics`.`kills`) AS kills, i.seen, i.map FROM (SELECT * FROM `drop_statistics` WHERE item_name = ?) i INNER JOIN `kill_statistics` ON i.monster_name = `kill_statistics`.monster_name GROUP BY i.monster_name, i.map) a ORDER BY rate DESC"
    },
    get: {
        api_key: "SELECT player, valid FROM api_keys WHERE api_key = ?"
    },
    clear_statistics:{
        kills: "DELETE FROM kill_statistics",
        drops:  "DELETE FROM drop_statistics",
        exchanges:  "DELETE FROM exchange_statistics",
        compounds:  "DELETE FROM compound_statistics",
        upgrades: "DELETE FROM upgrade_statistics",
    }
};

/**
 *
 * @param {string} monster_name
 * @param {string} chest_type
 * @param {string} map
 * @param {number} monster_level
 * @param {number} gold
 * @param {number} items
 * @param {string} character_name
 * @param {string} api_key
 * @param version
 * @returns {Promise<any>}
 */
const insertKill = async function (monster_name, map, monster_level, gold, items, character_name, api_key) {
    return new Promise(function (resolve, reject) {
        if (typeof monster_name !== "string") {
            reject("Monster name invalid!");
            return;
        }
        if (typeof map !== "string") {
            reject("Map invalid!");
            return;
        }
        if (typeof monster_level !== "number" || monster_level < 1) {
            reject("Monster level invalid!");
            return;
        }
        if (typeof gold !== "number" || gold < 0) {
            reject("Gold invalid!");
            return;
        }
        if (typeof items !== "number" || items < 0) {
            reject("Items invalid!");
            return;
        }
        if (typeof character_name !== "string") {
            reject("Character name invalid!");
            return;
        }
        if (typeof api_key !== "string" || api_key.length > 64) {
            reject("API "+api_key+" key invalid!");
            return;
        }
        connection.query(st.insert.kills, [monster_name, map, monster_level, gold, items, character_name, api_key], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    });
};

/**
 *
 * @param {string} item_name
 * @param {number} kill_id
 * @returns {Promise<void>}
 */
const insertDrop = async function (item_name, kill_id) {
    return new Promise(function (resolve, reject) {
        if (typeof item_name !== "string") {
            reject("Item name invalid!");
            return;
        }
        if (typeof kill_id !== "number" || kill_id < 0) {
            reject("kill id invalid!");
            return;
        }
        connection.query(st.insert.drops, [item_name, kill_id], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    });
};

/**
 *
 * @param {string} item_name
 * @param {number} item_level
 * @param {string} result
 * @param {number} amount
 * @param {string} api_key
 * @returns {Promise<void>}
 */
const insertExchange = async function (item_name, item_level, result, amount, api_key) {
    return new Promise(function (resolve, reject) {
        if (typeof item_name !== "string") {
            reject("Item name invalid!");
            return;
        }
        if (typeof item_level !== "number") {
            reject("Item level invalid!");
            return;
        }
        if (typeof result !== "string") {
            reject("Result invalid!");
            return;
        }
        if (typeof amount !== "number") {
            reject("Amount invalid!");
            return;
        }
        if (typeof api_key !== "string" || api_key.length > 64) {
            reject("API key invalid!");
            return;
        }
        connection.query(st.insert.exchanges, [item_name, item_level, result, amount, api_key], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    });
};

/**
 *
 * @param {string} item_name
 * @param {number} item_level
 * @param {string} scroll_type
 * @param {boolean} offering
 * @param {boolean} success
 * @param {string} api_key
 * @returns {Promise<any>}
 */
const insertCompound = async function (item_name, item_level, scroll_type, offering, success, api_key) {
    return new Promise(function (resolve, reject) {
        if (typeof item_name !== "string") {
            reject("Item name invalid!");
            return;
        }
        if (typeof item_level !== "number") {
            reject("Item level invalid!");
            return;
        }
        if (typeof scroll_type !== "string") {
            reject("Scroll type invalid!");
            return;
        }
        if (!(offering === 1 || offering === 0)) {
            reject("Offering invalid!");
            return;
        }
        if (!(success === 1 || success === 0)) {
            reject("Success invalid!");
            return;
        }
        if (typeof api_key !== "string" || api_key.length > 64) {
            reject("API key invalid!");
            return;
        }
        connection.query(st.insert.compounds, [item_name, item_level, scroll_type, offering, success, api_key], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    });
};

/**
 *
 * @param {string} item_name
 * @param {number} item_level
 * @param {string} scroll_type
 * @param {number} offering
 * @param {number} success
 * @param {string} api_key
 * @returns {Promise<any>}
 */
const insertUpgrade = async function (item_name, item_level, scroll_type, offering, success, api_key) {
    return new Promise(function (resolve, reject) {
        if (typeof item_name !== "string") {
            reject("Item name invalid!");
            return;
        }
        if (typeof item_level !== "number") {
            reject("Item level invalid!");
            return;
        }
        if (typeof scroll_type !== "string") {
            reject("Scroll type invalid!");
            return;
        }
        if ((offering === 1 || offering === 0)) {
            reject("Offering invalid!");
            return;
        }
        if (!(success === 1 || success === 0)) {
            reject("Success invalid!");
            return;
        }
        if (typeof api_key !== "string" || api_key.length > 64) {
            reject("API key invalid!");
            return;
        }
        connection.query(st.insert.upgrades, [item_name, item_level, scroll_type, offering, success, api_key], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    });
};

/**
 *
 * @param {string} player
 * @param {string} api_key
 * @param {boolean} valid
 * @returns {Promise<any>}
 */
const insertApiKey = async function (player, api_key, valid) {
    return new Promise(function (resolve, reject) {
        if (typeof player !== "string") {
            reject("Player name invalid!");
            return;
        }
        if (typeof api_key !== "string" || api_key.length > 64) {
            reject("API key invalid!");
            return;
        }
        if (!(valid === 0 || valid === 1)) {
            reject("valid invalid!");
            return;
        }
        connection.query(st.insert.api_key, [player, api_key, valid], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });

    });
};

/**
 *
 * @param {string} tableName
 * @returns {Promise<any>}
 */
const getLimits = async function (tableName) {
    return new Promise(function (resolve, reject) {
        if (st.tables.includes(tableName) === -1) {
            reject("Table name invalid!");
            return;
        }
        connection.query(st.limits, [tableName, tableName], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    });
};

/**
 *
 * @param {number} start
 * @param {number} end
 * @returns {Promise<any>}
 */
const aggregateDrops = async function (start, end) {
    return new Promise(function (resolve, reject) {
        if (end <= start) {
            reject("end has to be grater than start");
            return;
        }
        connection.query(st.aggregate.drops, [start, end], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {number} start
 * @param {number} end
 * @returns {Promise<any>}
 */
const aggregateKills = async function (start, end) {
    return new Promise(function (resolve, reject) {
        if (end <= start) {
            reject("end has to be grater than start");
            return;
        }
        connection.query(st.aggregate.kills, [start, end], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {number} start
 * @param {number} end
 * @returns {Promise<any>}
 */
const aggregateExchanges = async function (start, end) {
    return new Promise(function (resolve, reject) {
        if (end <= start) {
            reject("end has to be grater than start");
            return;
        }
        connection.query(st.aggregate.exchanges, [start, end], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {number} start
 * @param {number} end
 * @returns {Promise<any>}
 */
const aggregateUpgrades = async function (start, end) {
    return new Promise(function (resolve, reject) {
        if (end <= start) {
            reject("end has to be grater than start");
            return;
        }
        connection.query(st.aggregate.upgrades, [start, end], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {number} start
 * @param {number} end
 * @returns {Promise<any>}
 */
const aggregateCompounds = async function (start, end) {
    return new Promise(function (resolve, reject) {
        if (end <= start) {
            reject("end has to be grater than start");
            return;
        }
        connection.query(st.aggregate.compounds, [start, end], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {string} monster_name
 * @param {string} item_name
 * @param {string} map
 * @param {number} monster_level
 * @param {number} seen
 * @returns {Promise<any>}
 */
const updateDropStatistics = function(monster_name, item_name, map, monster_level, seen){
    return new Promise(function(resolve, reject){
        if (typeof monster_name !== "string") {
            reject("Monster name invalid!");
            return;
        }
        if (typeof item_name !== "string") {
            reject("Item name invalid!");
            return;
        }
        if (typeof map !== "string") {
            reject("Map invalid!");
            return;
        }
        if (typeof monster_level !== "number" || monster_level < 1) {
            reject("Monster level invalid!");
            return;
        }
        if (typeof seen !== "number" || seen < 1) {
            reject("Seen invalid!");
            return;
        }
        connection.query(st.update_statistics.drops, [monster_name, item_name, map, monster_level, seen, seen], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {string} character_name
 * @param {string} monster_name
 * @param {string} map
 * @param {number} monster_level
 * @param {number} kills
 * @param {number} total_gold
 * @returns {Promise<any>}
 */
const updateKillStatistics = function(character_name, monster_name, map, monster_level, kills, total_gold){
    return new Promise(function(resolve, reject){
        if (typeof character_name !== "string") {
            reject("Character name invalid!");
            return;
        }
        if (typeof monster_name !== "string") {
            reject("Monster name invalid!");
            return;
        }
        if (typeof map !== "string") {
            reject("Map invalid!");
            return;
        }
        if (typeof monster_level !== "number" || monster_level < 1) {
            reject("Monster level invalid!");
            return;
        }
        if (typeof kills !== "number" || kills < 1) {
            reject("Kills invalid!");
            return;
        }
        if (typeof total_gold !== "number" || total_gold < 1) {
            reject("Total gold invalid!");
            return;
        }
        connection.query(st.update_statistics.kills, [character_name, monster_name, map, monster_level, kills, total_gold, kills, total_gold], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {string} item_name
 * @param {number} item_level
 * @param {string} result
 * @param {number} amount
 * @param {number} seen
 * @returns {Promise<any>}
 */
const updateExchangeStatistics = function(item_name, item_level, result, amount, seen){
    return new Promise(function(resolve, reject){
        if (typeof item_name !== "string") {
            reject("Item name invalid!");
            return;
        }
        if (typeof item_level !== "number" || item_level < 0) {
            reject("Item level invalid!");
            return;
        }
        if (typeof result !== "string") {
            reject("Result invalid!");
            return;
        }
        if (typeof amount !== "number" || amount < 1) {
            reject("Amount invalid!");
            return;
        }
        if (typeof seen !== "number" || seen < 1) {
            reject("Seen invalid!");
            return;
        }
        connection.query(st.update_statistics.exchanges, [item_name, item_level, result, amount, seen, seen], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param item_name
 * @param item_level
 * @param total
 * @param success
 * @returns {Promise<any>}
 */
const updateUpgradesStatistics = function(item_name, item_level, total, success){
    return new Promise(function(resolve, reject){
        if (typeof item_name !== "string") {
            reject("Item name invalid!");
            return;
        }
        if (typeof item_level !== "number" || item_level < 0) {
            reject("Item level invalid!");
            return;
        }
        if (typeof total !== "number" || total < 1) {
            reject("Total invalid!");
            return;
        }
        if (typeof success !== "number" || success < 0) {
            reject("Success invalid!");
            return;
        }
        if(total < success){
            reject("Success has to smaller or equal to Total!");
            return;
        }
        connection.query(st.update_statistics.upgrades, [item_name, item_level, total, success, total, success], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {string} item_name
 * @param {number} item_level
 * @param {number} total
 * @param {number} success
 * @returns {Promise<any>}
 */
const updateCompoundsStatistics = function(item_name, item_level, total, success){
    return new Promise(function(resolve, reject){
        if (typeof item_name !== "string") {
            reject("Item name invalid!");
            return;
        }
        if (typeof item_level !== "number" || item_level < 0) {
            reject("Item level invalid!");
            return;
        }
        if (typeof total !== "number" || total < 1) {
            reject("Total invalid!");
            return;
        }
        if (typeof success !== "number" || success < 0) {
            reject("Success invalid!");
            return;
        }
        if(total < success){
            reject("Success has to smaller or equal to Total!");
            return;
        }
        connection.query(st.update_statistics.compounds, [item_name, item_level, total, success, total, success], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {string} monsterName
 * @returns {Promise<any>}
 */
const getKillsByMonster = function(monsterName, level){
    return new Promise(function(resolve, reject){
        if (typeof monsterName !== "string") {
            reject("Monster name invalid!");
            return;
        }
        connection.query(st.get_statistics.kills, [monsterName, level], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {string} monsterName
 * @returns {Promise<any>}
 */
const getDropsByMonster = function(monsterName){
    return new Promise(function(resolve, reject){
        if (typeof monsterName !== "string") {
            reject("Monster name invalid!");
            return;
        }
        connection.query(st.get_statistics.drops, [monsterName], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {string} itemName
 * @returns {Promise<any>}
 */
const getExchangesByItemName = function(itemName){
    return new Promise(function(resolve, reject){
        if (typeof itemName !== "string") {
            reject("Item name invalid!");
            return;
        }
        connection.query(st.get_statistics.exchanges, [itemName], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};

/**
 *
 * @param {string} itemName
 * @returns {Promise<any>}
 */
const getUpgradesByItemName = function(itemName){
    return new Promise(function(resolve, reject){
        if (typeof itemName !== "string") {
            reject("Item name invalid!");
            return;
        }
        connection.query(st.get_statistics.upgrades, [itemName], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};
/**
 *
 * @param {string} itemName
 * @returns {Promise<any>}
 */
const getCompoundsByItemName = function(itemName){
    return new Promise(function(resolve, reject){
        if (typeof itemName !== "string") {
            reject("Item name invalid!");
            return;
        }
        connection.query(st.get_statistics.compounds, [itemName], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    })
};
/**
 *
 * @param {string} key
 * @returns {Promise<any>}
 */
const validKey = async function (key) {
    return new Promise(function (resolve, reject) {
        if (typeof key === "string" && key.length < 64)
            connection.query(st.get.api_key, [key], function (err, result) {
                if (err)
                    reject(err);
                resolve(result);
            });
        else
            reject("Invalid Input");
    });
};

const getReverseDrop = async function (itemName) {
    return new Promise(function (resolve, reject) {
        if (typeof itemName === "string")
            connection.query(st.get_statistics.reverseDrop, [itemName], function (err, result) {
                if (err)
                    reject(err);
                resolve(result);
            });
        else
            reject("Item name invalid");
    });
};


/**
 * Deletes all data in the statistics tables
 */
const clearAllStatistics = function(){
    return Promise.all([
        new Promise(function (resolve, reject) {
            connection.query(st.clear_statistics.kills, function (err, result) {
                if (err)
                    reject(err);
                resolve(result);
            });
        }),
        new Promise(function (resolve, reject) {
            connection.query(st.clear_statistics.drops, function (err, result) {
                if (err)
                    reject(err);
                resolve(result);
            });
        }),
        new Promise(function (resolve, reject) {
            connection.query(st.clear_statistics.exchanges, function (err, result) {
                if (err)
                    reject(err);
                resolve(result);
            });
        }),
        new Promise(function (resolve, reject) {
            connection.query(st.clear_statistics.compounds, function (err, result) {
                if (err)
                    reject(err);
                resolve(result);
            });
        }),
        new Promise(function (resolve, reject) {
            connection.query(st.clear_statistics.upgrades, function (err, result) {
                if (err)
                    reject(err);
                resolve(result);
            });
        }),
    ]);
};
module.exports = {
    insertKill: insertKill,
    insertDrop: insertDrop,
    insertExchange: insertExchange,
    insertCompound:insertCompound,
    insertUpgrade:insertUpgrade,
    insertApiKey:insertApiKey,
    getLimits: getLimits,
    aggregateDrops:aggregateDrops,
    aggregateKills:aggregateKills,
    aggregateExchanges:aggregateExchanges,
    aggregateUpgrades:aggregateUpgrades,
    aggregateCompounds:aggregateCompounds,
    updateDropStatistics:updateDropStatistics,
    updateKillStatistics:updateKillStatistics,
    updateExchangeStatistics:updateExchangeStatistics,
    updateUpgradesStatistics:updateUpgradesStatistics,
    updateCompoundsStatistics:updateCompoundsStatistics,
    getKillsByMonster:getKillsByMonster,
    getDropsByMonster:getDropsByMonster,
    getExchangesByItemName:getExchangesByItemName,
    getUpgradesByItemName:getUpgradesByItemName,
    getCompoundsByItemName:getCompoundsByItemName,
    validKey: validKey,
    getReverseDrop:getReverseDrop,
    clearAllStatistics:clearAllStatistics,
    connection: connection,
}

