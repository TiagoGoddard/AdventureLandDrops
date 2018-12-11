const mysql = require("./collection/mysql");

async function main() {
    try {
        await mysql.insertCompound(100000,"asd",1,"scroll0",0,1,"235667sdfg234567",0)
    } catch (e) {
        console.error(e)
    }
}

main();