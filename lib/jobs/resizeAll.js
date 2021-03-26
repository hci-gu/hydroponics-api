const promiseSeries = require('../promiseSeries')
const aws = require('../aws')

const resizeImage = async (image) => {
  console.log('resize image', image.imageUrl)
  if (image.imageUrl.indexOf('original') === -1) {
    return image
  }
  const fileName = image.imageUrl.replace(
    'https://hydroponics-pictures.s3.eu-north-1.amazonaws.com/original/',
    ''
  )
  const newImageUrl = await aws.resize(fileName)
  image.imageUrl = newImageUrl
  await image.save()
  return image
}

module.exports = async (images) => promiseSeries(images, resizeImage)
