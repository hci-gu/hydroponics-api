require('dotenv').config()

const express = require('express')
const moment = require('moment')
const bodyParser = require('body-parser')
const app = express()
const cors = require('cors')
const { Plant, Image, mockData } = require('./db')
const { Op } = require('sequelize')
const resizeAll = require('./jobs/resizeAll')
const aws = require('./aws')

if (process.env.NODE_ENV != 'production') {
  mockData()
}

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

app.post('/image', async (req, res) => {
  const now = moment().format('YYYY-MM-DDTHH:mm')
  const fileName = `${now}.png`

  try {
    const imageUrl = await aws.saveImage('original', fileName, req.body.data)
    const imageData = {
      imageUrl,
      imageTaken: new Date(now),
    }
    if (latestTemp != null) {
      imageData.temperature = latestTemp
    }
    await Image.create(imageData)
  } catch (e) {
    console.error('error saving image', saveErr.message)
    res.send(e.message)
  }

  res.sendStatus(200)
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
      order: [['imageTaken', 'DESC']],
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

let latestTemp = null
let shouldSaveTemp = false
app.post('/sensor/temp', async (req, res) => {
  const { temp } = req.body
  if (shouldSaveTemp) {
    latestTemp = temp
  }
  res.sendStatus(200)
})

app.get('/sensor/temp/toggle', (req, res) => {
  shouldSaveTemp = !shouldSaveTemp
  if (!shouldSaveTemp) latestTemp = false

  res.send('I have now toggled saving temp to: ' + shouldSaveTemp)
})

app.get('/force-migration', async (req, res) => {
  res.send('all done')
})

app.get('/s3/image/:name', async (req, res) => {
  const { name } = req.params
  await aws.resize(name)
  res.send('great success')
})

app.get('/resize', async (req, res) => {
  const { offset } = req.query
  const images = await Image.findAll({
    offset: offset ? offset : 0,
    limit: 50,
  })

  if (images.length) {
    const result = await resizeAll(images)
    return res.send(result)
  }

  res.send([])
})

app.listen(4000)
