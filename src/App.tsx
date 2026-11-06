import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { CloudModal } from './components/common/CloudModal';
import { CSVExportModal } from './components/common/CSVExportModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { dbService } from './services/db';

export const App: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  useEffect(() => {
    // Auto-sync with Firebase Spark Plan on startup
    dbService.syncWithCloud().catch(() => {});
    // Start real-time Firestore multi-device sync listener
    const cleanup = dbService.initCloudListeners();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Navbar onOpenCloudModal={() => setIsCloudModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {role === 'admin' && (
          <AdminDashboard onOpenCloudModal={() => setIsCloudModalOpen(true)} />
        )}
        {role === 'manager' && (
          <ManagerDashboard />
        )}
        {role === 'staff' && (
          <StaffDashboard />
        )}
        {role === 'student' && (
          <StudentDashboard />
        )}
      </main>

      <CloudModal 
        isOpen={isCloudModalOpen} 
        onClose={() => setIsCloudModalOpen(false)} 
      />

      <CSVExportModal />
    </div>
  );
};

export default App;
