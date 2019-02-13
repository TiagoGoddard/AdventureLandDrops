var request = require("request-promise-native");
var vm = require("vm");
var G = require("./data");
var C = {};
var FC = {};
var FM = {};
var XYWH = {};
var T = {};
var version = 0;

for (let name in G.sprites) {
    var g = G.sprites[name];
    if (g.skip) {
        continue
    }
    var e = 4
        , b = 3
        , k = "full";
    if (in_arr(g.type, ["animation"])) {
        e = 1,
            k = g.type
    }
    if (in_arr(g.type, ["v_animation", "head", "hair", "hat", "s_wings"])) {
        b = 1,
            k = g.type
    }
    if (in_arr(g.type, ["wings", "body"])) {
        k = g.type
    }
    if (in_arr(g.type, ["emblem", "gravestone"])) {
        e = 1,
            b = 1,
            k = g.type
    }
    var l = g.matrix;
    C[g.file] = {
        width: 20,
        height: 20
    }

    var c = C[g.file].width / (g.columns * b);
    var n = C[g.file].height / (g.rows * e);
    for (var h = 0; h < l.length; h++) {
        for (var f = 0; f < l[h].length; f++) {
            if (!l[h][f]) {
                continue
            }
            FC[l[h][f]] = g.file;
            FM[l[h][f]] = [h, f];
            XYWH[l[h][f]] = [f * b * c, h * e * n, c, n];
            T[l[h][f]] = k;
        }
    }
}

getGameData = async function () {
    var self = this;
    return new Promise(async function (resolve, reject) {
        try {
            console.log("Fetching game data");
            let code = await request({
                url: "https://adventure.land/data.js",
                headers: {
                    "x-requested-with": "XMLHttpRequest",
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "user-agent": "AdventureLandBot: (v1.0.0)",
                    "cookie": "auth=;",
                }
            });
            let sandbox = {};
            let context = vm.createContext(sandbox);
            vm.runInContext(code, context);
            version++;
            resolve(sandbox.G)
        } catch (e) {
            reject("Could not retrieve game data");
        }
    });
};


function is_array(e){
    return Array.isArray(e);
}

function in_arr(b, d) {
    if (is_array(b)) {
        for (var a = 0; a < b.length; a++) {
            for (var c in d) {
                if (b[a] === d[c]) {
                    return true
                }
            }
        }
    }
    for (var c in d) {
        if (b === d[c]) {
            return true
        }
    }
    return false
}

async function updateGameData() {
    try {
        G = await getGameData();
        for (let name in G.sprites) {
            var g = G.sprites[name];
            if (g.skip) {
                continue
            }
            var e = 4
                , b = 3
                , k = "full";
            if (in_arr(g.type, ["animation"])) {
                e = 1,
                    k = g.type
            }
            if (in_arr(g.type, ["v_animation", "head", "hair", "hat", "s_wings"])) {
                b = 1,
                    k = g.type
            }
            if (in_arr(g.type, ["wings", "body"])) {
                k = g.type
            }
            if (in_arr(g.type, ["emblem", "gravestone"])) {
                e = 1,
                    b = 1,
                    k = g.type
            }
            var l = g.matrix;
                C[g.file] = {
                    width: 20,
                    height: 20
                }

            var c = C[g.file].width / (g.columns * b);
            var n = C[g.file].height / (g.rows * e);
            for (var h = 0; h < l.length; h++) {
                for (var f = 0; f < l[h].length; f++) {
                    if (!l[h][f]) {
                        continue
                    }
                    FC[l[h][f]] = g.file;
                    FM[l[h][f]] = [h, f];
                    XYWH[l[h][f]] = [f * b * c, h * e * n, c, n];
                    T[l[h][f]] = k;
                }
            }
        }
    } catch (e) {
        console.error(e)
    }
}
setInterval(async function () {
    await updateGameData()
}, 1000 * 60 * 60);

module.exports = {
    getData: function(){
        return G;
    },
    dataVersion: function(){
        return version;
    }
};