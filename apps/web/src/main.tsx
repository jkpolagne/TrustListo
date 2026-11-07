import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import type { Role } from '@trustlisto/shared';
import { AppShell } from './components/AppShell';
import { RequireRole } from './components/RequireRole';
import { Account } from './routes/account/Account';
import { AddConsultant } from './routes/admin/AddConsultant';
import { ConsultantDetail } from './routes/admin/ConsultantDetail';
import { ReviewCredential } from './routes/broker/ReviewCredential';
import { Login } from './routes/auth/Login';
import { Activity } from './routes/firm/Activity';
import { AdminHome, BrokerHome, ManagerHome, SalespersonHome } from './routes/firm/Dashboards';
import { Team } from './routes/firm/Team';
import { Home } from './routes/public/Home';
import { Firms } from './routes/superadmin/Firms';
import './index.css';

const queryClient = new QueryClient();

const only = (roles: Role[], el: ReactNode) => <RequireRole roles={roles}>{el}</RequireRole>;

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  {
    element: (
      <RequireRole>
        <AppShell />
      </RequireRole>
    ),
    children: [
      { path: '/superadmin', element: only(['SUPER_ADMIN'], <Firms />) },

      { path: '/admin', element: only(['COMPANY_ADMIN'], <AdminHome />) },
      { path: '/admin/team', element: only(['COMPANY_ADMIN'], <Team />) },
      { path: '/admin/team/new', element: only(['COMPANY_ADMIN'], <AddConsultant />) },
      { path: '/admin/team/:id', element: only(['COMPANY_ADMIN'], <ConsultantDetail />) },
      { path: '/admin/activity', element: only(['COMPANY_ADMIN'], <Activity />) },

      { path: '/broker', element: only(['BROKER'], <BrokerHome />) },
      {
        path: '/broker/reviews/credentials/:id',
        element: only(['BROKER'], <ReviewCredential />),
      },
      { path: '/broker/team', element: only(['BROKER'], <Team />) },
      { path: '/broker/activity', element: only(['BROKER'], <Activity />) },

      { path: '/manager', element: only(['SALES_MANAGER'], <ManagerHome />) },
      { path: '/manager/team', element: only(['SALES_MANAGER'], <Team title="My team" />) },

      { path: '/salesperson', element: only(['SALES_PERSON'], <SalespersonHome />) },

      { path: '/account', element: <Account /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
