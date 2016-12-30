parent.exchangeit = (function() {
    let COLLECTION_SERVER = 'http://adventurecode.club:13726';
    let COLLECTION_SERVER2 = window.aldc_second_server;
    let API_KEY = window.aldc_apikey;

    parent.waiting_for_log = false;
    var startitem, oldinventory = {};

    function exchange(slot) {
        if(!parent) {
            console.error("Unable to get parent object") ;
            return;
        }
        if(Object.values(parent.socket.listeners("game_log")).filter(l => l.name == "exchange_listener").length) {
            console.error("Can't exchange yet, there are still exchange listeners present. If this persists, refresh the web page.");
            return;
        }
        if(parent.waiting_for_log) {
            console.log("Waiting for log... (parent.waiting_for_log == true). If this persists, refresh the web page.");
            return;
        }
        startitem = character.items[slot];
        let baseitem = parent.G.items[startitem.name];
        if(!startitem) {
            console.error("EXCHANGER: Nothing found at slot " + slot);
        }
        else if(!baseitem.s || baseitem.e > startitem.q) {
            console.error(`EXCHANGER: You can't exchange ${startitem.q}x${baseitem.name}`);
        }
        else {
            oldinventory = {};
            Object.assign(oldinventory, parent.character.items);
            parent.waiting_for_log = true;
            parent.socket.on('game_log', exchange_listener);
            parent.socket.emit("exchange", {
                item_num: slot,
                q: startitem.q
            });
            setTimeout(() => {
                parent.socket.removeListener("game_log", exchange_listener);
            }, 500);
        }
    }

    // <div class="gameentry" style="color: #85C76B">Received an Eggnog</div>
    // <div class="gameentry" style="color: #85C76B">Received 8x Compound Scroll</div>
    // <div class="gameentry" style="color: #85C76B">Received a Xmas Shoes</div>
    // <div class="gameentry" style="color: gold">Received 200,000 gold</div>

    let MESSAGE_REGEX = /Received (?:an? )?(.*)/;
    let AMOUNT_REGEX = /(\d+)x (.*)/;
    let GOLD_REGEX = /([\d,]+) gold/;

    let exchange_listener = (data) => {
        if(!parent) return;
        if (data.message.startsWith("Received")) {
            let result_data = { source : startitem.name };
            let result_info = MESSAGE_REGEX.exec(data.message);
            // gives:
            //  ["Received a Xmas Shoes",        "Xmas Shoes"]
            //  ["Received 650,000 gold",        "650,000 gold"]
            //  ["Received 8x Compound Scrolls", "8x Compound Scrolls"]
            let obtained_name = result_info[1];  //    ^^^^^

            let amount = AMOUNT_REGEX.exec(obtained_name);
            let gold = GOLD_REGEX.exec(obtained_name);
            if(gold) {
                // ["650,000 gold", "650,000"]
                result_data.result = "gold";
                result_data.amount = gold[1].replace(/,/g, "");
            }
            else if(amount) {
                // ["8x Compound Scrolls", "8", "Compound Scrolls"]
                //result_data.itemname = amount[2];
                obtained_name = amount[2];
                result_data.amount = amount[1];
                setTimeout(() => {
                    result_data.result = find_itemkey_from_inventorydiff(obtained_name, amount[1]);
                    finish(result_data);
                }, 500);
                return;
            }
            else {
                // ["Received a Xmas Shoes", "Xmas Shoes"]
                // "Xmas Shoes"
                //result_data.itemname = obtained_name;
                result_data.result = find_itemkey_from_itemname(obtained_name);
                result_data.amount = 1;
            }
            console.log(result_info);
            console.log(" = ");
            console.log(obtained_name);
            console.log(" = ");
            console.log(result_data);

            finish(result_data);
        }
    };

    function finish(result_data) {
        if(startitem) {
            report_result(result_data);
            console.info(`%cEXCHANGER: Exchanged ${startitem.name} for a ${result_data.result}!`, 'color: green');
            startitem = undefined;
        }
        else {
            console.log("Log handler still present but startitem undefined?");
        }
        parent.socket.removeListener("game_log", exchange_listener);
        parent.waiting_for_log = false;
    }

    function find_itemkey_from_itemname(itemname) {
        return Object.keys(parent.G.items).find(key => parent.G.items[key].name == itemname);
    }

    function find_itemkey_from_inventorydiff(itemname, amount) {
        for(let slot in parent.character.items) {
            let invitem = parent.character.items[slot];
            if(invitem && parent.G.items[invitem.name].name == itemname) {
                if(
                    (!oldinventory[slot] && invitem.q == amount) || // if it's a new item with same amount
                    (invitem.q - oldinventory[slot].q == amount)    // or an old item with matching increased amount
                ) {
                    return invitem.name;
                }
            }
        }
    }

    function report_result(result_data) {
        let payload = {
            item: result_data.source,
            result: result_data.result,
            amount: result_data.amount,
            key : API_KEY
        };

        let data = new parent.FormData();
        data.append('json', JSON.stringify(payload));
        let content = { method: 'POST', body: data };

        fetch(`${COLLECTION_SERVER}/exchange`, content).catch(() => {});

        if(COLLECTION_SERVER2) {
            fetch(`${COLLECTION_SERVER2}/exchange`, content).catch(() => {});
        }
    }

    parent.ui_success("Use the exchange script with parent.exchangeit(inventory_slot)");
    return exchange;
}());
