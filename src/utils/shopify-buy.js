import Client from "shopify-buy"

const client = Client.buildClient({
  domain: process.env.GATSBY_STOREFRONT_DOMAIN,
  storefrontAccessToken: process.env.GATSBY_STOREFRONT_ACCESS_TOKEN
})

export const fetchProductByHandle = async (handle) => {
  try {
    const product = await client.product.fetchByHandle(handle ||  'truths-we-confess-hardcover')

    return product
  } catch(e) {
    return e
  }
}

export const updateLineItem = async (checkoutId, updatedVariant) => {
  if(!checkoutId || !updatedVariant) {
    throw new Error(`Must include a checkoutId and a variantId`)
  }

  const lineItemsToUpdate = [updatedVariant]

  try {
    return await client.checkout.updateLineItems(checkoutId, lineItemsToUpdate)
  } catch (e) {
    const error = JSON.parse(e.message)?.[0]
    if(
      error.message === "Line item with id  not found" || 
      error.message === "invalid id"
    ) {
      return { invalidId: true }
    }
    throw new Error(e)
  }
}

export const addLineItem = async (checkoutId, variantId, customAttributes) => {
  if(!checkoutId || !variantId) {
    throw new Error(`Must include a checkoutId and a variantId`)
  }

  let lineItem = {
    variantId,
    quantity: 1
  }

  if(customAttributes) {
    lineItem.customAttributes = customAttributes
  }

  const lineItems = [lineItem]

  try {
    const cart = await client.checkout.addLineItems(checkoutId, lineItems)

    console.log(`CART: `, cart)
    return cart
  } catch (e) {
    const error = JSON.parse(e.message)?.[0]
    
    if(error.message === "invalid id") {
      return { invalidId: true }
    }
    
    throw new Error(e)
  }
}

export const removeLineItem = async (checkoutId, lineItemId) => {
  if(!checkoutId || !lineItemId) {
    throw new Error(`Must include a checkoutId and a lineItemId`)
  }

  const lineItems = [lineItemId]

  try {
    return await client.checkout.removeLineItems(checkoutId, lineItems)
  } catch (e) {
    const error = JSON.parse(e.message)?.[0]

    if(error.message === "invalid id") {
      return { invalidId: true }
    }

    throw new Error(e)
  }
}

export const createCheckout = async () => {
  try {
    return await client.checkout.create()
  } catch (e) {
    throw new Error(e)
  }
}

export const fetchCheckout = async (checkoutId) => {
  if(!checkoutId) {
    throw new Error(`Must include a checkoutId`)
  }

  try {
    const checkout = await client.checkout.fetch(checkoutId)

    return checkout
  } catch (e) {
    if (e?.[0]?.message === `Variable $id of type ID! was provided invalid value`) {
      return { invalidId: true }
    }
    throw new Error(e.message)
  }
}
