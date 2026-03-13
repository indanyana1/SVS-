import { ElectronicsPage } from '../features/electronics';
import { TicketsPage } from '../features/tickets';

const HomePage = () => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">SVS E-COMMERCE</h1>
      <p className="mt-3 text-slate-600">
        Multi-category marketplace for products, tickets, food, and services.
      </p>
    </section>
  );
};

const routes = [
  {
    path: '/',
    label: 'Home',
    element: <HomePage />,
  },
  {
    path: '/tickets',
    label: 'Tickets',
    element: <TicketsPage />,
  },
  {
    path: '/electronics',
    label: 'Electronics',
    element: <ElectronicsPage />,
  },
];

export default routes;
