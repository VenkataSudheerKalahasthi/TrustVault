import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { role, isLoading } = useAppAuth();

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 font-mono">
        Validating cryptographic session and authorization state...
      </div>
    );
  }

  if (role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (role === 'DOCUMENT_OWNER') {
    return <Navigate to="/owner/documents" replace />;
  }

  return <Navigate to="/viewer/documents" replace />;
};
