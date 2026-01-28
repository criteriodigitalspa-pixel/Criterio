import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ProcessingProvider } from './context/ProcessingContext';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import { FinancialProvider } from './context/FinancialContext';
// GlobalSearchModal lazy loaded
// import GlobalSearchModal from './components/common/GlobalSearchModal';

// Static Import for Critical Layouts and Core Pages (Instant Load)
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import SmartHome from './components/SmartHome';
import Unauthorized from './pages/Unauthorized'; // Static Import
import KanbanBoard from './components/KanbanBoard';
import IngresoTicket from './pages/IngresoTicket';
import Inventory from './pages/Inventory';

// Lazy Imports for Secondary/Admin Pages (Optimization)
const GlobalSearchModal = lazy(() => import('./components/common/GlobalSearchModal'));
const Users = lazy(() => import('./pages/Users'));
const ProjectStatus = lazy(() => import('./pages/ProjectStatus'));
const SalesDashboard = lazy(() => import('./pages/SalesDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const PointOfSale = lazy(() => import('./pages/PointOfSale'));
const TaskManager = lazy(() => import('./pages/TaskManager'));
const TaskManagerV2 = lazy(() => import('./pages/TaskManagerV2'));
const ClientStatus = lazy(() => import('./pages/ClientStatus'));
// const Unauthorized = lazy(() => import('./pages/Unauthorized')); // Moved to static
const Utilities = lazy(() => import('./pages/Utilities'));
const LabelPlayground = lazy(() => import('./pages/LabelPlayground'));
const SalesCopyPreview = lazy(() => import('./pages/SalesCopyPreview'));
const ModelNormalizer = lazy(() => import('./pages/utilities/ModelNormalizer'));
const ReportingDashboard = lazy(() => import('./components/reporting/ReportingDashboard'));
const AgentStudio = lazy(() => import('./pages/AgentStudio/index'));
// Legacy (can remove if file deleted)
// const PersonaStudio = lazy(() => import('./pages/PersonaStudio'));

// Loading Fallback (For Lazy Routes only)
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-blue-500 animate-pulse">
    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
    <span className="text-sm font-medium">Cargando módulo...</span>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <FinancialProvider>
          <ProcessingProvider>
            <GlobalSearchProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#1f2937',
                    color: '#fff',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    fontSize: '14px',
                  },
                  success: {
                    iconTheme: { primary: '#10B981', secondary: '#fff' }
                  },
                  error: {
                    iconTheme: { primary: '#EF4444', secondary: '#fff' }
                  }
                }}
              />
              <Suspense fallback={null}>
                <GlobalSearchModal />
              </Suspense>
              {/* Suspense handles the Lazy Admin routes */}
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/status" element={<ClientStatus />} />
                  <Route path="/playground" element={<LabelPlayground />} />
                  <Route path="/preview-copy" element={<SalesCopyPreview />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />

                  <Route path="/" element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }>
                    {/* CORE ROUTES - No Suspense needed (Static) */}
                    <Route index element={<SmartHome />} />

                    <Route path="tickets" element={
                      <ProtectedRoute module="tickets">
                        <KanbanBoard />
                      </ProtectedRoute>
                    } />

                    <Route path="inventory" element={
                      <ProtectedRoute module="inventory">
                        <Inventory />
                      </ProtectedRoute>
                    } />

                    <Route path="ingreso" element={
                      <ProtectedRoute module="ingreso">
                        <IngresoTicket />
                      </ProtectedRoute>
                    } />

                    {/* LAZY ADMIN ROUTES */}
                    <Route path="sales" element={
                      <ProtectedRoute module="sales" allowedRoles={['Admin']}>
                        <SalesDashboard />
                      </ProtectedRoute>
                    } />

                    <Route path="roadmap" element={
                      <ProtectedRoute module="roadmap">
                        <ProjectStatus />
                      </ProtectedRoute>
                    } />

                    <Route path="users" element={
                      <ProtectedRoute module="users" allowedRoles={['Admin']}>
                        <Users />
                      </ProtectedRoute>
                    } />

                    <Route path="pos" element={
                      <ProtectedRoute module="pos">
                        <PointOfSale />
                      </ProtectedRoute>
                    } />

                    <Route path="tasks" element={
                      <ProtectedRoute module="tasks">
                        <TaskManager />
                      </ProtectedRoute>
                    } />

                    <Route path="tasks-v2" element={
                      <ProtectedRoute module="tasks">
                        <TaskManagerV2 />
                      </ProtectedRoute>
                    } />

                    <Route path="settings" element={
                      <ProtectedRoute module="settings" allowedRoles={['Admin']}>
                        <Settings />
                      </ProtectedRoute>
                    } />

                    <Route path="utilities" element={
                      <ProtectedRoute module="utilities" allowedRoles={['Admin']}>
                        <Utilities />
                      </ProtectedRoute>
                    } />

                    <Route path="utilities/model-normalizer" element={
                      <ProtectedRoute module="utilities" allowedRoles={['Admin']}>
                        <ModelNormalizer />
                      </ProtectedRoute>
                    } />

                    <Route path="utilities/reporting" element={
                      <ProtectedRoute module="utilities" allowedRoles={['Admin']}>
                        <ReportingDashboard />
                      </ProtectedRoute>
                    } />

                  </Route>

                  <Route path="agent-studio" element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <AgentStudio />
                    </ProtectedRoute>
                  } />

                  {/* Redirects for old links */}
                  <Route path="ai-studio" element={<Navigate to="/agent-studio" replace />} />
                  <Route path="action-studio" element={<Navigate to="/agent-studio" replace />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </GlobalSearchProvider>
          </ProcessingProvider>
        </FinancialProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
