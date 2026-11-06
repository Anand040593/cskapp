import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Plus, 
  X, 
  Check, 
  Calendar, 
  PhoneCall, 
  CreditCard, 
  FileText, 
  Search, 
  UserCheck, 
  Shield, 
  TrendingUp,
  AlertCircle,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { dbService, getTodayDate, BRANCHES } from '../../services/db';
import type { BranchId, UserProfile, ManagerDailyReport } from '../../types';

interface ManagerManagerProps {
  selectedBranch?: BranchId | 'all';
  selectedMonth?: string;
}

export const ManagerManager: React.FC<ManagerManagerProps> = ({ 
  selectedBranch = 'all',
  selectedMonth
}) => {
  const [dbVersion, setDbVersion] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'reports'>('branches');
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // New Manager Form State
  const [newManager, setNewManager] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: 'dadagapatty' as BranchId,
    designation: 'Center Operations Manager'
  });

  useEffect(() => {
    const handleDbChange = () => setDbVersion(v => v + 1);
    window.addEventListener('educenter-db-change', handleDbChange);
    return () => window.removeEventListener('educenter-db-change', handleDbChange);
  }, []);

  const managersList = dbService.getManagerList(selectedBranch);
  const managerReports = dbService.getManagerDailyReports(
    undefined, 
    undefined, 
    selectedBranch, 
    selectedMonth !== 'all' ? selectedMonth : undefined
  );

  const handleCreateManager = (e: React.FormEvent) => {
    e.preventDefault();
    const branch = BRANCHES.find(b => b.id === newManager.branchId);

    const managerProfile: UserProfile = {
      id: 'mgr-' + Date.now(),
      role: 'manager',
      name: newManager.name.trim(),
      email: newManager.email.trim() || `manager.${newManager.branchId}@cskacademy.com`,
      phone: newManager.phone.trim(),
      designation: newManager.designation.trim(),
      branchId: newManager.branchId,
      branchName: branch?.fullName || 'CSK Academy',
      managerId: 'MGR-' + Math.floor(100 + Math.random() * 900),
      createdAt: new Date().toISOString().split('T')[0]
    };

    dbService.saveUser(managerProfile);
    setCreateSuccess(`Manager ${managerProfile.name} assigned to ${branch?.name} (${branch?.location}) successfully!`);
    setTimeout(() => {
      setCreateSuccess(null);
      setShowAddModal(false);
      setNewManager({
        name: '',
        email: '',
        phone: '',
        branchId: 'dadagapatty',
        designation: 'Center Operations Manager'
      });
    }, 1200);
  };

  const filteredManagers = managersList.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">4 Salem Branches Manager Assignment</h3>
              <p className="text-xs text-slate-500">Assign dedicated managers for Dadagapatty, Kondalampatty, Ammapet, and New Bus Stand</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Sub-tab switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setActiveSubTab('branches')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all ${
                activeSubTab === 'branches' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Branch Managers ({managersList.length})
            </button>
            <button
              onClick={() => setActiveSubTab('reports')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all ${
                activeSubTab === 'reports' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Manager Daily Reports ({managerReports.length})
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Assign Manager
          </button>
        </div>
      </div>

      {activeSubTab === 'branches' ? (
        <div className="space-y-6">
          {/* 4 Salem Campuses Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {BRANCHES.map(branch => {
              const assignedManager = managersList.find(m => m.branchId === branch.id);
              const branchStudents = dbService.getStudentList(branch.id);
              const branchStaff = dbService.getStaffList(branch.id);

              return (
                <div key={branch.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3 relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                        {branch.shortCode}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        assignedManager ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {assignedManager ? 'Manager Assigned' : 'Unassigned'}
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <h4 className="font-extrabold text-slate-900 text-sm">{branch.name}</h4>
                      <p className="text-xs text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {branch.location}
                      </p>
                    </div>

                    {/* Assigned Manager Info */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                      {assignedManager ? (
                        <>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                            {assignedManager.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">{assignedManager.phone}</p>
                          <p className="text-[10px] text-slate-400 truncate">{assignedManager.email}</p>
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-1">
                          No manager assigned yet. Click button below to assign.
                        </p>
                      )}
                    </div>

                    {/* Staff & Student counts */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span>Staff: <strong className="text-slate-800">{branchStaff.length}</strong></span>
                      <span>Students: <strong className="text-slate-800">{branchStudents.length}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setNewManager({
                        name: '',
                        email: '',
                        phone: '',
                        branchId: branch.id,
                        designation: 'Center Operations Manager'
                      });
                      setShowAddModal(true);
                    }}
                    className="w-full mt-3 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {assignedManager ? 'Assign Co-Manager' : 'Assign Manager'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* All Assigned Managers Table/Cards */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <h4 className="font-extrabold text-slate-900 text-sm">All Salem Branch Managers Directory</h4>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search managers by name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredManagers.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                  No branch managers created yet. Click <strong>Assign Manager</strong> above to create managers for Salem branches.
                </div>
              ) : (
                filteredManagers.map(mgr => {
                  const b = BRANCHES.find(br => br.id === mgr.branchId);
                  return (
                    <div key={mgr.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{mgr.name}</p>
                          <p className="text-[11px] text-amber-700 font-semibold">{b?.name} - {b?.location}</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          {b?.shortCode}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-[11px] text-slate-500">
                        <p>Phone: <strong className="text-slate-700 font-mono">{mgr.phone}</strong></p>
                        <p>Email: <span className="text-slate-700">{mgr.email}</span></p>
                        <p>Role: <span className="text-slate-700">{mgr.designation || 'Branch Manager'}</span></p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* SUB-TAB 2: MANAGER DAILY WORK REPORTS */
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Manager Daily Work Reports</h4>
              <p className="text-xs text-slate-500">Enquiries, Admissions, Fees Pending, Total Students & Absentees</p>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{managerReports.length} Reports</span>
          </div>

          {managerReports.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">
              No manager daily reports submitted for this branch/month selection.
            </p>
          ) : (
            <div className="space-y-3">
              {managerReports.map(rep => {
                const b = BRANCHES.find(br => br.id === rep.branchId);
                return (
                  <div key={rep.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{rep.date}</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                          {b?.name} ({b?.location})
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        Manager: <strong className="text-slate-800">{rep.managerName}</strong>
                      </span>
                    </div>

                    {/* 4 Metric KPI Boxes */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-semibold">Today Enquiries</p>
                        <p className="text-base font-black text-amber-600">{rep.noOfEnquiry}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-semibold">Today Admissions</p>
                        <p className="text-base font-black text-emerald-600">{rep.noOfAdmission}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-semibold">Pending Fees</p>
                        <p className="text-sm font-black text-rose-600 font-mono">₹{rep.feesPendingAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-semibold">Absentees (Stu/Stf)</p>
                        <p className="text-sm font-bold text-slate-700">{rep.noOfAbsentStudents} / {rep.noOfAbsentStaff || 0}</p>
                      </div>
                    </div>

                    {rep.feesPendingDetails && (
                      <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800">Fees Pending Breakdown:</span>
                        <p className="text-[11px] text-slate-600 mt-0.5">{rep.feesPendingDetails}</p>
                      </div>
                    )}

                    {rep.notes && (
                      <p className="text-[11px] text-slate-600 italic">
                        <strong className="not-italic text-slate-700 font-semibold">Manager Remarks:</strong> {rep.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ASSIGN / CREATE MANAGER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-amber-50 text-amber-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Assign Branch Manager</h3>
                  <p className="text-xs text-slate-500">Assign a manager for Salem campuses</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateManager} className="space-y-3.5 mt-3 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Manager Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senthil Kumar"
                  value={newManager.name}
                  onChange={e => setNewManager({ ...newManager, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9443211001"
                    value={newManager.phone}
                    onChange={e => setNewManager({ ...newManager, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="manager.salem@cskacademy.com"
                    value={newManager.email}
                    onChange={e => setNewManager({ ...newManager, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Salem Campus *</label>
                <select
                  value={newManager.branchId}
                  onChange={e => setNewManager({ ...newManager, branchId: e.target.value as BranchId })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-bold text-amber-900"
                >
                  {BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} - {b.location} ({b.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="Branch Operations Manager"
                  value={newManager.designation}
                  onChange={e => setNewManager({ ...newManager, designation: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save & Assign Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
