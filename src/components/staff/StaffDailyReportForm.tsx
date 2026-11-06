import React, { useState } from 'react';
import { 
  PhoneCall, 
  BookOpen, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  UserPlus, 
  HelpCircle, 
  TrendingUp, 
  Calendar,
  Layers,
  ChevronRight,
  Building2
} from 'lucide-react';
import { dbService, getTodayDate, BRANCHES, computeTeachingSummary } from '../../services/db';
import type { DailyWorkReport, TeachingReportItem, Course, BranchId } from '../../types';

interface StaffDailyReportFormProps {
  staffId: string;
  staffName: string;
  defaultJobRole?: 'teaching' | 'telecalling' | 'both';
  branchId?: BranchId;
}

export const StaffDailyReportForm: React.FC<StaffDailyReportFormProps> = ({
  staffId,
  staffName,
  defaultJobRole = 'both',
  branchId
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [reportType, setReportType] = useState<'teaching' | 'telecalling' | 'both'>(defaultJobRole);
  const [date, setDate] = useState(getTodayDate());
  const [reportBranch, setReportBranch] = useState<BranchId>(branchId || 'dadagapatty');

  // Telecalling state (with realistic defaults as requested)
  const [todayCalls, setTodayCalls] = useState<number>(37);
  const [todayFollowUp, setTodayFollowUp] = useState<number>(1);
  const [todayEnquiry, setTodayEnquiry] = useState<number>(0);
  const [todayAdmission, setTodayAdmission] = useState<number>(0);
  const [teleNotes, setTeleNotes] = useState<string>('');

  // Teaching state
  const courses: Course[] = dbService.getCourses(reportBranch);
  const allStudents = dbService.getStudentList();

  const [teachingItems, setTeachingItems] = useState<TeachingReportItem[]>([
    {
      id: 'teach-1',
      courseName: courses[0]?.name || 'Artificial Intelligence & Deep Learning (AI)',
      studentCount: 1,
      studentNames: [],
      topicCovered: '',
      projectWorkDetails: ''
    }
  ]);

  const [overallRemarks, setOverallRemarks] = useState('');
  const [customTeachingSummary, setCustomTeachingSummary] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [existingReportId, setExistingReportId] = useState<string | null>(null);

  // Pre-load existing report for this staff and date so adding courses throughout the day updates seamlessly
  React.useEffect(() => {
    const existing = dbService.getWorkReports(date, staffId)[0];
    if (existing) {
      setExistingReportId(existing.id);
      if (existing.reportType) setReportType(existing.reportType);
      if (existing.branchId) setReportBranch(existing.branchId);
      if (existing.teachingItems && existing.teachingItems.length > 0) {
        setTeachingItems(existing.teachingItems);
      }
      if (existing.totalTeachingSummary) {
        setCustomTeachingSummary(existing.totalTeachingSummary);
      }
      if (existing.telecalling) {
        setTodayCalls(existing.telecalling.todayCalls ?? 37);
        setTodayFollowUp(existing.telecalling.todayFollowUp ?? 1);
        setTodayEnquiry(existing.telecalling.todayEnquiry ?? 0);
        setTodayAdmission(existing.telecalling.todayAdmission ?? 0);
        setTeleNotes(existing.telecalling.notes || '');
      }
      if (existing.overallRemarks) {
        setOverallRemarks(existing.overallRemarks);
      }
    } else {
      setExistingReportId(null);
    }
  }, [date, staffId]);

  const autoSummary = computeTeachingSummary(teachingItems);
  const currentTeachingSummary = customTeachingSummary || autoSummary;

  // Live KPI counts
  const totalStudentsTaught = teachingItems.reduce((acc, curr) => acc + (Number(curr.studentCount) || 0), 0);
  const totalCoursesTaught = new Set(teachingItems.map(i => i.courseName)).size;

  // Past reports for this staff
  const staffReports = dbService.getWorkReports(undefined, staffId);
  const currentBranchObj = BRANCHES.find(b => b.id === reportBranch);

  const handleAddTeachingItem = () => {
    const nextCourse = courses[teachingItems.length % courses.length]?.name || courses[0]?.name || 'Course';
    setTeachingItems(prev => [
      ...prev,
      {
        id: 'teach-' + Date.now(),
        courseName: nextCourse,
        studentCount: 1,
        studentNames: [],
        topicCovered: '',
        projectWorkDetails: ''
      }
    ]);
    setCustomTeachingSummary(''); // reset so live auto-summary immediately computes
  };

  const handleRemoveTeachingItem = (id: string) => {
    setTeachingItems(prev => prev.filter(item => item.id !== id));
    setCustomTeachingSummary('');
  };

  const handleUpdateTeachingItem = (id: string, updates: Partial<TeachingReportItem>) => {
    setTeachingItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
    setCustomTeachingSummary('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const reportData: Omit<DailyWorkReport, 'id' | 'timestamp'> & { id?: string } = {
      id: existingReportId || undefined,
      staffId,
      staffName,
      branchId: reportBranch,
      date,
      reportType,
      overallRemarks: overallRemarks.trim() || undefined
    };

    if (reportType === 'telecalling' || reportType === 'both') {
      reportData.telecalling = {
        todayCalls: Number(todayCalls) || 0,
        todayFollowUp: Number(todayFollowUp) || 0,
        todayEnquiry: Number(todayEnquiry) || 0,
        todayAdmission: Number(todayAdmission) || 0,
        notes: teleNotes.trim() || undefined
      };
    }

    if (reportType === 'teaching' || reportType === 'both') {
      reportData.teachingItems = teachingItems;
      reportData.totalTeachingSummary = currentTeachingSummary || undefined;
    }

    dbService.saveWorkReport(reportData);
    setSubmittedMessage(
      existingReportId 
        ? `Daily Teaching Report updated! (${totalStudentsTaught} students in ${totalCoursesTaught} courses, summary: ${currentTeachingSummary})`
        : `Daily Work Report submitted! Total teaching: ${currentTeachingSummary}`
    );
    setTimeout(() => {
      setSubmittedMessage(null);
      setActiveTab('history');
    }, 1600);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-base">Daily Work Report</h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {currentBranchObj?.name} - {currentBranchObj?.location}
            </span>
          </div>
          <p className="text-xs text-slate-500">Submit teaching progress & telecalling metrics for this branch</p>
        </div>

        {/* Tab switcher: Form / History */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'form' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Update Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'history' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            History ({staffReports.length})
          </button>
        </div>
      </div>

      {submittedMessage && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{submittedMessage}</span>
        </div>
      )}

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Date, Branch & Job Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Report Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Salem Branch</label>
              <select
                value={reportBranch}
                onChange={e => setReportBranch(e.target.value as BranchId)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white font-medium"
              >
                {BRANCHES.map(b => (
                  <option key={b.id} value={b.id}>{b.name} - {b.location}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Task Type</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReportType('telecalling')}
                  className={`py-1 px-1 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                    reportType === 'telecalling' 
                      ? 'bg-white text-blue-600 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PhoneCall className="w-3 h-3" /> Calls
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('teaching')}
                  className={`py-1 px-1 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                    reportType === 'teaching' 
                      ? 'bg-white text-blue-600 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3 h-3" /> Teach
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('both')}
                  className={`py-1 px-1 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                    reportType === 'both' 
                      ? 'bg-white text-blue-600 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3 h-3" /> Both
                </button>
              </div>
            </div>
          </div>

          {/* TELECALLING SECTION */}
          {(reportType === 'telecalling' || reportType === 'both') && (
            <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-100 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Telecalling Daily Metrics</h4>
                    <p className="text-[11px] text-slate-500">{currentBranchObj?.name} - {currentBranchObj?.location}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  Telecaller KPI
                </span>
              </div>

              {/* 4 Metrics as requested */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {/* Today Calls */}
                <div className="bg-white p-3 rounded-2xl border border-blue-100 shadow-xs">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Today Calls</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={todayCalls}
                      onChange={e => setTodayCalls(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xl font-extrabold text-blue-700 bg-transparent outline-hidden"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => setTodayCalls(c => c + 1)}
                        className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setTodayCalls(c => Math.max(0, c - 1))}
                        className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">Total calls placed</span>
                </div>

                {/* Today Follow up */}
                <div className="bg-white p-3 rounded-2xl border border-blue-100 shadow-xs">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Today Follow up</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={todayFollowUp}
                      onChange={e => setTodayFollowUp(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xl font-extrabold text-amber-600 bg-transparent outline-hidden"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => setTodayFollowUp(c => c + 1)}
                        className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setTodayFollowUp(c => Math.max(0, c - 1))}
                        className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">Follow-up contacts</span>
                </div>

                {/* Today Enquiry */}
                <div className="bg-white p-3 rounded-2xl border border-blue-100 shadow-xs">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Today Enquiry</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={todayEnquiry}
                      onChange={e => setTodayEnquiry(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xl font-extrabold text-purple-600 bg-transparent outline-hidden"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => setTodayEnquiry(c => c + 1)}
                        className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setTodayEnquiry(c => Math.max(0, c - 1))}
                        className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">Fresh leads</span>
                </div>

                {/* Today Admission */}
                <div className="bg-white p-3 rounded-2xl border border-blue-100 shadow-xs">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Today Admission</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={todayAdmission}
                      onChange={e => setTodayAdmission(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xl font-extrabold text-emerald-600 bg-transparent outline-hidden"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => setTodayAdmission(c => c + 1)}
                        className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setTodayAdmission(c => Math.max(0, c - 1))}
                        className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">Confirmed seats</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Telecalling Notes & Lead Remarks</label>
                <textarea
                  rows={2}
                  value={teleNotes}
                  onChange={e => setTeleNotes(e.target.value)}
                  placeholder="e.g. Enquiries received for Salem college students; 2 scheduled for center visit tomorrow."
                  className="w-full px-3 py-2 text-xs bg-white border border-blue-100 rounded-xl outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* TEACHING SECTION ("just no of student taken class and their course") */}
          {(reportType === 'teaching' || reportType === 'both') && (
            <div className="p-4 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-100 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Classes Taught Today</h4>
                    <p className="text-[11px] text-slate-500">Select course and enter number of students who attended</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddTeachingItem}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Course / Class
                </button>
              </div>

              {/* Live Teaching Stats Tracker */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Students Today</p>
                  <p className="text-base font-extrabold text-emerald-800 font-mono mt-0.5">
                    {totalStudentsTaught} {totalStudentsTaught === 1 ? 'Student' : 'Students'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Different Courses</p>
                  <p className="text-base font-extrabold text-blue-700 font-mono mt-0.5">
                    {totalCoursesTaught} {totalCoursesTaught === 1 ? 'Course' : 'Courses'}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Live Formatted Metric</p>
                  <p className="text-xs font-bold text-emerald-900 font-mono mt-1 truncate">
                    {autoSummary || 'None'}
                  </p>
                </div>
              </div>

              {/* Total Teaching Done Summary Badge & Input */}
              <div className="bg-white/95 p-3.5 rounded-2xl border border-emerald-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <label className="text-xs font-bold text-slate-800">
                      Total Teaching Done on that day
                    </label>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                    Summary: {currentTeachingSummary || 'None'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Auto-formatted summary for daily admin/manager report (e.g. <span className="font-mono font-semibold text-emerald-700">AI-1, C/C++-2</span>):
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customTeachingSummary !== '' ? customTeachingSummary : autoSummary}
                    onChange={e => setCustomTeachingSummary(e.target.value)}
                    placeholder="e.g. AI-1, C/C++-2"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold text-emerald-800 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomTeachingSummary(autoSummary)}
                    className="px-2.5 py-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors whitespace-nowrap"
                    title="Auto-calculate from courses below"
                  >
                    Auto-fill
                  </button>
                </div>
              </div>

              {/* List of courses taught with student count */}
              <div className="space-y-3">
                {teachingItems.map((item) => (
                  <div key={item.id} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-100 shadow-xs space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        Course & Student Count
                      </span>
                      {teachingItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTeachingItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Course Selection */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Course Taken *
                        </label>
                        <select
                          value={item.courseName}
                          onChange={e => handleUpdateTeachingItem(item.id, { courseName: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white font-medium text-slate-800"
                          required
                        >
                          {courses.map(crs => (
                            <option key={crs.id} value={crs.name}>
                              {crs.name} {crs.code ? `(${crs.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Number of Students Taken Class */}
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          No. of Students *
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={item.studentCount}
                            onChange={e => handleUpdateTeachingItem(item.id, { 
                              studentCount: Math.max(1, parseInt(e.target.value) || 1) 
                            })}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white font-bold text-emerald-800 font-mono text-center"
                            required
                          />
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateTeachingItem(item.id, { studentCount: item.studentCount + 1 })}
                              className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTeachingItem(item.id, { studentCount: Math.max(1, item.studentCount - 1) })}
                              className="w-5 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Optional Topic Covered */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Topic Covered / Practical Details (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Loops & Arrays practical lab or Generative AI demo"
                        value={item.topicCovered}
                        onChange={e => handleUpdateTeachingItem(item.id, { topicCovered: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              General Remarks / Handover Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Completed scheduled curriculum modules at Salem branch."
              value={overallRemarks}
              onChange={e => setOverallRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
            />
          </div>

          {existingReportId && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-2xl flex items-center justify-between gap-2">
              <span className="font-medium">
                ℹ️ You already have classes saved for today. Adding new courses or adjusting counts updates today's report live.
              </span>
              <span className="bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded-full text-[10px] shrink-0">
                Live Update Active
              </span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <Save className="w-4 h-4" /> 
            {existingReportId ? "Update & Save Today's Daily Report" : "Save & Submit Daily Work Report"}
          </button>
        </form>
      ) : (
        /* History list */
        <div className="mt-4 space-y-3">
          {staffReports.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No reports submitted yet.</p>
          ) : (
            staffReports.map(rep => {
              const repBranch = BRANCHES.find(b => b.id === rep.branchId);
              return (
                <div key={rep.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">{rep.date}</span>
                      {repBranch && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {repBranch.name} ({repBranch.location})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {rep.reportType}
                    </span>
                  </div>

                  {/* Telecalling stats */}
                  {rep.telecalling && (
                    <div className="grid grid-cols-4 gap-2 bg-white p-2.5 rounded-xl border border-slate-100 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400">Calls</p>
                        <p className="text-sm font-bold text-blue-600">{rep.telecalling.todayCalls}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Follow-up</p>
                        <p className="text-sm font-bold text-amber-600">{rep.telecalling.todayFollowUp}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Enquiry</p>
                        <p className="text-sm font-bold text-purple-600">{rep.telecalling.todayEnquiry}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Admission</p>
                        <p className="text-sm font-bold text-emerald-600">{rep.telecalling.todayAdmission}</p>
                      </div>
                    </div>
                  )}

                  {/* Total Teaching Done Badge */}
                  {rep.totalTeachingSummary && (
                    <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                        Total Teaching Done:
                      </span>
                      <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-xs shadow-2xs">
                        {rep.totalTeachingSummary}
                      </span>
                    </div>
                  )}

                  {/* Teaching entries */}
                  {rep.teachingItems && rep.teachingItems.map((ti, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-emerald-800">{ti.courseName}</p>
                        {ti.topicCovered && (
                          <p className="text-[11px] text-slate-500">{ti.topicCovered}</p>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 shrink-0">
                        {ti.studentCount} {ti.studentCount === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>
                  ))}

                  {rep.overallRemarks && (
                    <p className="text-[11px] text-slate-500 pt-1">
                      <span className="font-medium text-slate-700">Remarks:</span> {rep.overallRemarks}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
