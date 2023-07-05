'use strict';
var isWithinInterval = require('date-fns/isWithinInterval')
var parseISO = require('date-fns/parseISO')
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async getTopShops(ctx) {
        // entities = await strapi.services.restaurant.find(ctx.query);
        const { clientId } = ctx.params;
        let allPopularShops = await strapi.services.shop.find({
            status: true,
            popular: true
        });
        let categories = await strapi.services.categories.find({
            status: true
        })
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        let topShopsByCategories = [
            { name: 'Tous', icon: "/uploads/all_inclusive_116777_1246fe2ee6.png?2659324.100000024", shops: [] },
        ]
        for (let i = 0; i < allPopularShops.length; i++) {
            let insterted = false
            for (let j = 0; j < topShopsByCategories.length; j++) {
                if (topShopsByCategories[j].name == allPopularShops[i].type) {
                    insterted = true
                    topShopsByCategories[j].shops.push(
                        returnShopDataForApp(allPopularShops[i], client)
                    )
                    topShopsByCategories[0].shops.push(
                        returnShopDataForApp(allPopularShops[i], client)
                    )

                }
            }
            if (!insterted) {
                let myIcon = null
                for (let k = 0; k < categories.length; k++) {
                    if (categories[k].name == allPopularShops[i].type) {
                        myIcon = categories[k].icon ? categories[k].icon.url : null
                    }
                }
                topShopsByCategories.push({
                    name: allPopularShops[i].type,
                    icon: myIcon,
                    shops: [
                        returnShopDataForApp(allPopularShops[i], client)
                    ]
                })
                topShopsByCategories[0].shops.push(
                    returnShopDataForApp(allPopularShops[i], client)
                )
            }
        }
        return topShopsByCategories

    },
    async visitLater(ctx) {
        const { clientId } = ctx.params;
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        let shopIdsArray = []
        for (let i = 0; i < client.visitLater.length; i++) {
            shopIdsArray.push(client.visitLater[i].shop.id)
        }

        let allShops = await strapi.services.shop.find({
            status: true,
            id_in: shopIdsArray
        });
        let visitLaterShops = []
        allShops.forEach(shop => {
            visitLaterShops.push(returnShopDataForApp(shop, client))
        });
        return visitLaterShops
    },
    async getAllShops(ctx) {
        const { clientId } = ctx.params;
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        let allShops = await strapi.services.shop.find({
            status: true,
        });
        let allShopsToBeReturned = []
        allShops.forEach(shop => {
            allShopsToBeReturned.push(returnShopDataForApp(shop, client))
        });
        return allShopsToBeReturned
    },
    async getOneShop(ctx) {
        const { clientId, shopId } = ctx.params;
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        let shop = await strapi.services.shop.findOne({
            id: shopId,
        });

        let myShop = {
            id: shop.id,
            name: shop.name,
            firstImage: shop.firstImage ? shop.firstImage.url : null,
            type: shop.type,
            subType: shop.subType,
            avgReview: shop.avgReview,
            address: shop.address.street + ', ' + shop.address.city,
            liked: isLiked(client, shop.id),
            isVisited: isVisited(client, shop.reviews),
            isVisitLater: isVisitLater(client, shop.id),
            popular: shop.popular,
            phone: shop.phone,
            images: returnShopImages(shop),
            videos: returnShopVideos(shop),
            reviews: returnShopReviews(shop),
            description: shop.description,
            menuAdded: shop.catalog.length > 0 ? true : false,
        }
        return myShop
    },
    async getShopMenu(ctx) {
        const { shopId } = ctx.params;
        let shop = await strapi.services.shop.findOne({
            id: shopId,
        });
        return shop.catalog
    },
    async likeController(ctx) {
        const { clientId, shopId } = ctx.params;
        let shop = await strapi.services.shop.findOne({
            id: shopId,
        });
        let client = await strapi.services.client.findOne({
            id: clientId
        })

        let liked = isLiked(client, shop.id)
        console.log(liked);
        if (!liked) {
            client.likes.push({
                shop: { id: shop.id },
                date: new Date()
            })
        } else {
            let myNewList = []
            for (let i = 0; i < client.likes.length; i++) {
                if (client.likes[i].shop.id != shopId) {
                    myNewList.push(client.likes[i])
                }
            }
            client.likes = myNewList
        }
        console.log(client.likes);
        await strapi.services.client.update({ id: clientId }, {
            likes: client.likes
        });
        return true
    },
    async visitLaterController(ctx) {
        const { clientId, shopId } = ctx.params;
        let shop = await strapi.services.shop.findOne({
            id: shopId,
        });
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        client.visitLater.push({
            shop: { id: shopId },
            date: new Date()
        })
        await strapi.services.client.update({ id: clientId }, {
            visitLater: client.visitLater
        });
        return true
    },
    async visitedController(ctx) {
        const { clientId, shopId } = ctx.params;
        let rating = ctx.request.body.rating
        let feedback = ctx.request.body.feedback
        let shop = await strapi.services.shop.findOne({
            id: shopId,
        });
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        let myNewList = []
        for (let i = 0; i < client.visitLater.length; i++) {
            if (client.visitLater[i].shop.id != shopId) {
                myNewList.push(client.visitLater[i])
            }
        }
        let myComment = feedback
        if (!myComment) {
            myComment = '-'
        }
        let myRating = rating
        if (!myRating) {
            myRating = shop.avgReview
        }
        shop.reviews.push({
            client: { id: clientId },
            comment: myComment,
            rating: myRating,
            date: new Date()
        })
        await strapi.services.client.update({ id: clientId }, {
            visitLater: myNewList,
        });
        await strapi.services.shop.update({ id: shopId }, {
            reviews: shop.reviews,
            avgReview: calculateNewRating(shop, myRating)
        })
        return true

    },
    async getOffers(ctx) {
        const { clientId } = ctx.params;
        let shops = await strapi.services.shop.find();
        let client = await strapi.services.client.findOne({
            id: clientId
        })

        let myShops = []
        for (let i = 0; i < shops.length; i++) {
            if (shops[i].offer) {
                if (isWithinInterval(new Date(), {
                    start: parseISO(shops[i].offer.from),
                    end: parseISO(shops[i].offer.to)
                })) {
                    myShops.push({
                        id: shops[i].id,
                        name: shops[i].name,
                        firstImage: shops[i].firstImage ? shops[i].firstImage.url : null,
                        type: shops[i].type,
                        subType: shops[i].subType,
                        avgReview: shops[i].avgReview,
                        address: shops[i].address.street + ', ' + shops[i].address.city,
                        liked: isLiked(client, shops[i].id),
                        isVisited: isVisited(client, shops[i].reviews),
                        isVisitLater: isVisitLater(client, shops[i].id),
                        popular: shops[i].popular,
                        offer: shops[i].offer.offer
                    })
                }
            }
        }
        if (myShops.length > 0) {
            return {
                show: true,
                shops: myShops
            }
        } else {
            return {
                show: false,
                shops: []
            }
        }
    },
    async createShop(ctx) {
        const { clientId } = ctx.params;
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        // let rating = ctx.request.body.rating
        let myNewShop = {
            name: ctx.request.body.name,
            type: ctx.request.body.type,
            subType: ctx.request.body.subType,
            address: {
                street: ctx.request.body.street,
                city: ctx.request.body.city,
                country: ctx.request.body.country,
                lat: ctx.request.body.lat.match(/lat: (\d+\.\d+)/) ? ctx.request.body.lat.match(/lat: (\d+\.\d+)/)[1] : 0,
                long: ctx.request.body.long.match(/lng: (-?\d+\.\d+)/) ? ctx.request.body.long.match(/lng: (-?\d+\.\d+)/)[1] : 0,
            },
            avgReview: 5,
            phone: ctx.request.body.phone,
            description: ctx.request.body.description,

        }
        let createdShop = await strapi.services.shop.create(myNewShop);
        await strapi.plugins['users-permissions'].services.user.edit({ id: client.user.id }, { shop: createdShop.id });
        return createdShop.id
    },
    async addFilesToShop(ctx) {
        const { shopId } = ctx.params;
        let shop = await strapi.services.shop.findOne({
            id: shopId,
        });
        let fileId = ctx.request.body.fileId
        let type = ctx.request.body.type
        if (type == "firstImage") {
            await strapi.services.shop.update({ id: shopId }, {
                firstImage: {
                    id: fileId
                },
            })
        } else if (type == "images") {
            shop.images.push({
                id: fileId
            })
            await strapi.services.shop.update({ id: shopId }, {
                images: shop.images,
            })
        } else if (type == "videos") {
            shop.videos.push({
                id: fileId
            })
            await strapi.services.shop.update({ id: shopId }, {
                videos: shop.videos,
            })
        }

        return true

    },
    async getProfile(ctx) {
        const { clientId } = ctx.params;
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        let myShop = null
        let shopPending = false
        if (client.user.shop) {
            let shop = await strapi.services.shop.findOne({
                id: client.user.shop,
            });
            if (shop.waitingValidation) {
                shopPending = true
            } else {
                myShop = shop
            }
        }

        let myProfile = {
            name: client.name,
            shopExist: client.user.shop ? true : false,
            shopPending: shopPending,
            shop: myShop

        }
        return myProfile

    },
    async getCategories(ctx) {
        let categories = await strapi.services.categories.find({
            status: true
        })
        let myCategories = []
        for (let i = 0; i < categories.length; i++) {
            myCategories.push(categories[i].name)
        }
        return myCategories
    },
    async search(ctx) {
        const { searchTerm, clientId } = ctx.params;
        let myresult = await strapi.query('shop').model.query(qb => {
            qb.where('name', 'LIKE', `%${searchTerm}%`)
                .orWhere('description', 'LIKE', `%${searchTerm}%`)
                .orWhere('subType', 'LIKE', `%${searchTerm}%`)
                .orWhere('Type', 'LIKE', `%${searchTerm}%`);
        }).fetchAll();
        myresult = myresult.toJSON()
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        let myShops = []
        console.log(myresult);
        for (let i = 0; i < myresult.length; i++) {

            myShops.push(returnShopDataForApp(myresult[i], client))
        }
        return myShops
    },
    async filter(ctx) {
        const { type, city, stars, popular, clientId } = ctx.query;
        let client = await strapi.services.client.findOne({
            id: clientId
        })
        // Fetch all restaurants
        let resultsArray = await strapi.services.shop.find({
            status: true,
        });
        // let resultsArray = result.toJSON(); // Convert to plain array

        // Perform filtering
        if (type) {
            resultsArray = resultsArray.filter(shop => shop.type === type);
        }
        if (city) {
            resultsArray = resultsArray.filter(shop => shop.address && shop.address.city === city);
        }
        if (stars) {
            resultsArray = resultsArray.filter(shop => shop.avgReview >= stars);
        }
        if (popular && (popular === 'true')) {
            resultsArray = resultsArray.filter(shop => shop.popular === (popular === 'true'));
        }
        let myShops = []
        // resultsArray = result.toJSON(); // Convert to plain array
        for (let i = 0; i < resultsArray.length; i++) {

            myShops.push(returnShopDataForApp(resultsArray[i], client))
        }
        return myShops;
    },
    async KPIShopManager(ctx) {
        const { clientId } = ctx.params;
        let clientX = await strapi.services.client.findOne({
            id: clientId
        })

        let shop = await strapi.services.shop.findOne({
            id: clientX.user.shop,
        });
        let client = await strapi.services.client.find()
        let avgReview = null
        let likes = 0
        let visitLater = 0
        avgReview = shop.avgReview
        for (let i = 0; i < client.length; i++) {
            for (let j = 0; j < client[i].likes.length; j++) {
                if (shop.id == client[i].likes[j].shop.id) {
                    likes = likes + 1
                }
            }
            for (let k = 0; k < client[i].visitLater.length; k++) {
                if (shop.id == client[i].visitLater[k].shop.id) {
                    visitLater = visitLater + 1
                }
            }

        }
        return {
            shopId: shop.id,
            name: shop.name,
            avgReview: avgReview,
            likes: likes,
            visitLater: visitLater,
            isCatalog: shop.catalog.length > 0 ? true : false,
            isActive: shop.status
        }
    },

    async editMenu(ctx) {
        const { shopId } = ctx.params;
        let shop = await strapi.services.shop.findOne({
            id: shopId,
        });
        if (ctx.request.body.action == "create") {
            shop.catalog.push({
                categoryName: ctx.request.body.categoryName,
                items: []
            })
            await strapi.services.shop.update({ id: shopId }, {
                catalog: shop.catalog,
            })
            return true
        } else if (ctx.request.body.action == "edit") {
            for (let i = 0; i < shop.catalog.length; i++) {
                if (shop.catalog[i].id == ctx.request.body.catalogId) {
                    shop.catalog[i].categoryName = ctx.request.body.categoryName
                    await strapi.services.shop.update({ id: shopId }, {
                        catalog: shop.catalog,
                    })
                    return true
                }
            }
        } else if (ctx.request.body.action == "delete") {
            for (let i = 0; i < shop.catalog.length; i++) {

                if (shop.catalog[i].id == ctx.request.body.catalogId) {
                    shop.catalog.splice(i, 1)
                    await strapi.services.shop.update({ id: shopId }, {
                        catalog: shop.catalog,
                    })
                    return true
                }
            }
        }
    },

    async editArticle(ctx) {
        const { shopId } = ctx.params;
        let shop = await strapi.services.shop.findOne({
            id: shopId,
        });
       if (ctx.request.body.action == "create") {
            for (let i = 0; i < shop.catalog.length; i++) {
                if (shop.catalog[i].id == ctx.request.body.catalogId) {
                    shop.catalog[i].items.push({
                        name: ctx.request.body.name,
                        description: ctx.request.body.description,
                        price: ctx.request.body.price
                    })
                    await strapi.services.shop.update({ id: shopId }, {
                        catalog: shop.catalog,
                    })
                    return true
                }
            }
        } else if (ctx.request.body.action == "delete") {
            for (let i = 0; i < shop.catalog.length; i++) {
                if (shop.catalog[i].id == ctx.request.body.catalogId) {
                    
                    for(let j=0;j<shop.catalog[i].items.length;j++){
                        if(shop.catalog[i].items[i].id == ctx.request.body.itemId){
                            shop.catalog[i].items.splice(j, 1)
                        }
                    }
                    await strapi.services.shop.update({ id: shopId }, {
                        catalog: shop.catalog,
                    })
                    return true
                }
            }
        }
    }



};




