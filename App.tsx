import React from 'react';
import PoolTable from './components/PoolTable';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-white">
      <PoolTable />
    </div>
  );
};

export default App;