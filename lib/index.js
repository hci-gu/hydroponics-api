require('dotenv').config()

const express = require('express')
const moment = require('moment')
const bodyParser = require('body-parser')
const AWS = require('aws-sdk')
const app = express()
const cors = require('cors')
const { Plant, Image, mockData } = require('./db')
const { Op } = require('sequelize')

const { BUCKET_NAME, REGION, KEY, SECRET } = process.env
if (process.env.NODE_ENV != 'production') {
  mockData()
}
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
  const { offset = 0, limit = 25 } = req.query
  const count = await Image.count({})
  const images = await Image.findAll({
    offset,
    limit,
  })

  res.send({
    images,
    count,
    limit,
    offset,
  })
})

app.post('/image', (req, res) => {
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
    try {
      await Image.create({
        imageUrl: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${fileName}`,
        imageTaken: new Date(now),
      })
      return res.sendStatus(200)
    } catch (saveErr) {
      console.error('error saving image', saveErr.message)
      res.send(e.message)
    }
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
app.get('/plants/:id/images', async (req, res) => {
  const { id } = req.params
  try {
    const plant = await Plant.findOne({ where: { id } })
    const images = await Image.findAll({
      where: {
        imageTaken: {
          [Op.lt]: plant.growthEnd ? new Date(plant.growthEnd) : new Date(),
          [Op.gt]: new Date(plant.growthStart),
        },
      },
    })
    res.send(images)
  } catch (e) {
    res.send(e.message)
  }
})
app.put('/plants/:id', async (req, res) => {
  const { id } = req.params
  console.log('PUT', id, req.body)
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

app.listen(4000)

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
