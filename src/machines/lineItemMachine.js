import { 
  Machine, 
  sendParent,
  assign,
  spawn 
} from "xstate"
import { 
  removeLineItem,
  updateLineItem
} from "../utils/shopify-buy"
import modalMachine from "./modalMachine"


const lineItemMachine = ({ id, title, variant, quantity, cart }) =>  Machine(
  {
    id: "lineItem",
    initial: "idle",
    context: {
      id,
      title,
      variant,
      quantity,
      retries: 0,
      modal: {
        isOpen: false,
        ref: undefined
      }
    },
    states: {
      idle: {
        on: {
          CHANGE_QTY_LINE_ITEM: "changingLineItemQty",
          REMOVE_LINE_ITEM: {
            actions: ((ctx, eve) => {
              console.log(`CTX: `, ctx)
              console.log(`Eve: `, eve)

              return ctx
            })
          },
        }
      },
      loadingModal: {
        entry: assign({
          modal: {
            isOpen: true,
            ref: (ctx) => spawn(modalMachine, `modalMachine: ${ctx.id}`)
          }
        }),
        on: {
          REMOVE: {
            target: "removingLineItem",
            actions: ["closeModal"]
          },
          CANCEL: {
            target: "idle",
            actions: ["closeModal"]
          }
        }
      },
      removingLineItem: {
        invoke: {
          src: "removeLineItem"
        }, 
        on: {
          LINE_ITEM_REMOVED: {
            target: "removed",
            actions: ["saveCart"]
          },
          LINE_ITEM_INVALID: {
            target: "idle",
            // TODO: maybe add a notification state so the user knows this product is invalid
          },
          LINE_ITEM_NOT_REMOVED: [
            {
              target: "removingLineItem",
              cond: "canRetry",
              actions: ["increaseRetries"]
            },
            {
              target: "idle",
              actions: ["clearRetries"] // TODO: maybe add a notification state so the user can know their item wasn't added to cart
            }
          ]
        }
      },
      changingLineItemQty: {
        invoke: {
          src: "changeLineItemQty"
        },
        on: {
          LINE_ITEM_UPDATED: {
            target: "idle",
            actions: ["saveCart"]
          },
          LINE_ITEM_INVALID: {
            target: "idle",
            // TODO: maybe add a notification state so the user knows this product is invalid
          },
          LINE_ITEM_NOT_UPDATED: [
            {
              target: "changingLineItemQty",
              cond: "canRetry",
              actions: ["increaseRetries"]
            },
            {
              target: "idle",
              actions: ["clearRetries"] // TODO: maybe add a notification state so the user can know their item wasn't added to cart
            }
          ]
        }
      },
      removed: {
        type: `final`,
      }
    }
  },
  {
    actions: {
      closeModal: assign({ 
        modal: (ctx) => ({ ...ctx.modal, isOpen: false })
      }),
      increaseRetries: assign({ retries: (ctx) => (ctx.retries += 1) }),
      clearRetries: assign({ retries: 0 }),
      saveCart: sendParent((_, event) => ({
        type: "SAVE_CART",
        cart: event.data
      }))
    },
    guards: {
      canRetry: (context) => context.retries < 1 // retry 3 times
    },
    services: {
      removeLineItem: (context) => async (cb) => {
        const cartId = cart?.id

        try {
          const cart = await removeLineItem(cartId, context.id)

          if(cart.invalidId) {
            alert("ITEM INVALID")
            cb("LINE_ITEM_INVALID")
            return
          }
          alert("ITEM REMOVED")
          cb({ type:"LINE_ITEM_REMOVED", data: cart })
        } catch (e) {
          cb("LINE_ITEM_NOT_REMOVED")
        } 
      }, 
      changeLineItemQty: (context, event) => async (cb) => {
        const cartId = cart?.id
        const quantity = event?.quantity

        try {
          const cart = await updateLineItem(cartId, { id: context.id, quantity })

          if(cart.invalidId) {
            alert("ITEM INVALID")
            cb("LINE_ITEM_INVALID")
            return
          }
          alert("ITEM UPDATED")
          cb({ type: "LINE_ITEM_UPDATED", data: cart })
        } catch (e) {
          alert("ITEM NOT UPDATED")
          cb("LINE_ITEM_NOT_UPDATED")
        } 
      },
    }
  }
)

export default lineItemMachine
