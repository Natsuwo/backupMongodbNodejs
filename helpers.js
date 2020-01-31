const fs = require('fs')
const axios = require('axios')
const { google } = require('googleapis')
const path = require('path')

module.exports.getAccessToken = async function () {
    var credentials = fs.readFileSync("./googleDriveAPI.json", { encoding: "utf8" })
    credentials = JSON.parse(credentials)
    var timeNow = (new Date).getTime()
    if (credentials.expiry_date > timeNow)
        return credentials.access_token
    else
        return await module.exports.refreshToken(credentials)
}

module.exports.getDate = function () {
    var dateObj = new Date()
    var month = dateObj.getUTCMonth() + 1
    var day = dateObj.getUTCDate()
    var year = dateObj.getUTCFullYear()
    newdate = year + "/" + month + "/" + day
    return newdate
}

module.exports.refreshToken = async function (credentials) {
    try {
        var client_secret = fs.readFileSync("./client_secret.json", { encoding: "utf8" })
        client_secret = JSON.parse(client_secret)
        var token = client_secret.web
        var { client_id, client_secret } = token
        var refresh_token = credentials.refresh_token
        var grant_type = 'refresh_token'
        var form = { client_id, client_secret, refresh_token, grant_type }
        var resp = await axios.post('https://accounts.google.com/o/oauth2/token', form)
        var { access_token, expires_in } = resp.data
        var time = new Date()
        var expiry_date = time.setSeconds(time.getSeconds() + expires_in)
        credentials.access_token = access_token
        credentials.expiry_date = expiry_date
        fs.writeFileSync("./googleDriveAPI.json", JSON.stringify(credentials), 'utf8')
        return await module.exports.getAccessToken()
    } catch (err) {
        console.log(err.message)
    }
}

module.exports.uploadToDrive = async function () {
    try {
        const oauth2Client = new google.auth.OAuth2()
        var access_token = await module.exports.getAccessToken()
        oauth2Client.setCredentials({
            'access_token': access_token
        })
        const drive = google.drive({
            version: 'v3',
            auth: oauth2Client
        })
        var fileName = await module.exports.getDate()
        var fileMetadata = {
            'name': fileName,
            'parents': [process.env.ROOTFOLDER],
            'mimeType': 'application/vnd.google-apps.folder'
        }
        var newFolder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
            supportsTeamDrives: true
        })

        var dir = './backup'
        var folder = fs.readdirSync(dir)
        var ext = '.json';
        var files = folder.filter(f => path.extname(f).toLowerCase() === ext)
        for (var item of files) {
            await drive.files.create({
                requestBody: {
                    name: item,
                    parents: [newFolder.data.id],
                },
                media: {
                    body: fs.createReadStream(`${dir}/${item}`)
                },
                supportsAllDrives: true
            })
            console.log('Upload completed ' + item)
        }

    } catch (err) {
        console.log(err)
    }

}