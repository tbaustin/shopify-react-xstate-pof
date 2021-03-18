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


const lineItemMachine = ({ 
  id, title, variant, 
  quantity, cartId, productType,
  author, avaliableQty, backorder,
  preorder, format 
}) =>  Machine(
  {
    id: "lineItem",
    initial: "idle",
    context: {
      author, avaliableQty, backorder,
      preorder, format, id,
      title, variant, quantity,
      retries: 0, cartId, productType,
      modal: {
        isOpen: false,
        ref: undefined
      }
    },
    states: {
      idle: {
        on: {
          CHANGE_QTY_LINE_ITEM: "changingLineItemQty",
          REMOVE_LINE_ITEM: "loadingModal",
        }
      },
      loadingModal: {
        entry: assign({
          modal: () => ({
            isOpen: true,
            ref: spawn(modalMachine)
          })
        }),
        on: {
          REMOVE_ITEM: {
            target: "removingLineItem",
            actions: ["closeModal"]
          },
          CANCEL_MODAL: {
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
      closeModal: assign(() => {
        return { 
          modal: (ctx) => ({ ...ctx.modal, isOpen: false })
        }
      }),
      increaseRetries: assign({ retries: (ctx) => (ctx.retries += 1) }),
      clearRetries: assign({ retries: 0 }),
      saveCart: sendParent((_, event) => {
        console.log(`SAVING CART: `, event)
        return  {
          data: event.data,
          type: 'SAVE_CART'
        }
      })
    },
    guards: {
      canRetry: (context) => context.retries < 1 // retry 3 times
    },
    services: {
      removeLineItem: (context) => async (cb) => {
        try {
          const cart = await removeLineItem(context.cartId, context.id)

          if(cart.invalidId) {
            alert("ITEM INVALID")
            cb("LINE_ITEM_INVALID")
            return
          }
          alert("ITEM REMOVED")
          cb({ type:"LINE_ITEM_REMOVED", data: cart })
        } catch (e) {
          console.log(`E: `, e)
          cb("LINE_ITEM_NOT_REMOVED")
        } 
      }, 
      changeLineItemQty: (context, event) => async (cb) => {
        const quantity = event?.quantity

        try {
          const cart = await updateLineItem(context.cartId, { id: context.id, quantity })

          if(cart.invalidId) {
            alert("ITEM INVALID")
            cb("LINE_ITEM_INVALID")
            return
          }
          alert("ITEM UPDATED")
          cb({ type: "LINE_ITEM_UPDATED", data: cart })
        } catch (e) {
          console.log(`E: `, e)
          cb("LINE_ITEM_NOT_UPDATED")
        } 
      },
    }
  }
)

export default lineItemMachine
