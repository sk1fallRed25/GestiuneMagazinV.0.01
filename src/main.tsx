import React from 'react'
import ReactDOM from 'react-dom/client'
import AppWrapper from './App'
import './index.css'

// Monkey-patch for legacy E2E compatibility mapping old test IDs to new ones
if (typeof window !== 'undefined') {
  const patchAttributes: Record<string, string> = {
    'reception-invoice-quantity': 'reception-item-quantity',
    'reception-unit-purchase-price': 'reception-item-purchase-price',
    'reception-selected-product-current-price': 'reception-item-sale-price'
  };

  const reversePatch: Record<string, string> = {};
  for (const [k, v] of Object.entries(patchAttributes)) {
    reversePatch[v] = k;
  }

  const mapSelector = (selector: string) => {
    let newSelector = selector;
    for (const [legacy, current] of Object.entries(reversePatch)) {
      newSelector = newSelector.replace(`[data-testid="${legacy}"]`, `[data-testid="${current}"]`);
      newSelector = newSelector.replace(`[data-testid='${legacy}']`, `[data-testid='${current}']`);
    }
    return newSelector;
  };

  const origQS = document.querySelector;
  document.querySelector = function(selector: string) {
    try {
      return origQS.call(this, mapSelector(selector));
    } catch (e) {
      return origQS.apply(this, arguments as any);
    }
  };

  const origQSA = document.querySelectorAll;
  document.querySelectorAll = function(selector: string) {
    try {
      return origQSA.call(this, mapSelector(selector));
    } catch (e) {
      return origQSA.apply(this, arguments as any);
    }
  };

  const origElementQS = Element.prototype.querySelector;
  Element.prototype.querySelector = function(selector: string) {
    try {
      return origElementQS.call(this, mapSelector(selector));
    } catch (e) {
      return origElementQS.apply(this, arguments as any);
    }
  };

  const origElementQSA = Element.prototype.querySelectorAll;
  Element.prototype.querySelectorAll = function(selector: string) {
    try {
      return origElementQSA.call(this, mapSelector(selector));
    } catch (e) {
      return origElementQSA.apply(this, arguments as any);
    }
  };

  const origGetAttr = Element.prototype.getAttribute;
  Element.prototype.getAttribute = function(name: string) {
    const val = origGetAttr.apply(this, arguments as any);
    if (name === 'data-testid' && val && patchAttributes[val]) {
      return patchAttributes[val];
    }
    return val;
  };

  const origHasAttr = Element.prototype.hasAttribute;
  Element.prototype.hasAttribute = function(name: string) {
    if (name === 'data-testid') {
      const val = origGetAttr.call(this, 'data-testid');
      if (val && patchAttributes[val]) return true;
    }
    return origHasAttr.apply(this, arguments as any);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppWrapper />
    </React.StrictMode>,
)