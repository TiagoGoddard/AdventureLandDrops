parent.updateit = (function() {
    let COLLECTION_SERVER = 'http://adventurecode.club:13726';
    let COLLECTION_SERVER2 = window.aldc_second_server;
    let API_KEY = window.aldc_apikey;
    let SCRIPT_VERSION = window.aldc_script_version;

    let LAST_CALL = null;

    function register_handler(event, handler) {
        parent.prev_handlers.push([event, handler]);
        parent.socket.on(event, handler);
    }

    function update() {
        if(!parent) {
            console.error("Unable to get parent object") ;
            return;
        }
        if(API_KEY.length < 15) {
            console.error("Invalid API key") ;
            return;
        }
        if(!character.stand) {
            console.log("Waiting for stand to open...");
            return;
        }
        if(LAST_CALL && mssince(LAST_CALL) < 5000) {
            console.log("Let's not spam the server.");
            return;          
        }

        update_market(get_character_items());
    }
  
    function get_character_items() {
        let items = [];
        for(let key of Object.keys(character.slots)) { 
          if(key.startsWith('trade')) {
            if(character.slots[key]) {
              items.push(character.slots[key]);
            }
          }
        }
        return items;
    }

    function update_market(items) {
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
        LAST_CALL = new Date(0);
    }

    parent.ui_success("Use the market script with parent.updateit()");
    return update;
}());
