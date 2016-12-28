parent.compoundit = (function() {
    let COLLECTION_SERVER = 'http://adventurecode.club:13726';
    let COLLECTION_SERVER2 = window.aldc_second_server;
    let API_KEY = window.aldc_apikey;

    parent.waiting_for_log = false;
    var startitem;

    function compound(name, level) {
        if(parent.waiting_for_log) {
            console.log("Waiting for log... (parent.waiting_for_log == true)");
        }
        let [slots,items] = find_all_items_namelevel(name, level);
        if(slots.length >= 3) {
            console.info("%cAUTOUPGRADE: Found " + slots.length + " of " + name + " of level " + level, "color : dimgray");
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

        let [scroll_slot, scroll] = find_item(i => i.name == "cscroll0");
        if(!scroll) {
            console.log(`Buying 1 cscroll0`);
            parent.buy("cscroll0", 1);
            setTimeout(function() { compoundItems(slots); }, 500);
            return;
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
                console.info(`%cAUTOUPGRADE: Upgraded ${startitem.name} to +${startitem.level} successfully!`, 'color: green');
                startitem = undefined;
            }
            else {
                console.log("Log handler still present but startitem undefined?");
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
                console.info(`%cAUTOUPGRADE: Item upgrade of ${startitem.name} failed going from +${startitem.level} to +${startitem.level + 1}`, 'color: red');
                startitem = undefined;
            }
            else {
                console.log("Log handler still present but startitem undefined?");
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

        let data = new parent.FormData();
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

    parent.ui_success("Loaded. Use the compound script with parent.compoundit");
    return compound;
}());
