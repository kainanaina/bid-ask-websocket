import BigNumber from 'bignumber.js';

export const API_URL = 'wss://api.prod.rabbitx.io/ws';
export const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxODcxMCIsImV4cCI6MTcwODQxODQxN30.3cP__zyPX3CiAArm7P5I5hCjmWYajGbShtbOITnjAxA';

export type Order = [string, string];

export type OrderbookPayload = {
  market_id: string;
  sequence: number;
  timestamp: number;
  bids: Order[];
  asks: Order[];
};

export function cullOrders(
  orders: Order[],
  maxOrders: number,
  isBids?: boolean
): Order[] {
  if (isBids) {
    return orders.slice(
      orders.length <= maxOrders ? 0 : orders.length - maxOrders
    );
  }

  return orders.slice(0, maxOrders);
}

// based on https://stackoverflow.com/a/21822316
function getSortedOrderIndex(orders: Order[], newOrder: Order): number {
  let low = 0;
  let high = orders.length;

  while (low < high) {
    const mid = (low + high) >>> 1;

    if (BigNumber(orders[mid][0]).lt(newOrder[0])) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export function getUpdatedOrders(
  _orders: Order[],
  newOrders: Order[],
  maxOrders: number,
  isBids?: boolean
): Order[] {
  const orders = [..._orders]; // I'm not a fan of directly mutating state data, so I'm doing a shallow copy here, shouldn't be a problem for memory I think

  for (let i = 0; i < newOrders.length; i++) {
    const newOrder = newOrders[i];
    const newOrderIndex = getSortedOrderIndex(orders, newOrder);

    if (BigNumber(newOrder[0]).eq(orders[newOrderIndex]?.[0])) {
      if (BigNumber(newOrder[1]).eq(0)) {
        orders.splice(newOrderIndex, 1); // remove order if new size is 0
      } else {
        orders.splice(newOrderIndex, 1, newOrder); // replace order
      }
    } else {
      if (!BigNumber(newOrder[1]).eq(0)) {
        orders.splice(newOrderIndex, 0, newOrder); // insert new non-zero size order at correct index (sorted by price)
      }
    }
  }

  return cullOrders(orders, maxOrders, isBids);
}

export type Sizes = {
  accumulatedSizes: BigNumber[];
  totalSize: BigNumber;
};

export function getComputedSizes(orders: Order[]): Sizes {
  const accumulatedSizes: BigNumber[] = [];
  let totalSize = BigNumber(0);

  for (let i = 0; i < orders.length; i++) {
    const size = BigNumber(orders[i][1]);
    totalSize = totalSize.plus(size);
    accumulatedSizes.push(totalSize);
  }

  return { accumulatedSizes, totalSize };
}