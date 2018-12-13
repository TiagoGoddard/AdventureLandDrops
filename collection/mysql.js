const settings = require("../settings");
const fs = require("fs");
var mysql = require('mysql');
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
        kills: "INSERT INTO kills (monster_name, chest_type, map, monster_level, gold, items, character_name, api_key, version, time) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP());",
        drops: "INSERT INTO drops (item_name, kill_id) VALUES (?,?);",
        exchanges: "INSERT INTO exchanges (item_name, item_level, result, amount, api_key, time) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP());",
        compounds: "INSERT INTO compounds (item_name, item_level, scroll_type, offering, success, api_key, time) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP());",
        upgrades: "INSERT INTO upgrades (item_name, item_level, scroll_type, offering, success, api_key, time) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP());",
        market: "",
        api_key: "INSERT INTO api_keys (player, api_key, valid)",
    },
    tables: ["drops", "exchanges", "upgrades", "compounds", "kills"],
    limits: "SELECT \n" +
    "(SELECT id FROM ? ORDER BY id LIMIT 1) as 'first',\n" +
    "(SELECT id FROM ? ORDER BY id DESC LIMIT 1) as 'last'",
    aggregate: {
        drop: "SELECT k.monster_name, d.item_name, k.map, k.monster_level, COUNT(*) AS seen FROM (SELECT * FROM drops WHERE id > ? * 2500 AND id < 2500 * (? + 1)) AS d INNER JOIN kills AS k ON d.kill_id = k.id GROUP BY k.monster_name, d.item_name, k.monster_level, k.map;",
        kill: "SELECT i.monster_name, COUNT(*) AS kills, i.character_name, i.map, SUM(i.gold) AS total_gold FROM (SELECT * FROM kills WHERE id > ? * 2500 AND id < 2500 * (? + 1)) AS i GROUP BY i.monster_name, i.character_name, i.map;",
        exchanges: "SELECT e.item_name, e.item_level, e.result, e.amount, COUNT(*) AS seen FROM (SELECT * FROM exchanges WHERE id > 0 * 2500 AND id < 2500 * (0 + 1)) AS e GROUP BY e.item_name, e.item_level, e.result, e.amount;",
        upgrades: "SELECT u.item_name, u.item_level, COUNT(*) AS total, SUM(u.success) AS success FROM (SELECT * FROM upgrades WHERE id > 0 * 2500 AND id < 2500 * (0 + 1)) AS u GROUP BY u.item_name, u.item_level",
        compounds: "SELECT c.item_name, c.item_level, COUNT(*) AS total, SUM(c.success) AS success FROM (SELECT * FROM compounds WHERE id > 0 * 2500 AND id < 2500 * (0 + 1)) AS c GROUP BY c.item_name, c.item_level"
    },
    update_statistics: {
        drop: "INSERT INTO drop_statistics (monster_name, item_name, map, monster_level, seen) Values (?,?,?,?,?) ON DUPLICATE KEY Update `seen` = `seen` + ? ;",
        kills: "INSERT INTO kill_statistics (character_name, monster_name, map, monster_level, kills, total_gold) Values (?,?,?,?,?,?) ON DUPLICATE KEY Update `kills` = `kills` + ?, `total_gold` = `total_gold` + ?;",
        exchange: "INSERT INTO exchange_statistics (item_name, item_level, result, amount, seen) Values (?,?,?,?,?) ON DUPLICATE KEY Update `seen` = `seen` + ? ;",
        compounds: "INSERT INTO compounds_statistics (item_name, item_level, total, success) Values (?,?,?,?) ON DUPLICATE KEY Update `total` = `total` + ?, `success` = `success` + ? ;",
        upgrades: "INSERT INTO upgrades_statistics (item_name, item_level, total, success) Values (?,?,?,?) ON DUPLICATE KEY Update `total` = `total` + ?, `success` = `success` + ? ;",
        market: ""
    },
    get: {
        kills: "",
        drops: "",
        exchange: "",
        api_key: "SELECT player, valid FROM api_keys WHERE api_key = ?"
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
 * @param {number} version
 * @returns {Promise<any>}
 */
const insertKills = async function (monster_name, chest_type, map, monster_level, gold, items, character_name, api_key, version) {
    return new Promise(function (resolve, reject) {
        if(!typeof monster_name === "string"){
            reject("Monster name invalid!");
            return;
        }
        if(!typeof chest_type === "string"){
            reject("Chest type invalid!");
            return;
        }
        if(!typeof map === "string"){
            reject("Map invalid!");
            return;
        }
        if(!typeof monster_level === "number" || monster_level < 1){
            reject("Monster level invalid!");
            return;
        }
        if(!typeof gold === "number" || gold < 0){
            reject("Gold invalid!");
            return;
        }
        if(!typeof items === "number" || items < 0){
            reject("Items invalid!");
            return;
        }
        if(!typeof character_name === "string"){
            reject("Character name invalid!");
            return;
        }
        if(!typeof api_key === "string" || api_key.length > 64){
            reject("API key invalid!");
            return;
        }
        if(!typeof version === "number" || version < 0){
            reject("Version invalid!");
            return;
        }

        connection.query(st.insert.kills,[monster_name, chest_type, map, monster_level, gold, items, character_name, api_key, version], function (err, result) {
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

const insertDrops = async function (item_name, kill_id) {
    return new Promise(function (resolve,reject) {
        if(!typeof item_name === "string"){
            reject();
            return;
        }
        if(!typeof kill_id === "number" || kill_id < 0){
            reject();
            return;
        }
        connection.query(st.insert.drops,[item_name, kill_id], function (err, result) {
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
        if(!typeof item_name === "string"){
           reject();
           return;
        }
        if(!typeof item_level === "number"){
            reject();
            return;
        }
        if(!typeof result === "string"){
            reject();
            return;
        }
        if(!typeof amount === "number"){
            reject();
            return;
        }
        if(!typeof api_key === "string" || api_key.length > 64){
            reject();
            return;
        }
        connection.query(st.insert.exchanges,[item_name, item_level, result, amount, api_key], function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    });
};

const createTables = fs.readFileSync(__dirname + '/mysql_queries/create.sql', 'utf-8');
if (settings.install) {
    connection.query(createTables);
}

const validKey = async function (key) {
    return new Promise(function (resolve, reject) {
        if(typeof key === "string" && key.length < 64)
            connection.query(st.get.api_key,[key], function (err, result) {
                if (err)
                    reject(err);
                resolve(result);
            });
        else
            reject("Invalid Input");
    });
};


/*
const updateDrop = async function (monster_name, item_name, map, level, seen) {
    return new Promise(function (resolve, reject) {
        monster_name = connection.escape(monster_name);
        item_name = connection.escape(item_name);
        map = connection.escape(map);
        if (!isFinite(seen))
            throw Error("Invalid value for seen");
        if (!isFinite(level))
            throw Error("Invalid value for level");
        connection.query("INSERT INTO drop_statistics (monster_name, item_name, map, level, seen) Values (" + monster_name + ", " + item_name + ", " + map + "," + level + ", " + seen + ") ON DUPLICATE KEY Update `seen` = `seen` + " + seen + ";", function (err, result) {
            if (err)
                reject(err);
            resolve(result);
        });
    });
};

const updateKill = async function (monster_name, character_name, map, level, kills, gold) {
    return new Promise(function (resolve, reject) {
        if (monster_name && character_name && map) {
            monster_name = connection.escape(monster_name);
            character_name = connection.escape(character_name);
            map = connection.escape(map);
            if (!isFinite(kills))
                reject("Invalid value for kills");
            if (!isFinite(gold))
                reject("Invalid value for gold");
            if (!isFinite(level))
                reject("Invalid value for level");
            connection.query("INSERT INTO character_statistics (character_name, monster_name, map, level, kills, total_gold ) Values (" + character_name + ", " + monster_name + ", " + map + ", " + level + ", " + kills + ", " + gold + ") ON DUPLICATE KEY Update `kills` = `kills` + " + kills + ", `total_gold` = `total_gold` + " + gold + ";", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject()
        }
    });
};

const updateUpgrade = async function (itemName, level, total, success) {
    return new Promise(function (resolve, reject) {
        if (itemName) {
            itemName = connection.escape(itemName);
            if (!isFinite(level) || level < 0)
                reject("Invalid value for level");
            if (!isFinite(total) || total < 0)
                reject("Invalid value for total");
            if (!isFinite(success) || success < 0)
                reject("Invalid value for success");
            connection.query("INSERT INTO upgrade_statistics (item_name, level, total, success) Values (" + itemName + ", " + level + ", " + total + ", " + success + ") ON DUPLICATE KEY Update `total` = `total` + " + total + ", `success` = `success` + " + success + ";", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject("")
        }

    });
};

const updateCompound = async function (itemName, level, total, success) {
    return new Promise(function (resolve, reject) {
        if (itemName) {
            itemName = connection.escape(itemName);
            if (!isFinite(level) || level < 0)
                reject("Invalid value for level");
            if (!isFinite(total) || total < 0)
                reject("Invalid value for total");
            if (!isFinite(success) || success < 0)
                reject("Invalid value for success");
            connection.query("INSERT INTO compound_statistics (item_name, level, total, success) Values (" + itemName + ", " + level + ", " + total + ", " + success + ") ON DUPLICATE KEY Update `total` = `total` + " + total + ", `success` = `success` + " + success + ";", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject("")
        }
    });
};

const updateExchange = async function (itemName, level, result, amount, seen) {
    return new Promise(function (resolve, reject) {
        if (itemName && result) {
            itemName = connection.escape(itemName);
            result = connection.escape(result);
            if (!isFinite(level) || level < 0)
                reject("Invalid value for level");
            if (!isFinite(amount) || amount < 0)
                reject("Invalid value for amount");
            if (!isFinite(seen) || seen < 0)
                reject("Invalid value for seen");
            connection.query("INSERT INTO exchange_statistics (item_name, level, result, amount, seen) Values (" + itemName + ", " + level + ", " + result + ", " + amount + ", " + seen + ") ON DUPLICATE KEY Update `seen` = `seen` + " + seen + ";", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject()
        }
    });
};

const addKey = async function (key, valid) {
    return new Promise(function (resolve, reject) {
        if (key && (valid === 0 || valid === 1)) {
            key = connection.escape(key);
            connection.query("INSERT INTO api_keys (api_key, valid) VALUES (" + key + ", " + valid + ");", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject()
        }
    });
};

const insertKill = async function (id, type, monster, map, gold, items, player, userkey, version, time) {
    return new Promise(function (resolve, reject) {
        if (type && monster && map && player && userkey) {
            type = connection.escape(type);
            monster = connection.escape(monster);
            map = connection.escape(map);
            player = connection.escape(player);
            userkey = connection.escape(userkey);
            if (!isFinite(id) || id < 0)
                reject("Invalid value for id");
            if (!isFinite(gold) || gold < 0)
                reject("Invalid value for gold");
            if (!isFinite(items) || items < 0)
                reject("Invalid value for items");
            if (!isFinite(id) || id < 0)
                reject("Invalid value for version");
            if (!isFinite(version) || version < 0)
                reject("Invalid value for id");
            if (!isFinite(time) || time < 0)
                reject("Invalid value for time");
            connection.query("INSERT INTO drops (id, type, monster, map, level, gold, items, player, userkey, version, time) VALUES (" + id + ", " + type + ", " + monster + ", " + map + ", 1, " + gold + ", " + items + ", " + player + ", " + userkey + ", " + version + ", from_unixtime(" + time + "));", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject()
        }
    });
};

const insertItemDrop = async function (id, itemName, dropID) {
    return new Promise(function (resolve, reject) {
        if (id && itemName && dropID) {
            itemName = connection.escape(itemName);
            if (!isFinite(id) || id < 0)
                reject("Invalid value for id");
            if (!isFinite(dropID) || dropID < 0)
                reject("Invalid value for drop_id");
            connection.query("INSERT INTO items (id, item_name, drop_id) VALUES (" + id + ", " + itemName + ", " + dropID + ");", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject()
        }
    });
};

const insertUpgrade = async function (id, itemName, level, scroll, offering, success, userkey, time) {
    return new Promise(function (resolve, reject) {
        if (id && itemName && scroll && userkey && time) {
            itemName = connection.escape(itemName);
            scroll = connection.escape(scroll);
            userkey = connection.escape(userkey);
            if (!isFinite(id) || id < 0)
                reject("Invalid value for id");
            if (!isFinite(level) || level < 0)
                reject("Invalid value for level");
            if (!isFinite(offering) || !(offering === 0 || offering === 1))
                reject("Invalid value for offering");
            if (!isFinite(success) || !(success === 0 || success === 1))
                reject("Invalid value for success");
            if (!isFinite(time) || time < 0)
                reject("Invalid value for time");
            connection.query("INSERT INTO upgrades (id, item_name, level, scroll, offering, success, userkey, time) VALUES (" + id + ", " + itemName + ", " + level + ", " + scroll + ", " + offering + ", " + success + ", " + userkey + ", from_unixtime(" + time + "));", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject()
        }
    });
};

const insertCompound = async function (itemName, level, scroll, offering, success, userkey, time) {
    return new Promise(function (resolve, reject) {

        if (!isFinite(id) || id < 0)
            reject("Invalid value for id");
        if (!isFinite(level) || level < 0)
            reject("Invalid value for level");
        if (!isFinite(offering) || !(offering === 0 || offering === 1))
            reject("Invalid value for offering");
        if (!isFinite(success) || !(success === 0 || success === 1))
            reject("Invalid value for success");
        if (!isFinite(time) || time < 0)
            reject("Invalid value for time");
        connection.query("INSERT INTO compounds (item_name, level, scroll, offering, success, userkey, time) VALUES (" + id + ", " + itemName + ", " + level + ", " + scroll + ", " + offering + ", " + success + ", " + userkey + ", from_unixtime(" + time + "));", function (err) {
            if (err)
                reject(err);
            resolve();
        });

    });
};

const insertExchange = async function (id, itemName, level, result, amount, userkey, time) {
    return new Promise(function (resolve, reject) {
        if (itemName && result) {
            itemName = connection.escape(itemName);
            result = connection.escape(result);
            userkey = connection.escape(userkey);
            if (!isFinite(id) || id < 0)
                reject("Invalid value for id");
            if (!isFinite(level) || level < 0)
                reject("Invalid value for level");
            if (!isFinite(amount) || amount < 0)
                reject("Invalid value for amount");
            connection.query("INSERT INTO exchanges (id, item_name, level, result, amount, userkey, time) VALUES ( " + id + ", " + itemName + ", " + level + ", " + result + ", " + amount + ", " + userkey + ", from_unixtime(" + time + "));", function (err) {
                if (err)
                    reject(err);
                resolve();
            });
        } else {
            reject()
        }
    });
};

const killsPage = async function (i) {
    return new Promise(function (resolve, reject) {
        if (!isFinite(i) || i < 0)
            reject("Invalid value for id");
        connection.query("SELECT monster, COUNT(*) AS kills, player, map, SUM(gold) AS gold FROM (SELECT * FROM drops WHERE id > " + 2500 * i + " AND id < " + 2500 * (i + 1) + ") GROUP BY monster, player, map;", function (err) {
            if (err)
                reject(err);
            resolve();
        });
    });
};

const getMonsterKills = async function (monsterName) {
    return new Promise(function (resolve, reject) {
        if (monsterName) {
            connection.query("SELECT character_name, kills FROM character_statistics WHERE monster_name = " + mysql.escape(monsterName) + " ORDER BY kills DESC;", function (err, result) {
                if (err)
                    reject(err);
                var res = [];
                for (let row of result) {
                    let tmp = {}
                    for (let key in row)
                        tmp[key] = row[key];
                    res.push(tmp)
                }
                resolve(res);
            });
        } else
            reject("asdasd");
    });
};
*/
module.exports = {
    insertKills: insertKills,
    insertDrops:insertDrops,
    insertExchange:insertExchange,
    validKey: validKey,
    connection: connection,
}
