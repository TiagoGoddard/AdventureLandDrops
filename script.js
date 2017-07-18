/* eslint indent: 0 */
(function() {
let DROP_SERVER = 'http://adventurecode.club:13726';
let DROP_SERVER2 = window.aldc_second_server;
let TRACKING_TIMEOUT = 5000;
let DROP_TIMEOUT = 500;
let API_KEY = window.aldc_apikey; // REPLACE THIS WITH YOUR API KEY => Ask me for one, on discord, PM or email
let SCRIPT_VERSION = 4;

window.aldc_script_version = SCRIPT_VERSION;

let last_error_time = 0;
let tracked_entities = [];
let dead_entities = {};
let tracked_chests = {};
let tracked_drops = null;

clone_function = function(afunction) {
    var that = afunction;
    var temp = function temporary() { return that.apply(afunction, arguments); };
    for(var key in afunction) {
        if (afunction.hasOwnProperty(key)) {
            temp[key] = afunction[key];
        }
    }
    return temp;
};

if (parent.prev_handlers) {
    for (let [event, handler] of parent.prev_handlers) {
        parent.socket.removeListener(event, handler);
    }
}

parent.prev_handlers = [];

var callback_on_disappear = clone_function(on_disappear);
	
on_disappear = function(entity, data) {
    //Add deaths as a monster disappear
    if(data.death) {
	    dead_entities[entity.id] = entity;
    }

    callback_on_disappear(entity, data);
}

function register_handler(event, handler) {
    parent.prev_handlers.push([event, handler]);
    parent.socket.on(event, handler);
}

// death -> log "xx killed yy" -> drop

function death_handler(data) {
    if(!parent) return;
    let entity = parent.entities[data.id];
    if (!entity) {
      entity = dead_entities[data.id];
      if (!entity) {
        return;
      } else {
        delete dead_entities[data.id];
      }
    }

    let entity_data = {
        x: entity.real_x,
        y: entity.real_y,
        type: entity.mtype,
        seen: Date.now(),
        ours: false
    };

    tracked_entities.push(entity_data);

    setTimeout(() => {
        let index = tracked_entities.indexOf(entity_data);
        if (index != -1) {
            tracked_entities.splice(index, 1);
        }
    }, TRACKING_TIMEOUT);
}

function drop_handler(drop) {
    if(!parent) return;
    let min_distance = Infinity;
    let best_entity = null;

    for (let entity of tracked_entities) {
        let dist = parent.simple_distance(drop, entity);
        if (dist < min_distance) {
            best_entity = entity;
            min_distance = dist;
        }
    }

    if (min_distance > 8 || !best_entity.ours) return;

    let index = tracked_entities.indexOf(best_entity);
    tracked_entities.splice(index, 1);

    let chest_data = {
        type: drop.chest,
        items: drop.items,
        monster: best_entity.type,
        map: parent.current_map,
    };

    tracked_chests[drop.id] = chest_data;

    setTimeout(() => {
        if (drop.id in tracked_chests) {
            delete tracked_chests[drop.id];
        }
    }, TRACKING_TIMEOUT);
}

let LOG_KILL_REGEX = /(\w*) killed /; // If monster name needed:  /^(\w*) killed (?:an? )?(\w*)$/;
let LOG_GOLD_REGEX = /^(\d+) gold$/;
let LOG_ITEM_REGEX = /(\w*)\s*[Ff]ound an? (.*)$/;
function log_handler(log) {
    if(!parent) return;
    if (typeof log == "string") {
        determineResponsibility(log);
    }

    if (!tracked_drops || tracked_drops.finished || tracked_drops.time + DROP_TIMEOUT < Date.now()) {
        tracked_drops = { gold: 0, items: [], time: Date.now(), finished: false };
    }

    if (log.color == 'gold') {
        let gold_info = LOG_GOLD_REGEX.exec(log.message);
        if (!gold_info) return;

        let gold = Number(gold_info[1]);
        tracked_drops.gold = (gold / character.goldm) * (character.party ? parent.party_list.length : 1);
        tracked_drops.finished = true;
    } else if (log.color == '#4BAEAA') {
        let drop_info = LOG_ITEM_REGEX.exec(log.message);
        if (!drop_info) return;
        console.info("%cDROPTRAK: " + drop_info[1] + " found " + drop_info[2], 'color: green');
        tracked_drops.items.push(drop_info[2]);
    }
}

function determineResponsibility(logMessage) {
    let kill_info = LOG_KILL_REGEX.exec(logMessage);
    if(kill_info) {
        let now = Date.now();
        let ours = kill_info[1] == character.name || logMessage.startsWith("You killed ");
        if(ours)                {
            for(let entity_data of tracked_entities) {
                if(Math.abs(now - entity_data.seen) < 10) {
                    entity_data.ours = true;
                }
            }
        }
    }
}

var data_package = { key: API_KEY, version: SCRIPT_VERSION, data : []};
var data_lastsend = 0;

function chest_handler(chest) {
    if(!parent) return;
    if (!tracked_drops || tracked_drops.time + DROP_TIMEOUT < Date.now()) {
        tracked_drops = null;
        return;
    }

    if (!tracked_drops.finished) return;

    let chest_data = tracked_chests[chest.id];
    if (!chest_data) return;

    if (tracked_drops.items.length != chest_data.items) {
        tracked_drops = null;
        return;
    }

    let payload = {
        player: character.name,
        members: (character.party ? parent.party_list.length : 1),
        type: chest_data.type,
        monster: chest_data.monster,
        map: chest_data.map,
        gold: tracked_drops.gold,
        items: tracked_drops.items
    };
    data_package.data.push(payload);

    if(tracked_drops.items.length) {
        console.info(`%cReporting kill of ${chest_data.monster} by ${character.name} for ${Math.round(tracked_drops.gold)} and [${tracked_drops.items}] items (v${SCRIPT_VERSION})`, 'color: green');
    }

    let seconds_since_last_error = (Date.now() - last_error_time / 1000);
    if(seconds_since_last_error < 15) {
        console.debug("Drop data sending paused due to error that occured " + Math.round(seconds_since_last_error) + " seconds ago");
    }
    else {
        sendIfReady();
    }

    tracked_drops = null;
}

function sendIfReady() {
		if(parent.server_identifier === "HARDCORE") {
			//Do Nothing
		} else {
			//send at 10 entries or if its been more than 10 seconds since data_lastsend
			if(data_package.length > 10 || Date.now() - data_lastsend > 10000) {
					data_lastsend = Date.now();

					let data = new FormData();
					data.append('json', JSON.stringify(data_package));

					fetch(`${DROP_SERVER}/drop`, {
							method: 'POST',
							body: data
					})
					.then((response) => handleDropServerResponse(response))
					.catch(() => {});

					if(DROP_SERVER2) {
							fetch(`${DROP_SERVER2}/drop`, {
									method: 'POST',
									body: data
							})
							.then((response) => handleDropServerResponse(response))
							.catch(() => {});
					}

					data_package.data = [];
			}
		}
}

function handleDropServerResponse(response) {
    if(response.status == 403) { //api key
        console.error("DROP DATA COLLECTION : The API key provided is not recognized.");
        parent.ui_error("DROP DATA COLLECTION : The API key provided is not recognized.");
        last_error_time = Date.now();
    }
    else if(response.status == 426) { // upgrade
        console.error("DROP DATA COLLECTION : There is a newer version of the script available, reload the external script!");
        parent.ui_error("DROP DATA COLLECTION : There is a newer version of the script available, reload the external script!");
        last_error_time = Date.now();
    }
}

register_handler('death', death_handler);
register_handler('drop', drop_handler);
register_handler('game_log', log_handler);
register_handler('chest_opened', chest_handler);

//load extra features
let scriptLoad = new FormData();
scriptLoad.append('json', JSON.stringify({ key: data_package.key, version: data_package.version }));
fetch(`${DROP_SERVER2}/apic`, {
    method: 'POST',
    body: scriptLoad
})
.then((res) =>  {
    if(res.ok) {
        if(window.aldc_use_upgrade) {
            $.ajax({
                url: 'http://adventurecode.club/upgradescript?t='+(new Date).getTime(),
                dataType: 'script',
                success: () => game_log('Thank you for contributing your upgrade data!', '#FFFF00'),
                async: false
            });
        }
        if(window.aldc_use_compound) {
            $.ajax({
                url: 'http://adventurecode.club/compoundscript?t='+(new Date).getTime(),
                dataType: 'script',
                success: () => game_log('Thank you for contributing your compound data!', '#FFFF00'),
                async: false
            });
        }
        if(window.aldc_use_exchange) {
            $.ajax({
                url: 'http://adventurecode.club/exchangescript?t='+(new Date).getTime(),
                dataType: 'script',
                success: () => game_log('Thank you for contributing your exchange data!', '#FFFF00'),
                async: false
            });
        }
        if(window.aldc_use_market) {
            $.ajax({
                url: 'http://adventurecode.club/marketscript?t='+(new Date).getTime(),
                dataType: 'script',
                success: () => game_log('Thank you for contributing your market data!', '#FFFF00'),
                async: false
            });
        }
    } else {
        console.error("Invalid API key") ;
    }
});
}());