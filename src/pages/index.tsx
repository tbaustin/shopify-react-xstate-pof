import * as React from "react"
import { useMachine } from '@xstate/react';
import { inspect } from "@xstate/inspect";
import { Helmet } from "react-helmet";
import cartMachine from '../machines/cartMachine'
import LineItem from './LineItem'
// import { fetchProductByHandle } from '../utils/shopify-buy'

inspect({
  iframe: document.getElementById("xstate-iframe") as HTMLIFrameElement,
  url: 'https://statecharts.io/inspect'
});

// (async () => {
//   const res = await fetchProductByHandle(`family-worship-paperback`)
//   console.log(`PRODUCT 123: `, res)
// })()

const variantId = "Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC8zNzA5Nzk2NjIwNzE2Nw==" 
const variantId2 = "Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC8zNzA5NzgyNzg2MDY3MQ=="

const greenButtonStyles = "outline-none text-base rounded-lg cursor-pointer p-4 m-4 bg-green-500 text-white block"
const redButtonStyles = "outline-none text-base rounded-lg cursor-pointer p-4 m-4 bg-red-500 text-white block"

export default function IndexPage () {
  const [state, send] = useMachine(cartMachine, { devTools: true })

  function changeQty(e) {
    const quantity = +(e?.target?.value)
   
    if(quantity) {
      send("CHANGE_QTY_LINE_ITEM", { variantId, quantity })
    }
  }

  const lineItems = state?.context?.cart?.lineItems

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
          <button className={greenButtonStyles} onClick={() => send("ADD_LINE_ITEM", { variantId })}>Add Item to Cart</button>
          <button className={greenButtonStyles} onClick={() => send("ADD_LINE_ITEM", { variantId: variantId2 })}>Add Item to Cart 2</button>

          <button className={redButtonStyles} onClick={() => send("REMOVE_LINE_ITEM", { variantId })}>Remove Item From Cart</button>
          <button className={redButtonStyles} onClick={() => send("REMOVE_LINE_ITEM", { variantId: variantId2 })}>Remove Item From Cart 2</button>
        
          <ul>
            {lineItems && lineItems.map((item) => (
              <LineItem itemRef={item.ref} key={item.id} changeQty={changeQty}/>
            ))}
          </ul>
        </main>
        <footer className="flex flex-col items-stretch flex-1 bg-gray-200">
          <iframe id="xstate-iframe" className="w-full h-full bg-gray-50"></iframe>
        </footer>
      </div>
    </>
  )
}