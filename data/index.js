let data = require('./data');
let skins = require('./skins.json');
let dimensions = require('./dimensions.json');

data.skins = {};
for (let skin of Object.keys(skins)) {
    data.skins[skin] = {
        file: skins[skin],
        dimensions: dimensions[skin],
        rdimensions: data.dimensions[skin],
    };
}


module.exports = data;
