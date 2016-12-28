parent.upgradeit = (function() {
    let COLLECTION_SERVER = 'http://adventurecode.club:13726';
    let COLLECTION_SERVER2 = window.aldc_second_server;
    let API_KEY = window.aldc_apikey;

    function find_slot(starting_slot, filter) {
        if (typeof starting_slot == 'function') {
            filter = starting_slot;
            starting_slot = 0;
        }

        for (let i = starting_slot; i < character.items.length; i++) {
            let item = character.items[i];
            if (item && filter(item)) return i;
        }

        return -1;
    }

    function find_item(starting_slot, filter) {
        let slot = find_slot(starting_slot, filter);
        if (slot == -1) return [-1, null];
        return [slot, character.items[slot]];
    }

    function scroll_type(name, level) {
        let grades = parent.G.items[name].grades;
        if (level < grades[0]) return 0;
        else if (level < grades[1]) return 1;
        return 2;
    }

    function calculate_scrolls_needed(item, max_level) {
        let scrolls_needed = [0, 0, 0];

        for (let i = item.level; i < max_level; i++) {
            scrolls_needed[scroll_type(item.name, i)]++;
        }

        return scrolls_needed;
    }

    let upgrade_running = false;
    function preemptive_upgrades(item_slot, scroll_slots, max_level) {
        /* eslint no-use-before-define: 0, no-console: 0 */

        if (upgrade_running) return;
        upgrade_running = true;

        let parent = window.parent;

        let item = character.items[item_slot];
        let scrolls = scroll_slots.map(s => character.items[s]);

        let scrolls_needed = calculate_scrolls_needed(item, max_level);

        let has_enough_scrolls = scrolls.every((s, i) =>
            scrolls_needed[i] == 0 || s.name == `scroll${i}` && s.q >= scrolls_needed[i]
        );

        if (!has_enough_scrolls) {
            parent.add_log('Preemptive upgrade called without prerequisites!');
            return;
        }

        let starting_level = item.level;
        let current_level = item.level;

        let upgrades = [];
        let consumables = {};

        let success_listener = (data) => {
            if (data && data.message == 'Item upgrade succeeded') {
                let used_consumables = consumables[current_level];

                upgrades.push({
                    item: item.name,
                    level: current_level++,
                    scroll: used_consumables.scroll,
                    offering: used_consumables.offering,
                    success: true
                });

                if (current_level == max_level) {
                    clear_listeners();
                    console.info(`%cUpgraded to +${max_level} successfully!`, 'color: green');
                }
            }
        };

        let failure_listener = (data) => {
            if (data == 'Item upgrade failed') {
                let used_consumables = consumables[current_level];

                upgrades.push({
                    item: item.name,
                    level: current_level,
                    offering: used_consumables.offering,
                    scroll: used_consumables.scroll,
                    success: false
                });

                clear_listeners();
                console.info(`%cItem upgrade failed going from +${current_level} to +${current_level + 1}`, 'color: red');
            }
        };

        let clear_listeners = (failed) => {
            clear_listeners = () => {};
            parent.socket.removeListener('game_log', success_listener);
            parent.socket.removeListener('game_error', failure_listener);
            upgrade_running = false;

            if (failed) return;

            let payload = {
                key: API_KEY,
                entries: upgrades
            };

            let data = new parent.FormData();
            data.append('json', JSON.stringify(payload));

            fetch(`${COLLECTION_SERVER}/upgrade`, {
                method: 'POST',
                body: data
            });

            if(COLLECTION_SERVER2) {
                fetch(`${COLLECTION_SERVER2}/upgrade`, {
                    method: 'POST',
                    body: data
                });
            }
        };

        // Safe cleanup in case something goes wrong
        setTimeout(clear_listeners.bind(this, true), 20000);

        parent.socket.on('game_log', success_listener);
        parent.socket.on('game_error', failure_listener);

        for (let i = starting_level; i < max_level; i++) {
            let scroll_slot = scroll_slots[scroll_type(item.name, i)];

            consumables[i] = {
                scroll: character.items[scroll_slot].name,
                offering: null
            };

            parent.socket.emit('upgrade', {
                item_num: item_slot,
                scroll_num: scroll_slot,
                offering_num: null,
                clevel: i
            });
        }
    }

    /* eslint no-shadow:0 */
    function upgrade(item_name, max_level, options = {}) {
        if (upgrade_running) return;

        options = Object.assign({}, {
            buy_item: false,
            buy_scrolls: true,
            stop_on_success: false
        }, options);

        if (options.stop_on_success &&
            find_slot(i => i.name == item_name && i.level == max_level) != -1) {
            return;
        }

        let [item_slot, item] = find_item(i => i.name == item_name && i.level < max_level);
        if (item_slot == -1) {
            if (options.buy_item) parent.buy(item_name);
            return;
        }

        let scrolls = [0, 1, 2].map(i => find_item(it => it.name == `scroll${i}`));
        let scroll_nums = scrolls.map(t => (t[1] ? t[1].q : 0));

        let scrolls_needed = calculate_scrolls_needed(item, max_level);
        let missing_scrolls = false;

        for (let i = 0; i < scroll_nums.length; i++) {
            let num = scroll_nums[i];
            let needed = scrolls_needed[i];

            if (num < needed) {
                missing_scrolls = true;
                if (options.buy_scrolls) parent.buy(`scroll${i}`, needed - num);
            }
        }

        if (!missing_scrolls) {
            preemptive_upgrades(item_slot, scrolls.map(([s]) => s), max_level);
        }
    }
    parent.ui_success("Loaded. Use the upgrade script with parent.upgradeit");
    return upgrade;
}());
