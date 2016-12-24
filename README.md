# AdventureLandDrops
AdventureLand server side code from: https://gitlab.com/Draivin/adventure-drops/tree/master

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
