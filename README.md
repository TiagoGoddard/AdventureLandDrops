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
// When aldc_use_upgrade = true, send upgrade data when using parent.upgradeit(item_name, max_level, options_object).
//      options_object defaults to { buy_item: false, buy_scrolls: true, stop_on_success: false }
// When aldc_use_compound = true, send compound data when using parent.compoundit(item_name, item_level_to_compound); i.e compoundit('hpbelt', 0) tries to create an hpbelt+1
// When aldc_use_exchange = true, send exchange data when using parent.exchangeit(inventory_slot)
$.getScript('http://adventurecode.club/script?t='+(new Date).getTime(), function() {
    game_log('Thank you for contributing your drop data!', '#FFFF00');
});
```

Then you will be reporting kill/drops to the database and you can use `parent.upgradeit`, `parent.compoundit` and `parent.exchangeit` functions.

Or do it yourself:
[Javascript code to contribute available here](script.js)

# To update and configure server

## To update data.js
http://adventure.land/data.js

## To update skins.json
```javascript
show_json(parent.FC);
```

## To update dimensions.json
```
show_json(parent.D)
```
