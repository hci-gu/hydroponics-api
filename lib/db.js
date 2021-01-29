require('dotenv').config()

const { Sequelize, Model, DataTypes } = require('sequelize')
const moment = require('moment')

const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB } = process.env

if (DB) {
  console.log('connecting to', {
    DB_HOST,
    DB_PORT,
    DB_USERNAME,
    DB_PASSWORD,
    DB,
  })
}
const sequelize = DB
  ? new Sequelize({
      database: DB,
      username: DB_USERNAME,
      password: DB_PASSWORD,
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    })
  : new Sequelize('sqlite::memory')

class Image extends Model {}
Image.init(
  {
    imageUrl: DataTypes.STRING,
    imageTaken: DataTypes.DATE,
  },
  { sequelize, modelName: 'image' }
)

// Plant
class Plant extends Model {}
Plant.init(
  {
    name: DataTypes.STRING,
    lightHours: DataTypes.INTEGER,
    temperature: DataTypes.DOUBLE,
    ph: DataTypes.DOUBLE,
    imagePosition: DataTypes.INTEGER,
    growthStart: DataTypes.DATE,
    growthEnd: DataTypes.DATE,
    information: DataTypes.STRING,
  },
  { sequelize, modelName: 'plant' }
)

sequelize.sync()

const mockData = async () => {
  await sequelize.sync()
  const mockImageUrl =
    'https://hydroponics-pictures.s3.eu-north-1.amazonaws.com/2021-01-27T14:24.png'
  const images = Array.from({ length: 48 }).map((_, i) => {
    const date = moment()
      .subtract(i * 30, 'minutes')
      .format()
    return {
      imageUrl: mockImageUrl,
      imageTaken: new Date(date),
    }
  })

  await Promise.all(images.map((img) => Image.create(img)))

  await Plant.create({
    name: 'test',
    lightHours: 2,
    temperature: 5,
    ph: 3,
    imagePosition: 0,
    growthStart: new Date(),
    growthEnd: new Date(moment().add(7, 'days')),
    information: 'blablabla',
  })
  await Plant.create({
    name: 'test',
    lightHours: 2,
    temperature: 5,
    ph: 3,
    imagePosition: 1,
    growthStart: new Date(),
    growthEnd: new Date(moment().add(7, 'days')),
    information: 'blablabla',
  })
}

module.exports = {
  Image,
  Plant,
  mockData,
}
