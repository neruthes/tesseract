module.exports = {
    import: function (jsonRaw, filePath) {
        let mydb = {
            db: JSON.parse(jsonRaw),
            filePath: filePath,
            get: function (table, id) {
                if (mydb.db[table] && mydb.db[table][id] !== undefined && mydb.db[table][id] !== null) {
                    return JSON.parse(JSON.stringify(mydb.db[table][id]));
                } else {
                    return undefined;
                };
            },
            set: function (table, id, rowobj) {
                mydb.db[table][id] = JSON.parse(JSON.stringify(rowobj));
            },
            list: function (table) {
                return Object.keys(mydb.db[table]).filter(function (key) { return mydb.db[table].hasOwnProperty(key); })
            },
            save: function () {
                fs.writeFileSync(mydb.filePath, JSON.stringify(mydb.db));
            }
        };
        return mydb;
    },
    export: function (mydb) {
        return JSON.stringify(mydb.db)
    }
};
