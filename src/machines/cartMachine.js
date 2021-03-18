import { Machine, assign, spawn } from "xstate"
import { 
  createCheckout, 
  fetchCheckout, 
  addLineItem
} from "../utils/shopify-buy"

import lineItemMachine from './lineItemMachine'

const CART_LS_KEY = "LIGONIER_CART_ID"

const initCart = {
  subtotal: 0,
  lineItems: [],
  id: null
}

const persist = (id) => {
  const storedId = localStorage.getItem(CART_LS_KEY)

  if (id !== storedId) {
    console.log(`ELLO`)
    localStorage.setItem(CART_LS_KEY, id)
  }
}

const cartMachine = Machine(
  {
    id: "cart",
    initial: "checkingForCartId",
    context: {
      cart: initCart,
      retries: 0,
      hasDonation: false,
      checkoutUrl: undefined
    },
    states: {
      checkingForCartId: {
        invoke: {
          src: "checkingForCartId"
        },
        on: {
          CART_ID_FOUND: {
            target: "loadingCartFromShopify",
            actions: ["saveCartId"]
          },
          CART_ID_NOT_FOUND: "creatingCartId"
        }
      },
      loadingCartFromShopify: {
        invoke: {
          src: "loadingCartFromShopify"
        },
        on: {
          CART_LOADED: {
            target: "idle",
            actions: ["saveCart", "saveCartMeta"]
          },
          CART_NOT_LOADED: [
            {
              target: "loadingCartFromShopify",
              cond: "canRetry",
              actions: ["increaseRetries"]
            },
            {
              target: "creatingCartId",
              actions: ["clearCart", "clearRetries"]
            }
          ],
          CART_ID_INVALID: {
            target: "creatingCartId",
            actions: ["clearCart"]
          }
        }
      },
      creatingCartId: {
        invoke: {
          src: "creatingCartId",
          onDone: {
            target: "idle",
            actions: ["saveCartMeta"]
          },
          onError: [
            {
              target: "creatingCartId",
              cond: "canRetry",
              actions: ["increaseRetries"]
            },
            {
              target: "failure",
              actions: ["clearRetries"]
            }
          ]
        }
      },
      failure: {
        type: "final"
      },
      idle: {
        on: {
          BLAH: {
            actions: (ctx, event) => {
              console.log(`ctx`, ctx)
              console.log(`event`, event)
            }
          },
          ADD_LINE_ITEM: "addingLineItem",
          SAVE_CART: {
            target: "idle",
            actions: ["saveCart"]
          }
        }
      },
      addingLineItem: {
        invoke: {
          src: "addLineItem"
        },
        on: {
          LINE_ITEM_ADDED: {
            target: "idle",
            actions: ["saveCart"]
          },
          LINE_ITEM_INVALID: {
            target: "idle",
            // TODO: maybe add a notification state so the user knows this product is invalid
          },
          LINE_ITEM_NOT_ADDED: [
            {
              target: "addingLineItem",
              cond: "canRetry",
              actions: ["increaseRetries"]
            },
            {
              target: "idle",
              actions: ["clearRetries"] // TODO: maybe add a notification state so the user can know their item wasn't added to cart
            }
          ]
        }
      }
    }
  },
  {
    services: {
      addLineItem: (context, event) => async (cb) => {
        const cartId = context?.cart?.id
        const variantId = event?.variantId
        const customAttributes = event?.customAttributes

        try {
          const cart = await addLineItem(cartId, variantId, customAttributes)
          if(cart.invalidId) {
            alert("ITEM INVALID")
            cb("LINE_ITEM_INVALID")
            return
          }
          alert("ITEM ADDED")
          cb({ type: "LINE_ITEM_ADDED",  data: cart })
        } catch (e) {
          console.log(`E: `, e)
          alert("ITEM NOT ADDED")
          cb({ type: "LINE_ITEM_NOT_ADDED",  data: e })
        } 
      },
      checkingForCartId: () => (cb) => {
        const cartId = localStorage.getItem(CART_LS_KEY)

        if (cartId) {
          cb({ type: "CART_ID_FOUND", data: cartId })
        } else {
          cb("CART_ID_NOT_FOUND")
        }
      },
      creatingCartId: async () => {
        try {
          const checkout = await createCheckout()

          if(!checkout?.id || !checkout?.webUrl) throw new Error(`Something went wrong creating a checkout please try again`)

          return checkout
        } catch (e) {
          throw new Error(e)
        }
      },
      loadingCartFromShopify: (_, event) => async (cb) => {
        const cartId = event.data 

        try {
          if (cartId) {
            const cart = await fetchCheckout(cartId)
            if(cart.invalidId) {
              cb("CART_ID_INVALID")
              return
            }
            if (cart) {
              cb({ type: "CART_LOADED", data: cart })
            }
          } else {
            // if cartId is invalid from shopify create new ID immediatly
            cb("CART_ID_INVALID")
          }
        } catch (e) {
          // may need to add an invalid cartId check here as well
          cb({ type: "CART_NOT_LOADED", error: e })
        }
      },
     },
    actions: {
      saveCartId: assign((ctx, event) => {
        const updatedCtx = {}
        const id = event.data

        persist(id)

        if(!ctx.cart.id) {
          updatedCtx.cart = {
            ...ctx.cart,
            id
          }
        }
        return updatedCtx
      }),
      saveCartMeta: assign((ctx, event) => {
        const updatedCtx = {}
        const checkout = event.data
        const { id, webUrl } = checkout

        if(!ctx.cart.id) {
          updatedCtx.cart = {
            ...ctx.cart,
            id
          }
        }
        if(!ctx.checkoutUrl) {
          updatedCtx.checkoutUrl = webUrl
        }

        persist(id)

        return updatedCtx
      }),
      saveCart: assign((context, event) => {
        const cart = event.data

        const lineItems = cart.lineItems.map((lineItem) => {
          let updatedLineItem = { ...lineItem }
          const { customAttributes } = lineItem

          // attach custom attributes to the product
          customAttributes.forEach(({ attrs }) => {
            const { key, value } = attrs
           
            updatedLineItem[key.value] = value.value
          })
          
          return {
            ...updatedLineItem,
            ref: spawn(lineItemMachine({ ...updatedLineItem, cartId: cart.id || context.cart.id }), lineItem.id)
          }
        })

        const updatedContext = {
          cart: {
            ...context.cart,
            lineItems,
            subtotal: cart.subtotalPrice,
          },
          hasDonation: !!lineItems.find(({ productType }) => productType === "donation")
        }

        return updatedContext
      }),
      increaseRetries: assign((context) => {
        return {
          retries: (context.retries += 1)
        }
      }),
      clearCart: assign((context) => {
        // only way to fix ts error to include context in args :/
        localStorage.removeItem(CART_LS_KEY)

        return { cart: initCart }
      }),
      clearRetries: assign((context) => {
        // only way to fix ts error to include context in args :/

        return { retries: 0 }
      })
    },
    guards: {
      canRetry: (context) => context.retries < 1 // retry 3 times
    }
  }
)

export default cartMachine
