parent.compoundit = (function() {
    let COLLECTION_SERVER = 'http://localhost:25326';
    let COLLECTION_SERVER2 = window.aldc_second_server;
    let API_KEY = window.aldc_apikey;

    parent.waiting_for_log = false;
    var startitem;

    function compound(name, level) {
        if(!parent) {
            console.error("Unable to get parent object") ;
            return;
        }
        if(parent.waiting_for_log) {
            console.log("Waiting for log... (parent.waiting_for_log == true)");
        }
        if(API_KEY.length < 15) {
            console.error("Invalid API key") ;
            return;
        }
        let [slots,items] = find_all_items_namelevel(name, level);
        if(slots.length >= 3) {
            compoundItems(slots);
        }
    }

    function compoundItems(slots) {
        parent.waiting_for_log = true;
        let item = character.items[slots[0]];
        startitem = {
            name : item.name,
            type : "accss",
            slot : slots[0],
            level: item.level,
        };

        let item_base = G.items[item.name];
        let scroll_type = item_base.grades[0] <= item.level
            ? item_base.grades[1] <= item.level
                ? "cscroll2"
                : "cscroll1"
            : "cscroll0";

        let [scroll_slot, scroll] = find_item(i => i.name == scroll_type);
        if(!scroll) {
            if(parent.character.gold >= G.items[scroll_type].g && !G.maps[parent.current_map].mount) {
                parent.buy(scroll_type, 1);
                setTimeout(function() { compoundItems(slots); }, 500);
                return;
            }
            else {
                parent.ui_log("Can't buy a compounding scroll.");
            }
        }

        parent.socket.on('game_log', success_listener);
        parent.socket.on('game_error', failure_listener);

        parent.socket.emit("compound", {
            items: slots,
            scroll_num: scroll_slot,
            offering_num: -1,
            clevel: (startitem.level || 0)
        });
    }

    let success_listener = (data) => {
        if(!parent) return;
        if (data &&
            (data.message == 'Item upgrade succeeded' || data.message == 'Item combination succeeded')) {
            if(startitem) {
                report_result('success');
                startitem.level++;
                console.info(`%cCOMPOUNDER: Upgraded ${startitem.name} to +${startitem.level} successfully!`, 'color: green');
                startitem = undefined;
            }
            else {
                console.error("Log handler still present but startitem undefined?");
            }
            parent.socket.removeListener("game_log", success_listener);
            parent.socket.removeListener("game_error", failure_listener);
            parent.waiting_for_log = false;
        }
    };

    let failure_listener = (data) => {
        if (data == 'Item upgrade failed' || data == 'Item combination failed') {
            if(startitem) {
                report_result('failed');
                console.info(`%cCOMPOUNDER: Item upgrade of ${startitem.name} failed going from +${startitem.level} to +${startitem.level + 1}`, 'color: red');
                startitem = undefined;
            }
            else {
                console.error("Log handler still present but startitem undefined?");
            }
            parent.socket.removeListener("game_log", success_listener);
            parent.socket.removeListener("game_error", failure_listener);
            parent.waiting_for_log = false;
        }
    };

    function report_result(outcome) {
        let payload = {
            item: startitem.name,
            level: startitem.level,
            success : outcome == 'success' ? 1 : 0,
            key : API_KEY
        };

        let data = new FormData();
        data.append('json', JSON.stringify(payload));
        let content = {
            method: 'POST',
            body: data
        };

        fetch(`${COLLECTION_SERVER}/compound`, content).catch(() => {});

        if(COLLECTION_SERVER2) {
            fetch(`${COLLECTION_SERVER2}/compound`, content).catch(() => {});
        }
    }

    function find_item(filter) {
        for(let i = 0; i < character.items.length; i++) {
            let item = character.items[i];
            if (item && filter(item))
                return [i, character.items[i]];
        }
        return [];
    }

    function find_all_items_namelevel(name, level) {
        console.log(`Finding all ${name}+${level}`);
        let items = [], item_slots = [];
        for(let i = 0; i < character.items.length; i++) {// foreach item
            let item = character.items[i];//get it
            if (item && item.name == name && item.level == level) {//same name and level?
                item_slots.push(i);  // push it!
                items.push(character.items[i]);
            }
        }

        return [item_slots, items];
    }

    parent.ui_success("Use the compound script with parent.compoundit(item_name, level_to_compound)");
    return compound;
}());
