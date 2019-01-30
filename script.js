var dropServer = "https://drop.adventurecode.club";
var apiKey = "YOUR_API_KEY";
//^^ Adjust this to your own api key
//If you don't already have on request one from me on discord. @NexusNull#6364


var upgrade_data = [];
var compound_data = [];

var old_compound = compound;
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

function calculate_grade(item) {
    if(!item || !item.name || !G.items[item.name]){
        return 0;
    } else{
        var b = G.items[item.name];
    }
    if (!(b.upgrade || b.compound)) {
        return 0
    }
    if ((item && item.level || 0) >= (b.grades || [11, 12])[1]) {
        return 2
    }
    if ((item && item.level || 0) >= (b.grades || [11, 12])[0]) {
        return 1
    }
    return 0
}

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

inv.compound = async function (item0, item1, item2, scroll_num, offering_num) {
    return new Promise(function (resolve, reject) {
        if(!character.items[item0] || !character.items[item1] || !character.items[item2]){
            reject("Not all items are present");
            return;
        }
        if(!G.items[character.items[item0].name].compound){
            reject("Item not compoundable");
            return;
        }
        if(!(character.items[item0].name === character.items[item1].name && character.items[item1].name === character.items[item2].name)){
            reject("Items aren't equal");
            return;
        }
        if(!(character.items[item0].level === character.items[item1].level && character.items[item1].level === character.items[item2].level)){
            reject("Item level different");
            return;
        }
        if(!(character.items[scroll_num] &&
                character.items[scroll_num].name &&
                character.items[scroll_num].name.startsWith("cscroll") &&
                calculate_grade(character.items[item0]) <= (+character.items[scroll_num].name.replace("cscroll","")))){
            reject("Invalid Scroll");
            return;
        }
        if(character.items[offering_num] && character.items[offering_num].name === "offering"){
            var offering = true;
        } else {
            offering = false;
        }

        console.log("passed all tests");
        if (!lockTable[item0] && !lockTable[item1] && !lockTable[item2]) {
            var itemM = character.items[item0];
            var scroll = character.items[scroll_num];

            lockTable[item0] = true;
            lockTable[item1] = true;
            lockTable[item2] = true;

            var listener = {
                changeListener: function (itemNum, item) {
                    if (item0 == itemNum) {
                        lockTable[item0] = false;
                        lockTable[item1] = false;
                        lockTable[item2] = false;
                        InventoryWatcher.removeListener("changed", listener.changeListener);
                        InventoryWatcher.removeListener("removed", listener.removedListener);
                        var data = {
                            item: itemM,
                            scroll: scroll,
                            offering: offering,
                            success: true,
                        };
                        compound_data.push(data);
                        resolve(data)
                    }
                },
                removedListener: function (itemNum, item) {
                    if (item0 == itemNum) {
                        lockTable[item0] = false;
                        lockTable[item1] = false;
                        lockTable[item2] = false;
                        InventoryWatcher.removeListener("removed", listener.removedListener);
                        InventoryWatcher.removeListener("changed", listener.changeListener);
                        var data = {
                            item: itemM,
                            scroll: scroll,
                            offering: offering,
                            success: false,
                        };
                        compound_data.push(data);
                        resolve(data);
                    }
                }
            };
            InventoryWatcher.registerListener("changed", listener.changeListener);
            InventoryWatcher.registerListener("removed", listener.removedListener);
            old_compound(item0, item1, item2, scroll_num, offering_num);
        } else {
            console.log("items are locked")
        }
    });
};
parent.inv = inv;
if (!parent.upgradeData) {
    parent.upgradeData = {};
}


upgrade = function(item_index, scroll_index, offering_index) {
    inv.upgrade(item_index, scroll_index, offering_index);
};
compound = function(item0, item1, item2, scroll_num, offering_num) {
    inv.compound(item0, item1, item2, scroll_num, offering_num);
};


setInterval(function () {
    let request = new XMLHttpRequest();
    request.open("POST", dropServer + "/");
    var data = {
        apiKey: apiKey,
        upgrades: upgrade_data,
        compounds: compound_data,
    }
    upgrade_data = [];
    compound_data = [];
    request.send(JSON.stringify(data));
}, 1000 * 30);

parent.socket.on("player", playerListener);
on_destroy = function () {
    parent.removeEventListener("player", playerListener);
    let request = new XMLHttpRequest();
    request.open("POST", dropServer + "/", false);
    var data = {
        apiKey: apiKey,
        upgrades: upgrade_data,
        compounds: compound_data,
    }
    upgrade_data = [];
    compound_data = [];
    request.send(JSON.stringify(data));
};