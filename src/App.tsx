import { useState } from 'react';
import BidAskDisplay from './components/BidAskDisplay';
import './App.css';

const PAIRS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD'];

function BidAskRenderer() {
  const [pair, setPair] = useState(PAIRS[0]);
  return (
    <>
      <div>
        <select
          value={pair}
          onChange={(e) => {
            setPair(e.target.value);
          }}
        >
          {PAIRS.map((pair) => (
            <option key={pair} value={pair}>
              {pair}
            </option>
          ))}
        </select>
      </div>
      <BidAskDisplay key={pair} pair={pair} />
    </>
  );
}

function App() {
  const [numberOfSpawnedComponents, setNumberOfSpawnedComponents] = useState(1);

  return (
    <div className="app">
      <h1>Bid Ask Demo</h1>
      <div>
        <button
          onClick={() =>
            setNumberOfSpawnedComponents(numberOfSpawnedComponents + 1)
          }
        >
          Add BidAskDisplay
        </button>
      </div>
      <div>
        <button
          onClick={() =>
            setNumberOfSpawnedComponents(numberOfSpawnedComponents - 1)
          }
        >
          Remove BidAskDisplay
        </button>
      </div>
      {Array(numberOfSpawnedComponents)
        .fill(0)
        .map((_, i) => (
          <div key={i}>
            <BidAskRenderer />
          </div>
        ))}
    </div>
  );
}

export default App;
