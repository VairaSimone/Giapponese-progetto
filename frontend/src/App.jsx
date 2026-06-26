import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './api/queryClient';
import { router } from './routes/router';
import { setupAuthInterceptor } from './api/authInterceptor';
import { useCurrentUser } from './hooks/useCurrentUser';


const SessionBootstrap = () => {
  useCurrentUser();
  return null;
};

const App = () => {
  useEffect(() => {
    setupAuthInterceptor();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap />
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
            borderRadius: '6px',
            // Token del tema attivo: i toast seguono Chiaro/Scuro
            background: 'var(--color-paper)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-elevated)',
          },
          success: {
            iconTheme: { primary: 'var(--color-matcha)', secondary: 'var(--color-paper)' },
          },
          error: {
            iconTheme: { primary: 'var(--color-seal)', secondary: 'var(--color-paper)' },
          },
        }}
      />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default App;
