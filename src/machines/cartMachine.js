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

const cartMachine = Machine(
  {
    id: "cart",
    initial: "checkingForCartId",
    context: {
      cart: initCart,
      retries: 0,
      productModals: undefined
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
            actions: ["saveCart"]
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
            actions: ["saveCartId"]
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

        try {
          const cart = await addLineItem(cartId, variantId)
          if(cart.invalidId) {
            alert("ITEM INVALID")
            cb("LINE_ITEM_INVALID")
            return
          }
          alert("ITEM ADDED")
          cb({ type: "LINE_ITEM_ADDED",  data: cart })
        } catch (e) {
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

          if(!checkout?.id) throw new Error(`Something went wrong creating a checkout please try again`)

          return checkout?.id
        } catch (e) {
          throw new Error(e)
        }
      },
      loadingCartFromShopify: (context, event) => async (cb) => {
        const cartId = context.cart.id

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
        const cartId = event.data

        if (cartId) {
          localStorage.setItem(CART_LS_KEY, cartId)
        }

        return {
          cart: {
            ...ctx.cart,
            id: cartId
          }
        }
      }),
      saveCart: assign((_, event) => {
        const cart = event.data

        return {
          cart: {
            id: cart.id,
            lineItems: cart.lineItems.map((lineItem) => ({
              ...lineItem,
              ref: spawn(lineItemMachine(lineItem), lineItem.id)
            })),
            subtotal: cart.subtotalPrice
          }
        }
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
