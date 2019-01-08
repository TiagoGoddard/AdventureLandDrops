# AdventureLandDrops
AdventureLand server side code from: https://gitlab.com/Draivin/adventure-drops/tree/master
Contribute your drop collection to the http://adventurecode.club/ database.

## Adventure Land CODE to contribute drop rates
Once you have an API key (request one on the Discord from me @NexusNull#6364), put this code block in your CODE, _**outside**_ of any kind of loop like setInterval:

Execute this code to install the contribution code.
After the installation has finished you can use it by calling `load_code("acc_contribute")` at the beginning of your code.
```javascript
parent.api_call("list_codes", {
    callback: function (codes) {
        codes = codes[0]
        var codeSlot = 0;
        for (let i in codes.list) {
            if (codes.list[i] == "acc_contribute") {
                codeSlot = i;
                game_log("Found already existing code. Updating ...");
                break;
            }
        }
        if (codeSlot == 0) {
            game_log("Didn't find existing code. Downloading ...");
            game_log("Looking for an open space to put code.");
            for (let i = 1; i < 100; i++) {
                if (typeof codes.list[i] == "undefined") {
                    codeSlot = i;
                    break;
                }
            }
        }
        let request = new XMLHttpRequest();
        request.open("GET", "https://adventurecode.club/script");
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                var answer = prompt("Please Enter your api key");
                var data = {
                    name: "acc_contribute",
                    slot: codeSlot + "",
                    code: request.responseText.replace("YOUR_API_KEY",answer)
                }
                parent.api_call("save_code", data);
            }
        }
        request.send();
    }
});
```



## To update data.js
Get the file data.js from: http://adventure.land/data.js and replace `var G` with `module.exports`

## To update skins.json
```javascript
JSON.stringfy(parent.FC);
```
Don't forget to add the Franky, Jrat and elementals at end.
```
"franky": "/images/tiles/monsters/monster1.png",
"jrat": "/images/tiles/monsters/monster1.png",
"eelemental": "/images/tiles/monsters/monster1.png",
"felemental": "/images/tiles/monsters/monster1.png",
"nelemental": "/images/tiles/monsters/monster1.png",
"welemental": "/images/tiles/monsters/monster1.png"
```

## To update dimensions.json
```javascript
JSON.stringfy(parent.XYWH);
```
Don't forget to add the Franky, Jrat and elementals at end.
```
  "franky": [
    0,
    0,
    0,
    0
  ],
  "jrat": [
    0,
    0,
    0,
    0
  ],
  "welemental": [
    0,
    0,
    0,
    0
  ],
  "felemental": [
    0,
    0,
    0,
    0
  ],
  "nelemental": [
    0,
    0,
    0,
    0
  ],
  "eelemental": [
    0,
    0,
    0,
    0
  ]
```