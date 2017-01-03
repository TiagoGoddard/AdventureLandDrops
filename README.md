# AdventureLandDrops
AdventureLand server side code from: https://gitlab.com/Draivin/adventure-drops/tree/master
Contribute your drop collection to the http://adventurecode.club/ database.

## Adventure Land CODE to contribute drop rates
Once you have an API key (request one on the Discord), put this code block in your CODE, _**outside**_ of any kind of loop like setInterval:
```javacript
window.aldc_apikey = 'API_KEY'; // Replace API_KEY with your API key => Ask me for one, on discord, PM or email
window.aldc_use_upgrade = true;
window.aldc_use_compound = true;
window.aldc_use_exchange = true;
// USAGE INFORMATION:
// When aldc_use_upgrade = true, use parent.upgradeit(item_name, max_level, options_object) to upgrade items.
//      options_object defaults to { buy_item: false, buy_scrolls: true, stop_on_success: false }
// When aldc_use_compound = true, use parent.compoundit(item_name, item_level_to_compound); to compound items togeter.
//      i.e parent.compoundit('hpbelt', 0) tries to create an hpbelt+1 with 3 hpbelt+0
// When aldc_use_exchange = true, use parent.exchangeit(inventory_slot) to exchange 1 item in that inventory slot

$.getScript('http://adventurecode.club/script', function() {
    game_log('Thank you for contributing your drop data!', '#FFFF00');
});
```

Then you will be reporting kill/drops to the database and you can use `parent.upgradeit`, `parent.compoundit` and `parent.exchangeit` functions.

## Example scripts for `upgradeit`/`compoundit`/`exchangeit`

### Upgrade xmas items to the desired level
Note the `i_am_sure_i_want_to_do_upgrade_my_xmas_items` variable
```
let xmas_items = ['xmashat', 'xmassweater', 'xmaspants', 'xmasshoes', 'mittens' ];
let level_desired = 6;
let i_am_sure_i_want_to_do_upgrade_my_xmas_items = false;

function seekAndUpgrade() {
    if(!i_am_sure_i_want_to_do_upgrade_my_xmas_items) return;
    
    for(let slot in character.items) {
        let item = character.items[slot];
        if(item && xmas_items.indexOf(item.name) != -1) {
            parent.upgradeit(item.name, level_desired);
            setTimeout(seekAndUpgrade, 1000);
            return;
        }
    }
}

setTimeout(seekAndUpgrade, 2000);
```

### Auto compound white-listed items as they appear in the inventory
```
setInterval(() => {
    if(parent.compoundit) {
        let compound_whitelist = {
            //item name : max level to compound from, i.e 1 = will find 3x +1 and try to make it +2
            "ringsj"    : 1,
            "hpbelt"    : 1,
            "hpamulet"  : 1,
            "wbook0"    : 1
        };

        Object.keys(compound_whitelist).some(function(item) {
            let maxLevel = compound_whitelist[item];
            for(let level = 0; level < maxLevel; level++) {
                let [found_slots,] = util.find_all_items_namelevel(item, level);
                if(found_slots.length >= 3) {
                    parent.compoundit(item, level);
                    return true;
                }
            }
        });
    }
}, 5000);
```

### Exchange all exchangable items in the inventory
```
function exchangeAll() {
    for(let slot in character.items) {
        let item = character.items[slot];
        if(item && G.items[item.name].e && G.items[item.name].e <= item.q) {
            parent.exchangeit(slot);
            setTimeout(exchangeAll, 750);
            return;
        }
    }
}
setTimeout(exchangeAll, 1000);
```

# To update and configure server

## To update data.js
Get the file data.js from: http://adventure.land/data.js and replace `var G` with `module.exports`

## To update skins.json
```javascript
show_json(parent.FC);
```

## To update dimensions.json
```
show_json(parent.D);
```
