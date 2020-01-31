const schedule = require('node-schedule')
const { uploadToDrive } = require('./helpers')
var MongoClient = require('mongodb').MongoClient;
// Connection url
var url = 'mongodb://localhost:27017';
var dbName = process.env.DB_NAME;

const sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const spawnData = col => {
    return sleep(1000).then(v => {
        var fs = require('fs')
        var spawn = require('child_process').spawn
        var backup = spawn('mongoexport', ['--db', dbName, '--collection', col])
        var backupData = ''
        backup.stdout.on('data', (data) => {
            backupData += data
        })
        backup.on('close', () => {
            fs.writeFileSync('./backup/' + col + '.json', backupData);
        })
    })
}

var j = schedule.scheduleJob('0 0 * * *', function () {
    var listCol = []
    // Connect using MongoClient
    MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        // Use the admin database for the operation
        var adminDb = client.db(dbName)
        adminDb.listCollections().toArray().then(collections => {
            var promises = collections.map(async col => {
                return {
                    col: col.name,
                    count: await adminDb.collection(col.name).countDocuments()
                };
            });
            return Promise.all(promises);
        })
            .then(async res => {
                listCol = res
                for (var scol of listCol) {
                    var col = scol.col
                    await spawnData(col)
                }
            });
    });
})

var u = schedule.scheduleJob('2 0 * * *', function () {
    uploadToDrive()
})