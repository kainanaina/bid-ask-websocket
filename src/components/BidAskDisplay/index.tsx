import { useState, useRef, useEffect } from 'react';
import { Centrifuge, Subscription } from 'centrifuge';
import { BigNumber } from 'bignumber.js';
import cn from 'clsx';
import {
  API_URL,
  TOKEN,
  cullOrders,
  getUpdatedOrders,
  getComputedSizes,
  Order,
  OrderbookPayload,
  Sizes,
} from './utils';
import s from './styles.module.scss';

export default function BidAskDisplay({
  maxDisplay = 10, // number of orders to display in each category
  bufferMultiplier = 4, // safety buffer multiplier for orders kept in memory (so 4 * 10 = 40 orders max per category)
  pair = 'BTC-USD',
}: {
  maxDisplay?: number;
  bufferMultiplier?: number;
  pair?: string;
}) {
  const client = useRef(
    new Centrifuge(API_URL, {
      token: TOKEN,
    })
  );
  const subscription = useRef<Subscription | null>(null);

  const sequence = useRef(0);
  const asks = useRef<Order[]>([]);
  const bids = useRef<Order[]>([]);

  const [displayAsks, setDisplayAsks] = useState<Order[]>([]);
  const [displayBids, setDisplayBids] = useState<Order[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const maxOrders = Math.ceil(maxDisplay * bufferMultiplier);

  const resetSubscription = () => {
    subscription.current?.unsubscribe();
    subscription.current?.removeAllListeners();
    client.current.removeSubscription(subscription.current);
    subscription.current = null;

    sequence.current = 0;

    asks.current = [];
    bids.current = [];

    setDisplayAsks([]);
    setDisplayBids([]);
  };

  const resetAndSubscribe = () => {
    resetSubscription();

    subscription.current = client.current.newSubscription(`orderbook:${pair}`);

    subscription.current.on('subscribed', (ctx) => {
      const payload = ctx.data as OrderbookPayload;

      console.log('initialData', payload);

      sequence.current = payload.sequence;
      asks.current = cullOrders(payload.asks, maxOrders);
      bids.current = cullOrders(payload.bids, maxOrders, true);

      setDisplayAsks(cullOrders(payload.asks, maxDisplay));
      setDisplayBids(cullOrders(payload.bids, maxDisplay, true));
    });

    subscription.current.on('publication', (ctx) => {
      if (!subscription.current || sequence.current === 0) {
        // without this check reset can be called multiple times for messages within ~same timestamp
        return;
      }

      const payload = ctx.data as OrderbookPayload;

      console.log('update', payload);

      if (BigNumber(ctx.data.sequence).minus(sequence.current).gt(1)) {
        console.log(
          '===RESET===',
          'last known sequence - ',
          sequence.current,
          'new sequence - ',
          ctx.data.sequence
        );

        return resetAndSubscribe();
      }

      sequence.current = payload.sequence;

      if (payload.asks.length) {
        const newAsks = getUpdatedOrders(asks.current, payload.asks, maxOrders);

        if (newAsks.length < maxDisplay) {
          console.log('===resetting with asks below maxDisplay===');
          // resubscribe to refill memory orderbook in case if memory drops below maxDisplay
          // there definitely can be cases where even initial snapshot data is below maxDisplay, so it's mostly a product discussion about what to do here
          // so in this exercise I'm just assuming that orderbook snapshot contains at least 10+ orders, and my default value of 10 is good enough
          return resetAndSubscribe();
        }

        asks.current = newAsks;
        setDisplayAsks(cullOrders(newAsks, maxDisplay));
      }

      if (payload.bids.length) {
        const newBids = getUpdatedOrders(
          bids.current,
          payload.bids,
          maxOrders,
          true
        );

        if (newBids.length < maxDisplay) {
          console.log('===resetting with bids below maxDisplay===');
          // same reset logic as with asks above
          return resetAndSubscribe();
        }

        bids.current = newBids;
        setDisplayBids(cullOrders(newBids, maxDisplay, true));
      }
    });

    subscription.current.subscribe();
  };

  useEffect(() => {
    resetAndSubscribe();

    client.current.connect();

    const onOffline = () => setIsOffline(true);
    const onOnline = () => {
      resetAndSubscribe();
      setIsOffline(false);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    return () => {
      resetSubscription();
      client.current.disconnect();

      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (isOffline) {
    return <div>Offline</div>;
  }

  const pairLeft = pair.split('-')[0];
  const pairRight = pair.split('-')[1];
  const asksSizes = getComputedSizes(displayAsks);
  const bidsSizes = getComputedSizes(displayBids);

  const renderPlaceholders = (count: number) => {
    return (
      <div className={s.orders}>
        {Array(count)
          .fill(0)
          .map((_, i) => (
            <div key={i} className={cn(s.row, s.plc)}>
              <div></div>
              <div></div>
              <div></div>
            </div>
          ))}
      </div>
    );
  };

  const renderOrders = (orders: Order[], sizes: Sizes, isBids = false) => {
    if (!orders.length) {
      return renderPlaceholders(maxDisplay);
    }

    return (
      <div className={cn(s.orders, isBids ? s.bids : s.asks)}>
        {orders.map((_, _i) => {
          const i = isBids ? _i : orders.length - 1 - _i; // reverse order for asks without using reverse(), I think it's more efficient
          const order = orders[i];
          const sizeKey = `size-${order[1]}`;
          const accumulatedSizeKey = `accumulatedSize-${order[1]}`;
          const accumulatedSize = sizes.accumulatedSizes[i];

          return (
            <div key={order[0]} className={s.row}>
              <div
                className={cn(s.price, {
                  [s.highlight]: i === 0,
                })}
              >
                <p>{BigNumber(order[0]).toFixed()}</p>
              </div>
              <div key={sizeKey}>{order[1]}</div>
              <div
                key={accumulatedSizeKey}
                className={s.accumulatedSize}
                style={
                  {
                    '--size-width': `${accumulatedSize
                      .div(sizes.totalSize)
                      .multipliedBy(100)
                      .toString()}%`,
                  } as React.CSSProperties
                }
              >
                <p>{accumulatedSize.toString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className={cn(s.row, s.header)}>
        <div>
          Price <span>{pairRight}</span>
        </div>
        <div>
          Amount <span>{pairLeft}</span>
        </div>
        <div>
          Total <span>{pairLeft}</span>
        </div>
      </div>
      {renderOrders(displayAsks, asksSizes)}
      {renderOrders(displayBids, bidsSizes, true)}
    </div>
  );
}
