import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#F8F6FF] flex">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 mt-16 p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
