require('dotenv').config()

const express = require('express')
const moment = require('moment')
const bodyParser = require('body-parser')
const AWS = require('aws-sdk')
const app = express()
const cors = require('cors')
const { Sequelize, Model, DataTypes } = require('sequelize')
// const imageClipper = require('image-clipper')
const fs = require('fs')

const { BUCKET_NAME, REGION, KEY, SECRET, POSTGRES_DB } = process.env

const sequelize = new Sequelize(POSTGRES_DB ? POSTGRES_DB : 'sqlite::memory:')

class Image extends Model {}
Image.init(
  {
    imageUrl: DataTypes.STRING,
    imageTaken: DataTypes.DATE,
  },
  { sequelize, modelName: 'user' }
)

// Plant
class Plant extends Model {}
Plant.init(
  {
    name: DataTypes.STRING,
    lightHours: DataTypes.INTEGER,
    temperature: DataTypes.DOUBLE,
    ph: DataTypes.DOUBLE,
    growthStart: DataTypes.DATE,
  },
  { sequelize, modelName: 'plant' }
)

sequelize.sync()

const s3 = new AWS.S3({
  accessKeyId: KEY,
  secretAccessKey: SECRET,
  region: REGION,
  signatureVersion: 'v4',
})

app.use(cors())
app.use(bodyParser.json({ limit: '10mb', extended: true }))
app.get('/', (req, res) => res.send('hello world'))

app.get('/images', async (req, res) => {
  const images = await Image.findAll()

  res.send(images)
})

app.post('/image', (req, res) => {
  console.log('received image!')
  const now = moment().format('YYYY-MM-DDTHH:mm')
  const fileName = `${now}.png`
  console.log(fileName)
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: Buffer.from(req.body.data, 'base64'),
    ContentEncoding: 'base64',
    ContentType: 'image/png',
    ACL: 'public-read-write',
  }
  s3.putObject(params, async (err, data) => {
    console.log('response from s3', err, data)
    await Image.create({
      imageUrl: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${fileName}`,
      imageTaken: new Date(now),
      growthStart: new Date('2020-12-01'),
      lightHours: 12,
      temperature: 27.5,
      plant: 'Sallad',
    })
    res.sendStatus(200)
  })
})

app.post('/plants', async (req, res) => {
  try {
    const plant = await Plant.create(req.body)
    res.send(plant)
  } catch (err) {
    res.send(err.message)
  }
})

app.get('/plants', async (_, res) => {
  const plants = await Plant.findAll()
  res.send(plants)
})
app.put('/plants/:id', async (req, res) => {
  const { id } = req.params
  try {
    const plant = await Plant.findOne({ where: { id } })
    Object.keys(req.body).forEach((key) => {
      plant[key] = req.body[key]
    })
    await plant.save()
    res.send(plant)
  } catch (e) {
    return res.send(e.message)
  }
})
app.delete('/plants/:id', async (req, res) => {
  const { id } = req.params
  try {
    const plant = await Plant.findOne({ where: { id } })
    await plant.destroy()
  } catch (e) {
    return res.send(e.message)
  }
  res.sendStatus(200)
})

app.listen(3000)

console.log('hello')

// const test = async () => {
//   const WIDTH = 2016
//   const HEIGHT = 1512
//   const imageWidth = Math.floor(WIDTH / 3)
//   imageClipper('./hydroponics-test.png', function () {
//     this.crop(0, 0, imageWidth, HEIGHT).toFile('./cropped.png', () => {
//       console.log('saved!')
//     })
//   })
// }

// test()
