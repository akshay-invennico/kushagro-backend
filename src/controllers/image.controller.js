const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const uploadImages = catchAsync(async (req, res) => {
  const { files } = req;

  if (!files || files.length === 0) {
    if (req.file) {
      return res.status(httpStatus.CREATED).send({
        message: 'Image uploaded successfully',
        image: req.file.location,
      });
    }
  }

  const locations = files ? files.map((file) => file.location) : [];

  res.status(httpStatus.CREATED).send({
    message: 'Images uploaded successfully',
    images: locations,
  });
});

module.exports = {
  uploadImages,
};
