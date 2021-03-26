const AWS = require('aws-sdk')
const sharp = require('sharp')

const { BUCKET_NAME, REGION, KEY, SECRET } = process.env

const s3 = new AWS.S3({
  accessKeyId: KEY,
  secretAccessKey: SECRET,
  region: REGION,
  signatureVersion: 'v4',
})

const resize = async (fileName) => {
  const imageData = await getImage(fileName)
  const resized = await sharp(imageData)
    .resize(1280, 966)
    .toFormat('jpeg')
    .toBuffer()
  return saveImage('modified', fileName, resized)
}

const getImage = async (fileName) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `original/${fileName}`,
    }
    s3.getObject(params, (err, data) => {
      if (err) reject(err)
      console.log(data)
      resolve(data.Body)
    })
  })
}

const saveImage = async (path, fileName, image) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `${path}/${fileName}`,
      Body: Buffer.from(image, 'base64'),
      ContentEncoding: 'base64',
      ContentType: 'image/png',
      ACL: 'public-read-write',
    }
    s3.putObject(params, (err, data) => {
      if (err) reject(err)
      resolve(
        `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${path}/${fileName}`
      )
    })
  })
}

module.exports = {
  saveImage: async (path, fileName, image) => {
    await saveImage(path, fileName, image)
    const url = await resize(fileName)
    return url
  },
  getImage,
  resize,
}