// /filter/1?type=Bar&stars=5&popular=true&city=Paris



function isLiked(client, shopID) {
    for (let i = 0; i < client.likes.length; i++) {
        if (client.likes[i].shop.id == shopID) {
            return true
        }
    }
    return false
}
function isVisitLater(client, shopID) {
    for (let i = 0; i < client.visitLater.length; i++) {
        if (client.visitLater[i].shop.id == shopID) {
            return true
        }
    }
    return false
}

function isVisited(client, shopReviews) {
    for (let i = 0; i < shopReviews.length; i++) {
        if (shopReviews[i].client.id == client.id) {
            return true
        }
    }
    return false
}

function returnShopDataForApp(shop, client) {
    return {
        id: shop.id,
        name: shop.name,
        firstImage: shop.firstImage ? shop.firstImage.url : null,
        type: shop.type,
        subType: shop.subType,
        avgReview: shop.avgReview,
        address: shop.address.street + ', ' + shop.address.city,
        liked: isLiked(client, shop.id),
        isVisited: isVisited(client, shop.reviews),
        isVisitLater: isVisitLater(client, shop.id),
        popular: shop.popular
    }
}
function returnShopImages(shop) {
    let myImages = []
    for (let i = 0; i < shop.images.length; i++) {
        myImages.push(shop.images[i].url)
    }
    return myImages
}

function returnShopVideos(shop) {
    let myVideos = []
    for (let i = 0; i < shop.videos.length; i++) {
        myVideos.push(shop.videos[i].url)
    }
    return myVideos
}

function returnShopReviews(shop) {
    let myReviews = []
    for (let i = 0; i < shop.reviews.length; i++) {
        myReviews.push({
            comment: shop.reviews[i].comment,
            rating: shop.reviews[i].rating,
            client: shop.reviews[i].client.name,
        })
    }
    return myReviews
}

function calculateNewRating(shop, rating) {
    console.log("XXXXXXXXXRATUNG");
    let myNewRating = 0
    for (let i = 0; i < shop.reviews.length; i++) {
        console.log(shop.reviews[i].rating);
        myNewRating = myNewRating + parseFloat(shop.reviews[i].rating)
    }
    console.log(myNewRating);
    if (shop.reviews.length > 0) {

        return (myNewRating / shop.reviews.length).toFixed(2)
    }
    return rating.toFixed(2)
}