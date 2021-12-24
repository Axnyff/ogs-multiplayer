import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import ReactDOM from 'react-dom';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchInterval: 1000 * 30 },
  },
});

ReactDOM.render(
  <QueryClientProvider client={queryClient}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </QueryClientProvider>,
  document.getElementById('root')
);
