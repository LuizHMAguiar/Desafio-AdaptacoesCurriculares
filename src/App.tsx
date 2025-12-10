import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Layout } from './components/Layout';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <>
      <Layout>
        {user.role === 'coordenador' ? (
          <CoordinatorDashboard />
        ) : (
          <TeacherDashboard />
        )}
      </Layout>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}