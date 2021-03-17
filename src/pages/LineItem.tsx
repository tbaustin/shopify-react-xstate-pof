import * as React from "react";
import { useActor } from "@xstate/react";
import { State } from "xstate";
import debounce from "lodash/debounce";
import Modal from "./Modal";

interface LineItemProps {
  changeQty: () => State<any, any>;
  itemRef: any;
}

export default function LineItem({ changeQty, itemRef }: LineItemProps) {
  const [current, send] = useActor(itemRef);

  const { quantity, title, variant, modal } = current?.context || {};
  const { price, compareAtPrice, available } = variant || {};

  console.log(`Current State`, current)

  const numPrice = +price;
  const numCaP = +compareAtPrice;
  const strikePrice =
    numCaP > numPrice ? (
      <span style={{ textDecoration: "line-through" }}>{compareAtPrice}</span>
    ) : null;

  return (
    <div>
      <div>{title}</div>
      <div>
        ${price} ${strikePrice}
      </div>
      <div>{available ? `In Stock` : `Out of Stock`}</div>
      <label
        htmlFor="quantity"
        className="block text-sm font-medium text-gray-700"
      >
        Quantity
      </label>
      <div className="mt-1">
        <input
          type="number"
          defaultValue={quantity}
          name="quantity"
          id="quantity"
          onChange={debounce(changeQty, 500)}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
      </div>
      <button onClick={() => send("REMOVE_LINE_ITEM")}>
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {modal.isOpen && modal.ref && <Modal modalRef={modal.ref} />}
    </div>
  );
}
