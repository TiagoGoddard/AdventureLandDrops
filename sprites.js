const data = require('./data');

const monsterSprite = function(type, size = 64) {
    const skin = data.skins[type];
    if(!skin) {
        console.error("Unable to find skin for " + type);
        return "";
    }
    if(!skin.dimensions) {
        skin.dimensions = [ 0, 0 ];
        skin.rdimensions = [ 0, 0 ];
    }

    let width = skin.dimensions[2];
    let height = skin.dimensions[3];
    let shOffset = 0;
    let svOffset = 0;

    if (skin.rdimensions) {
        let newWidth = skin.rdimensions[0];
        let newHeight = skin.rdimensions[1];

        shOffset = (width - newWidth) / 2 + (skin.rdimensions[2] || 0);
        svOffset = height - newHeight + (skin.rdimensions[3] || 0);

        width = newWidth;
        height = newHeight;
    }

    const hOffset = -(skin.dimensions[0] + shOffset);
    const vOffset = -(skin.dimensions[1] + svOffset);

    const hScale = size / width;
    const vScale = size / height;

    const scale = Math.min(hScale, vScale);

    const url = `http://adventure.land${skin.file}`;
    const position = `${hOffset}px ${vOffset}px`;
    return `background: url(${url}) ${position}; min-width: ${width}px; min-height: ${height}px; transform: scale(${scale});`;
};

const itemSprite = function(item, size = 64) {
    const itemInfo = data.items[item];

    const positions = data.positions[itemInfo.skin] || data.positions["test"];

    const itemsetName = positions[0] || "pack_1a";
    const x = positions[1];
    const y = positions[2];

    const itemSet = data.itemsets[itemsetName];

    const iconSize = itemSet.size;
    const hOffset = -(x * iconSize);
    const vOffset = -(y * iconSize);

    const hScale = size / iconSize;
    const vScale = size / iconSize;

    const scale = Math.min(hScale, vScale);

    const url = `http://adventure.land${itemSet.file}`;
    const position = `${hOffset}px ${vOffset}px`;
    return `background: url(${url}) ${position}; min-width: ${iconSize}px; min-height: ${iconSize}px; transform: scale(${scale});`;
};

exports.monster = monsterSprite;
exports.item = itemSprite;
