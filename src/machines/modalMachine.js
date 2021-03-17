import { Machine, sendParent, assign } from "xstate"

const modalMachine = (id) => Machine(
  {
    id: "modal",
    initial: "idle",
    context: {
      id
    },
    states: {
      idle: {
        on: {
          REMOVE: {
            target: "destroy",
            actions: sendParent("REMOVE")
          },
          CANCEL: {
            target: "destroy",
            actions: sendParent("CANCEL")
          }
        }
      },
      destroy: {
        type: `final`
      }
    }
  }
)

export default modalMachine
