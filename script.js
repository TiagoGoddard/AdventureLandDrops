// This files contains that latest working version of all other collection script.
// Currently still manually maintained

//To use this create save the code under "loot" and import it in your main code with load_code("loot")

var dropServer = "https://drop.adventurecode.club";
var apiKey = "YOUR_API_KEY";
//^^ Adjust this to your own api key
//If you don't already have on request one from me on discord. @NexusNull#6364


var upgrade_data = [];

var old_upgrade = upgrade;
var inv = {};
var lockTable = {};
var inventory = character.items;

var InventoryWatcher = {
    listener: {
        changed: [],
        removed: [],
        received: [],
    },
};

InventoryWatcher.registerListener = function (event, callback) {
    this.listener[event].push(callback);
};

InventoryWatcher.removeListener = function (event, callback) {
    for (let i = 0; i < this.listener[event].length; i++) {
        if (this.listener[event][i] == callback) {
            this.listener[event].splice(i, 1);
        }
    }
};

function playerListener(player) {
    let items = player.items;
    //Detect changes
    for (var i = 0; i < items.length; i++) {
        if (items[i] && inventory[i]) {
            var keys = Object.keys(items[i]).concat(Object.keys(inventory[i]));
            var change = false;
            for (let key of keys) {
                if (items[i][key] != inventory[i][key]) {
                    change = true;
                    break;
                }
            }
            if (change) {
                for (let callback of InventoryWatcher.listener.changed)
                    callback(i, inventory[i], items[i]);
            }
        } else if (!items[i] && inventory[i]) {
            //Removed an item
            for (let callback of InventoryWatcher.listener.removed)
                callback(i, inventory[i]);
        } else if (items[i] && !inventory[i]) {
            //Received an item
            for (let callback of InventoryWatcher.listener.received)
                callback(i, items[i]);
        }
    }
    inventory = player.items;
}


inv.upgrade = async function (item_index, scroll_index, offering_index) {
    return new Promise(function (resolve, reject) {
        if (character.items[item_index] && G.items[character.items[item_index].name].upgrade) {
            if (!lockTable[item_index]) {
                lockTable[item_index] = true;
                var iteM = character.items[item_index];
                var scroll = character.items[scroll_index];
                var offering = !!character.items[offering_index];

                console.log("lock:" + item_index);
                var listener = {
                    changeListener : function (itemNum, item) {
                        if (item_index == itemNum) {
                            lockTable[item_index] = false;
                            InventoryWatcher.removeListener("changed", listener.changeListener);
                            InventoryWatcher.removeListener("removed", listener.removedListener);
                            upgrade_data.push({
                                item: iteM,
                                scroll: scroll,
                                offering: offering,
                                success: true,
                            });
                        }
                    },
                    removedListener : function (itemNum, item) {
                        if (item_index == itemNum) {
                            lockTable[item_index] = false;
                            InventoryWatcher.removeListener("removed", listener.removedListener);
                            InventoryWatcher.removeListener("changed", listener.changeListener);
                            upgrade_data.push({
                                item: iteM,
                                scroll: scroll,
                                offering: offering,
                                success: false,
                            })
                        }
                    }
                }


                InventoryWatcher.registerListener("changed", listener.changeListener);
                InventoryWatcher.registerListener("removed", listener.removedListener);
                old_upgrade(item_index, scroll_index, offering_index);
            } else {
                reject("Item is locked");
            }
        } else {
            reject("Item is not upgradeable");
        }
    });
};

if (!parent.upgradeData) {
    parent.upgradeData = {};
}


function new_upgrade(item_index, scroll_index, offering_index) {
    inv.upgrade(item_index, scroll_index, offering_index);
}

upgrade = new_upgrade;

setInterval(function () {
    let request = new XMLHttpRequest();
    request.open("POST", dropServer + "/upgrade");
    var data = {
        apiKey: apiKey,
        upgrades: upgrade_data,
    }
    upgrade_data = [];
    request.send(JSON.stringify(data));
}, 1000*30);

parent.socket.on("player", playerListener);
on_destroy = function () {
    parent.removeEventListener("player", playerListener);
    let request = new XMLHttpRequest();
    request.open("POST", dropServer + "/upgrade",false);
    var data = {
        apiKey: apiKey,
        upgrades: upgrade_data,
    }
    upgrade_data = [];
    request.send(JSON.stringify(data));
};
