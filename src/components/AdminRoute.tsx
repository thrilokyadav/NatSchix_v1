import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader, AlertTriangle } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-red-800">Access Denied</h1>
            <p className="mt-4 text-gray-600">
              You do not have the necessary permissions to view this page.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Please contact an administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;