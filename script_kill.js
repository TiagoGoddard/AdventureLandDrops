var dropServer = "http://localhost:25326";
var apiKey = "t4seta6e7asetas3";
//Put your api key here, if you don't have one yet request it from me on discord.
//

var drops = {};
var last_deaths = [];
var last_drops = [];

var last_gold;
var last_opened;
var last_items;

//Clean out an pre-existing listeners
if (parent.prev_handlers_drop_logging) {
    for (let [event, handler] of parent.prev_handlers_drop_logging) {
        parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlers_drop_logging = [];

//handler pattern shamelessly stolen from JourneyOver
function register_drop_logging_handler(event, handler) {
    parent.prev_handlers_drop_logging.push([event, handler]);
    parent.socket.on(event, handler);
};


setTimeout(function () {
    console.log("Initializing Drop Tracking");
    on_disappear = (function () {

        var cached_function = on_disappear;

        return function (entity, event) {
            cached_function.apply(this, arguments); // use .apply() to call it
            if (entity && entity.type == "monster" && event.death) {
                var last_death = {
                    type: entity.mtype,
                    level: entity.level,
                    id: entity.id,
                    map: entity.in,
                    level: entity.level,
                    x: entity.real_x,
                    y: entity.real_y,
                    time: new Date()
                };
                last_deaths.push(last_death);
                var drop = find_matching_drop(last_death)
                if (drop) {
                    link_drop_death(last_death, drop);
                }
            }
        };
    })();
}, 1000);

function drop_handler(event) {
    var chest = parent.chests[event.id];
    var last_drop = {id: event.id, x: event.x, y: event.y, map: event.map, time: new Date()}
    last_drops.push(last_drop);
    var death = find_matching_death(last_drop);
    if (death) {
        link_drop_death(death, last_drop);
    }
}

function find_matching_death(drop) {
    var match = last_deaths.filter(d => drop.time - d.time <= 1 && drop.map == d.map && parent.simple_distance(drop, d) <= 10)[0];
    return match;
}

function find_matching_drop(death) {
    var match = last_drops.filter(d => death.time - d.time <= 1 && death.map == d.map && parent.simple_distance(death, d) <= 10)[0];
    return match;
}

function cleanup_drops() {
    for (var i = last_drops.length - 1; i >= 0; i--) {
        var drop = last_drops[i];

        if (new Date() - drop.time > 100) {
            last_drops.splice(i, 1);
        }
    }
};

function cleanup_deaths() {
    for (var i = last_deaths.length - 1; i >= 0; i--) {
        var death = last_deaths[i];

        if (new Date() - death.time > 100) {
            last_deaths.splice(i, 1);
        }
    }
};

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
    if (drops[last_opened.id]) {
        drops[last_opened.id].opened = true;
    }

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
                if (drops[last_opened.id].items == null) {
                    drops[last_opened.id].items = [];
                }
                drops[last_opened.id].items.push(last_item.item);
                console.log("Added " + last_item.item + " to " + drops[last_opened.id].type);
            }
        }
    }
    last_items = null;
}

function link_item(item) {
    if (drops[last_opened.id]) {
        if (drops[last_opened.id].items == null) {
            drops[last_opened.id].items = [];
        }
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
}

function link_drop_death(death, drop) {
    var linked_drop = {
        chest: drop.id,
        type: death.type,
        id: death.id,
        level: death.level,
        map: death.map,
        x: death.x,
        y: death.y,
        gold: null,
        items: null,
        opened: false
    };
    drops[drop.id] = linked_drop;
    cleanup_drops();
    cleanup_deaths();
}


register_drop_logging_handler("drop", drop_handler);
register_drop_logging_handler("game_log", log_handler);
register_drop_logging_handler("chest_opened", open_handler);

function get_opened_drops() {
    var opened = [];

    for (var id in drops) {
        var drop = drops[id];
        if (drop.opened) {
            opened.push(drop);
        }
        delete drops[id];
    }
    return opened;
}

setInterval(function () {
    let request = new XMLHttpRequest();
    request.open("POST", dropServer + "/kill");

    var opened = get_opened_drops();
    if (opened.length > 0) {
        console.log("Reporting Drops", opened);
        var data = {
            apiKey: apiKey,
            name:character.name,
            kills: opened,
        }
        request.send(JSON.stringify(data));
    }
}, 1000 * 30);