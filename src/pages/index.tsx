import * as React from "react"
import { useMachine } from '@xstate/react';
import { inspect } from "@xstate/inspect";
import { Helmet } from "react-helmet";
import cartMachine from '../machines/cartMachine'
import LineItem from './LineItem'

import { fetchProductByHandle } from '../utils/shopify-buy'

(async () => {
  const res = await fetchProductByHandle("learning-to-love-the-psalms-dvd-hardcover")

  console.log(`RES: `, res)
})()

inspect({
  iframe: document.getElementById("xstate-iframe") as HTMLIFrameElement,
  url: 'https://statecharts.io/inspect'
});

const variantId = "Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC8zNzA5Nzk2NjIwNzE2Nw==" 
const variantId2 = "Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC8zNzA5NzgyNzg2MDY3MQ=="

const bulkVariant = "Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC8zNzA5NzkzMjMyNTA1NQ=="

const greenButtonStyles = "outline-none text-base rounded-lg cursor-pointer p-4 m-4 bg-green-500 text-white block"
const redButtonStyles = "outline-none text-base rounded-lg cursor-pointer p-4 m-4 bg-red-500 text-white block"


const customFields = {
  author: "K. C. Cool",
  format: "Paperback",
  avaliableQty: 28,
  backorder: "true",
  preorder: "true"
}

const customAttributes = Object.keys(customFields).map(key => {
  return {
    key,
    value: customFields[key].toString()
  }
})

export default function IndexPage () {
  const [state, send] = useMachine(cartMachine, { devTools: true })

  console.log(`State: `, state)

  if(state.value === "failure") {
    return (
      <div>There was an error loading the cart, please try again.</div>
    )
  }

  if(state.value !== "idle") {
    return (
      <div>Loading...</div>
    )
  }

  const lineItems = state?.context?.cart?.lineItems

  const lineItemQty = lineItems.reduce((acc, cur) => {
    const { quantity } = cur

    return acc + quantity
  }, 0)

  return (
    <>
      <Helmet>
        <link
          href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css"
          rel="stylesheet"
        />
      </Helmet>
      <div className="flex flex-col items-stretch w-screen h-screen overflow-hidden">
        <main className="flex-1">
          {state.context.checkoutUrl && (
            <button className={redButtonStyles}>
              <a target="_blank" rel="noopener noreferrer" href={state.context.checkoutUrl}>Checkout</a>
            </button>
          )}
          <div>
            Item Count: {lineItemQty}
          </div>
          <button className={greenButtonStyles} onClick={() => send("ADD_LINE_ITEM", { variantId: variantId2, customAttributes })}>Add Item to Cart</button>
          <button className={greenButtonStyles} onClick={() => send("ADD_LINE_ITEM", { variantId: bulkVariant, customAttributes })}>Add Bulk Item to Cart</button>
          <ul>
            {lineItems && lineItems.map((item) => (
              item.ref && <LineItem itemRef={item.ref} key={item.id} />
            ))}
          </ul>
          {!state.context.hasDonation && (
            <div className="flex space-x-2 items-center">
              <h2>Donations</h2>
              <button 
                  onClick={() => send("ADD_LINE_ITEM", { 
                    variantId, 
                    customAttributes: [
                      ...customAttributes, 
                      { key: "productType", value: "donation" }
                      ] 
                    })} 
                  className={greenButtonStyles}
                >
                $10
              </button>
            </div>
          )}
        </main>
        <footer className="flex flex-col items-stretch flex-1 bg-gray-200">
          <iframe id="xstate-iframe" className="w-full h-full bg-gray-50"></iframe>
        </footer>
      </div>
      
    </>
  )
}