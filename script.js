var dropServer = "http://localhost:25326";
var apiKey = "t4seta6e7asetas3";
//Put your api key here, if you don't have one yet request it from me on discord.
//

var drops = {};
var last_death;
var last_drop;

var last_gold;
var last_opened;
var last_items;

//Clean out an pre-existing listeners
if (parent.prev_handlersgoldmeter) {
    for (let [event, handler] of parent.prev_handlersgoldmeter) {
        parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlersgoldmeter = [];

//handler pattern shamelessly stolen from JourneyOver
function register_goldmeterhandler(event, handler) {
    parent.prev_handlersgoldmeter.push([event, handler]);
    parent.socket.on(event, handler);
};


setTimeout(function () {
    console.log("Initializing Drop Tracking");
    on_disappear = (function () {

        var cached_function = on_disappear;

        return function (entity, event) {
            cached_function.apply(this, arguments); // use .apply() to call it
            if (entity && entity.type == "monster" && event.death) {
                last_death = {type: entity.mtype, id: entity.id, map: entity.in, level: entity.level, time: new Date()};

                if (last_drop && Math.abs(last_drop.time - last_death.time) <= 1) {
                    link_drop();
                }
            }
        };
    })();
}, 1000);

function on_disappear(entity, event) {
    if (entity && entity.type == "monster" && event.death) {
        last_death = {type: entity.mtype, id: entity.id, map: entity.in, level: entity.level, time: new Date()};

        if (last_drop && Math.abs(last_drop.time - last_death.time) <= 1) {
            link_drop();
        }
    }
}

function drop_handler(event) {
    last_drop = {id: event.id, time: new Date()}

    if (last_death && Math.abs(last_death.time - last_drop.time) <= 1) {
        link_drop();
    }
}

//Item and Gold Received
var goldSuffix = " gold";
var personalPrefix = "Found";
var groupPrefix = character.id + " found";

function log_handler(event) {
    if (event.message) {
        if (event.message.includes(goldSuffix)) {
            var gold = parseInt(event.message.replace(goldSuffix, "").replace(",", ""));
            last_gold = {gold: gold, time: new Date()};

            if (last_opened && Math.abs(last_opened.time - last_gold.time) <= 1) {
                link_gold();
            }
        }
        else if (event.message.includes(personalPrefix) || event.message.includes(groupPrefix)) {
            var item = event.message.replace(personalPrefix, "").replace(groupPrefix, "").replace(" a ", "").replace(" an ", "");

            if (last_opened && Math.abs(last_opened.time - new Date()) <= 1) {
                console.log("Chest Opened: " + Math.abs(last_opened.time - new Date()));
                link_item(item);
            }
            else {
                if (!last_items) {
                    last_items = [];
                }

                last_items.push({item: item, time: new Date()});
            }

        }
    }
}

//Track whenever a chest is opened
function open_handler(event) {
    last_opened = {id: event.id, time: new Date()};
    console.log(event);
    if (last_gold && Math.abs(last_opened.time - last_gold.time) <= 1) {
        link_gold();
    }

    if (last_items) {
        link_last_items();
    }
}

function link_last_items() {
    if (drops[last_opened.id]) {
        for (id in last_items) {
            var last_item = last_items[id];
            console.log("Existing items: " + Math.abs(last_opened.time - last_item.time));
            if (Math.abs(last_opened.time - last_item.time) <= 1) {
                drops[last_opened.id].items.push(last_item.item);
                console.log("Added " + last_item.item + " to " + drops[last_opened.id].type);
            }
        }
    }
    last_items = null;
}

function link_item(item) {
    if (drops[last_opened.id]) {
        drops[last_opened.id].items.push(item);
        console.log("Added " + item.item + " to " + drops[last_opened.id].type);
    }
}

function link_gold() {
    if (drops[last_opened.id]) {
        drops[last_opened.id].gold = last_gold.gold;

        if (drops.items) {
            last_opened = null;
            last_gold = null;
        }
    }
    console.log(drops);
}

function link_drop() {
    var linked_drop = {
        chest: last_drop.id,
        type: last_death.type,
        id: last_death.id,
        map: last_death.map,
        gold: 0,
        items: []
    };
    drops[last_drop.id] = linked_drop;
    console.log(last_death.type);
    last_drop = null;
    last_death = null;
}

register_goldmeterhandler("drop", drop_handler);
register_goldmeterhandler("game_log", log_handler);
register_goldmeterhandler("chest_opened", open_handler);

setInterval(function () {
    let request = new XMLHttpRequest();
    request.open("POST",dropServer+"/kill");
    var data = {
        apiKey: apiKey,
        kills: drops,
    }
    request.send(JSON.stringify(data));
    drops = {};
}, 1000 * 30);
