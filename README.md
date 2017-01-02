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
