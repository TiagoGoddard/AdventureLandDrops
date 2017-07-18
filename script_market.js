parent.updateit = (function() {
    let COLLECTION_SERVER = 'http://adventurecode.club:13726';
    let COLLECTION_SERVER2 = window.aldc_second_server;
    let API_KEY = window.aldc_apikey;
    let SCRIPT_VERSION = window.aldc_script_version;

    if (parent.prev_handlers) {
        for (let [event, handler] of parent.prev_handlers) {
            parent.socket.removeListener(event, handler);
        }
    }

    function register_handler(event, handler) {
        parent.prev_handlers.push([event, handler]);
        parent.socket.on(event, handler);
    }

    parent.waiting_for_log = false;

    let selling_listener = (data) => {
        if(!parent) return;
        if(!character.stand) {
            console.log("Waiting for stand to open...");
            return;
        }

        let items = [];
        for(let key of Object.keys(character.slots)) { 
          if(key.startsWith('trade')) {
            if(character.slots(key)) {
              items.push(character.slots(key));
            }
          }
        }

        finish(items);        
    };
    

    function update() {
        if(!parent) {
            console.error("Unable to get parent object") ;
            return;
        }
        if(!character.stand) {
            console.log("Waiting for stand to open... (character.stand == false). If this persists, refresh the web page.");
            return;
        }
        if(API_KEY.length < 15) {
            console.error("Invalid API key") ;
            return;
        }
      
        register_handler('merchant', selling_listener);
    }

    function finish(items) {
        report_result(items);
    }

    function report_result(items) {
        let payload = {
            items: items,
            map: character.map,
            player: character.name,
            key: API_KEY,
            version: SCRIPT_VERSION
        };

        let data = new FormData();
        data.append('json', JSON.stringify(payload));
        let content = { method: 'POST', body: data };

        fetch(`${COLLECTION_SERVER}/update`, content).catch(() => {});

        if(COLLECTION_SERVER2) {
            fetch(`${COLLECTION_SERVER2}/update`, content).catch(() => {});
        }
    }

    parent.ui_success("Use the market script with parent.updateit()");
    return exchange;
}());
