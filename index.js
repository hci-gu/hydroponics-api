require('dotenv').config()

const express = require('express')
const moment = require('moment')
const bodyParser = require('body-parser')
const AWS = require('aws-sdk')
const app = express()

const { BUCKET_NAME, REGION, KEY, SECRET } = process.env

const s3 = new AWS.S3({
  accessKeyId: KEY,
  secretAccessKey: SECRET,
  region: REGION,
  signatureVersion: 'v4',
})

app.use(bodyParser.json({ limit: '10mb', extended: true }))
app.get('/', (req, res) => res.send('hello world'))

app.post('/image', (req, res) => {
  console.log('received image!')
  const fileName = `${moment().format('YYYY-MM-DDTHH:mm')}.png`
  console.log(fileName)
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: Buffer.from(req.body.data, 'base64'),
    ContentEncoding: 'base64',
    ContentType: 'image/png',
  }
  s3.putObject(params, (err, data) => {
    console.log('response from s3', err, data)
  })

  res.sendStatus(200)
})

app.listen(3000)

console.log('hello')
