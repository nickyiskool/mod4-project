const express = require('express');
const { Spot } = require('../../db/models');
const { SpotImage } = require('../../db/models');
const { User } = require('../../db/models');
const { Review } = require('../../db/models');
const { Booking } = require('../../db/models');
const { Op } = require('sequelize');
const router = express.Router();



router.post('/create', async (req, res) => {
    const {address, city, state, country, lat, lng, name, description, price} = req.body;
    

    if(!address || !city || !state || !country || !lat || !lng || !name || !description || !price) {
       return res.status(400).json({
            message: "Bad Request", 
        errors: {
        address: "Street address is required",
        city: "City is required",
        state: "State is required",
        country: "Country is required",
        lat: "Latitude must be within -90 and 90",
        lng: "Longitude must be within -180 and 180",
        name: "Name must be less than 50 characters",
        description: "Description is required",
        price: "Price per day must be a positive number"
      }
        })
    } else {
        const spot = await Spot.create({ address, city, state, country, lat, lng, name, description, price, ownerId: req.user.id });
        res.status(201).json(spot)
}

})

router.get('/', async (req, res) => {
    
    res.json({
        Spots: await Spot.findAll()
    })
  })

router.get('/:spotId', async (req, res) => {
    const spotId = req.params.spotId;
    const spot = await Spot.findByPk(spotId)

    if(!spot) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        })
    }

    res.json(await Spot.findOne({
      where: {
        id:spotId
      },
      include: [{
        model: User,
        as: 'Owner',
        attributes: ['id', 'firstName', 'lastName']
        },
        
            {model: SpotImage,
            where: {
                spotId: spotId
            },
            attributes: ['id', 'url', 'preview']}]
        
      
    }))
  });

  router.post('/:spotId/addImg', async (req, res) => {
    const {url, preview} = req.body;
    const {spotId} = req.params;
    const id = parseInt(spotId);

    if(await Spot.findByPk(spotId)) {
        
    const newImg = await SpotImage.create({url, spotId:id, preview});

    const response = {
    id: newImg.id,
    url: newImg.url,
    preview: newImg.preview,
};

    res.status(201).json(response)
} else {
        res.status(404).json({
            message:"Spot couldn't be found"
        })
    }

  });

  router.put('/:spotId/edit', async (req, res) => {
    const {address, city, state, country, lat, lng, name, description, price} = req.body
    const spotId = req.params.spotId;
    const spot = await Spot.findByPk(spotId);

    if (!spot) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        });
    }
    
    if(!address || !city || !state || !country || !lat || !lng || !name || !description || !price) {
        return res.status(400).json({
             message: "Bad Request", 
         errors: {
         address: "Street address is required",
         city: "City is required",
         state: "State is required",
         country: "Country is required",
         lat: "Latitude must be within -90 and 90",
         lng: "Longitude must be within -180 and 180",
         name: "Name must be less than 50 characters",
         description: "Description is required",
         price: "Price per day must be a positive number"
       }
         })
     } 

     await Spot.update({address, city, state, country, lat, lng, name, description, price, ownerId: req.user.id},
        {where: {id: spotId}}
    );

    const otherSpot = await Spot.findByPk(spotId)
    
    res.json(otherSpot)
  })

router.delete('/:spotId/delete', async (req, res) => {
    const spotId = req.params.spotId;
    const spot = await Spot.findByPk(spotId)

    if(!spot) {
       return res.status(404).json({
            message: "Spot couldn't be found"
        })
    };

    await Spot.destroy({
        where: {
            id: spotId
        }
    })

    res.json({
        message: "Successfully deleted"
    })
});

router.get('/:spotId/reviews', async (req, res) => {
    const spotId = req.params.spotId;
    const spot = await Spot.findByPk(spotId)
    if(!spot) {
       return res.status(404).json({
            message: "Spot couldn't be found"
        })
    }
    const review = await Review.findAll({
        where: {
            spotId: spotId
        },
        include: {
            model: User,
            attributes: ['id','firstName','lastName']
        },
            model: ReviewImage,
            attributes: ['id', 'url']
    })

    res.json(review)
});

