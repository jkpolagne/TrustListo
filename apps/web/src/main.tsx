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
import { Projects } from './routes/admin/Projects';
import { UnitEditor } from './routes/admin/UnitEditor';
import { Listings } from './routes/firm/Listings';
import { AboutBadges } from './routes/public/AboutBadges';
import { Home } from './routes/public/Home';
import { Properties } from './routes/public/Properties';
import { PropertyDetail } from './routes/public/PropertyDetail';
import { Firms } from './routes/superadmin/Firms';
import './index.css';

const queryClient = new QueryClient();

const only = (roles: Role[], el: ReactNode) => <RequireRole roles={roles}>{el}</RequireRole>;

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/properties', element: <Properties /> },
  { path: '/properties/map', element: <Properties initialView="map" /> },
  { path: '/properties/:slug', element: <PropertyDetail /> },
  { path: '/about-badges', element: <AboutBadges /> },
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
      { path: '/admin/listings', element: only(['COMPANY_ADMIN'], <Listings />) },
      { path: '/admin/listings/new', element: only(['COMPANY_ADMIN'], <UnitEditor />) },
      { path: '/admin/listings/:id', element: only(['COMPANY_ADMIN'], <UnitEditor />) },
      { path: '/admin/projects', element: only(['COMPANY_ADMIN'], <Projects />) },

      { path: '/broker', element: only(['BROKER'], <BrokerHome />) },
      {
        path: '/broker/reviews/credentials/:id',
        element: only(['BROKER'], <ReviewCredential />),
      },
      { path: '/broker/team', element: only(['BROKER'], <Team />) },
      { path: '/broker/activity', element: only(['BROKER'], <Activity />) },
      { path: '/broker/listings', element: only(['BROKER'], <Listings />) },

      { path: '/manager', element: only(['SALES_MANAGER'], <ManagerHome />) },
      { path: '/manager/team', element: only(['SALES_MANAGER'], <Team title="My team" />) },
      { path: '/manager/listings', element: only(['SALES_MANAGER'], <Listings />) },

      { path: '/salesperson', element: only(['SALES_PERSON'], <SalespersonHome />) },
      { path: '/salesperson/listings', element: only(['SALES_PERSON'], <Listings />) },

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
