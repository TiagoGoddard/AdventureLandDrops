# AdventureLandDrops
AdventureLand server side code from: https://gitlab.com/Draivin/adventure-drops/tree/master
Contribute your drop collection to the http://adventurecode.club/ database.

## Adventure Land CODE to contribute drop rates
Auto updated code:
```javacript
window.aldc_apikey = 'API_KEY'; // Replace API_KEY with your API key => Ask me for one, on discord, PM or email
$.getScript('http://adventurecode.club/script?t='+(new Date).getTime(), function() {
	game_log('Thank you for contributing your data!', '#FFFF00');
});
```

Or do it yourself:
[Javascript code to contribute available here](script.js)

# To update and configure server

## To update data.js
http://adventure.land/data.js

## To update skins.json
```javascript
var returnSkin = {};
Object.keys(parent.G.sprites).forEach(function(key,index) {
    var sprite = parent.G.sprites[key].matrix;
    var file = parent.G.sprites[key].file;
    Object.keys(sprite).forEach(function(mkey,mindex) {
		var m = sprite[mkey];
		Object.keys(m).forEach(function(jkey,jindex) {
			if(m[jkey]) {
				returnSkin[m[jkey]] = file;
			}
		});
    });
});
show_json(returnSkin);
```

## To update dimensions.json
```
show_json(parent.D)
```
