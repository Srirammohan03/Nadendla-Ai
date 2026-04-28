
import React from 'react';
import { Toaster } from 'react-hot-toast';
import LeadsDashboard from './components/LeadsDashboard';

const App: React.FC = () => {
  return (
    <>
      <LeadsDashboard />
      <Toaster position="bottom-right" />
    </>
  );
};

export default App;