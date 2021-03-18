import { Machine, sendParent } from "xstate"

const modalMachine = Machine({
  id: "modal",
  initial: "idle",
  states: {
    idle: {
      on: {
        REMOVE: {
          target: "destroy",
          actions: sendParent("REMOVE_ITEM")
        },
        CANCEL: { 
          target: "destroy",
          actions: sendParent("CANCEL_MODAL") 
        }
      }
    },
    destroy: {
      type: `final`
    }
  }
})

export default modalMachine