router.post('/:spotId/review/create', async (req, res) => {
    const spotId = req.params.spotId;
    const spot = await Spot.findByPk(spotId);
    const currentReview = await Review.findOne({
        where: {
            spotId: spotId
        }
    });
    const {review, stars} = req.body
    if(!review || !stars) {
        return res.status(400).json({
            message: "Bad Request",
            errors: {
                review: "Review text is required",
                stars: "Stars must be an integer from 1 to 5",
            }
        })
    };
    if(currentReview) {
        return res.status(500).json({
            message: "User already has a review for this spot"
        })
    }
    if(!spot) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        })
    };
    
    const newReview = await Review.create({review, stars, userId:req.user.id, spotId:spot.id});

    res.status(201).json(newReview)
});

router.get('/:spotId/bookings', async (req, res) => {
    const spotId = req.params.spotId;
    const spot = await Spot.findByPk(spotId)
    const bookings = await Booking.findAll({
        where: {
          spotId
        }
      });
      if(bookings && spot.ownerId !== req.user.id) {
        return res.status(200).json(bookings)
      };

      if(bookings && spot.ownerId === req.user.id) {
        const booked = await Booking.findAll({
            where: {
              spotId
            },
            include: {
                model: User,
                attributes: ['id', 'firstName', 'lastName']
            }
          });
        return res.status(200).json(booked)
      }
      if(!bookings) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        })
      }
});

router.post('/:spotId/bookings/create', async (req,res) => {
    const {startDate, endDate} = req.body;
    const spotId = req.params.spotId;
    const spot = await Spot.findByPk(spotId)
    const id = parseInt(spotId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    if(!startDate || !endDate) {
        return res.status(400).json({
            message: "Bad Request", 
            errors: {
            startDate: "startDate cannot be in the past",
            endDate: "endDate cannot be on or before startDate"
           }
        })
    };
    if(!spot) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        })
    };
    const bookingConflict = await Booking.findOne({
        where: {
            spotId: spotId,
        },
        [Op.or]: [{
            startDate: {[Op.lt]: end}
        },
        {
             endDate: {[Op.gt]: start}
        },
        
    ]
    })
    if(bookingConflict) {
        return res.status(403).json({
           message: "Sorry, this spot is already booked for the specified dates",
           errors: {
           startDate: "Start date conflicts with an existing booking",
           endDate: "End date conflicts with an existing booking"
  } 
        })
    }

    const booking = await Booking.create({startDate, endDate, spotId:id, userId:req.user.id});
    

    res.status(201).json(booking)
});

router.delete('/:spotId/spotImages/:imageId/delete', async (req, res) => {
    const imageId = req.params.imageId;
    const image = await SpotImage.findByPk(imageId)

    if(!image) {
       return res.status(404).json({
            message: "Spot Image couldn't be found"
        })
    };

    await SpotImage.destroy({
        where: {
            id: imageId
        }
    })

    res.json({
        message: "Successfully deleted"
    })
})

router.get('/', async (req, res) => {
    const {page = 1, size = 20, minLat, maxLat, minLng, maxLng, minPrice, maxPrice} = req.query;
    const filters = {};

    // if(Number.isNaN(page) || page < 1) page = 1;
    // if(Number.isNaN(size) || size > 20 || size < 1) size = 20;

    if(minLat) filters.lat = {[Op.gte]: parseFloat(minLat)};
    if(maxLat) filters.lat = {...filters.lat,[Op.lte]: parseFloat(maxLat)};
    if(minLng) filters.lng = {[Op.gte]: parseFloat(minLng)};
    if(maxLng) filters.lng = {...filters.lng,[Op.lte]: parseFloat(maxLng)};
    if(minPrice) filters.price = {[Op.gte]: parseFloat(minPrice)};
    if(maxPrice) filters.price = {...filters.price,[Op.lte]: parseFloat(maxPrice)};

    if(page < 1 || size > 20 || !minLat || !maxLat || !minLng || !maxLng || !minPrice || !maxPrice) {
       return res.status(400).json({
        message: "Bad Request", 
        errors: {
          page: "Page must be greater than or equal to 1",
          size: "Size must be between 1 and 20",
          maxLat: "Maximum latitude is invalid",
          minLat: "Minimum latitude is invalid",
          minLng: "Maximum longitude is invalid",
          maxLng: "Minimum longitude is invalid",
          minPrice: "Minimum price must be greater than or equal to 0",
          maxPrice: "Maximum price must be greater than or equal to 0"
       }
     })
    }

    const filtered = await Spot.findAll({
        where: filters,
        limit: size,
        offset: (page-1) * size
    })

    res.json(filtered)
} )

module.exports = router;