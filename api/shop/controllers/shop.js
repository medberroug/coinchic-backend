'use strict';

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
            { name: 'Tous', shops: [] },
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
                topShopsByCategories.push({
                    name: allPopularShops[i].type,
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
    }
};








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