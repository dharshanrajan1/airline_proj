import Map from './components/Map';
import Panel from './components/Panel';
import Filters from './components/Filters';
import Status from './components/Status';
import Attribution from './components/Attribution';

export default function App() {
  return (
    <div className="fixed inset-0 bg-surface-900 text-white font-sans">
      <Map />
      <div className="pointer-events-none absolute inset-0">
        <Filters />
        <Panel />
        <Status />
        <Attribution />
      </div>
    </div>
  );
}
