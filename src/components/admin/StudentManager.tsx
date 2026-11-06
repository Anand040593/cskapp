import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  Briefcase, 
  School, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Calendar,
  Clock,
  BookOpen,
  DollarSign,
  Building2,
  Download,
  Edit3,
  Check,
  Banknote,
  QrCode,
  Smartphone
} from 'lucide-react';
import { dbService, getTodayDate, BRANCHES, downloadCSV } from '../../services/db';
import type { UserProfile, StudentAttendance, Course, BranchId, PaymentMode, FeePaymentRecord } from '../../types';

export const StudentManager: React.FC<{ initialBranch?: BranchId | 'all' }> = ({ initialBranch = 'all' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<BranchId | 'all'>(initialBranch);
  const [feeFilter, setFeeFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [dbVersion, setDbVersion] = useState(0);

  // Sync branch filter when parent active branch changes
  useEffect(() => {
    setBranchFilter(initialBranch);
  }, [initialBranch]);

  // Live listener for new registrations, fee payments, and attendance
  useEffect(() => {
    const handleDbChange = () => setDbVersion(v => v + 1);
    window.addEventListener('educenter-db-change', handleDbChange);
    return () => window.removeEventListener('educenter-db-change', handleDbChange);
  }, []);
  
  // Payment modal state ("is it payed via upi or cash and name of the staff collected details")
  const [paymentStudent, setPaymentStudent] = useState<UserProfile | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paymentStaff, setPaymentStaff] = useState<string>('Kalai SK (Admin)');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Edit student modal state
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    courseName: '',
    batchTiming: 'Morning (10:00 AM - 12:30 PM)',
    customBatchTiming: '',
    totalFees: 25000,
    occupation: 'Student',
    standard: '12th Standard'
  });
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);

  // Add student modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBranch, setNewBranch] = useState<BranchId>('dadagapatty');
  const [newOccupation, setNewOccupation] = useState('Student');
  const [newStandard, setNewStandard] = useState('12th Standard');
  const [newCourseId, setNewCourseId] = useState('');
  const [newBatchTiming, setNewBatchTiming] = useState('Morning (10:00 AM - 12:30 PM)');
  const [newTotalFees, setNewTotalFees] = useState('25000');
  const [newPaidFees, setNewPaidFees] = useState('5000');

  const students = dbService.getStudentList(branchFilter);
  const courses = dbService.getCourses(newBranch);
  const allStudentAttendance = dbService.getStudentAttendance();
  const today = getTodayDate();

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.phone.includes(searchQuery) ||
      (student.studentId && student.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.courseName && student.courseName.toLowerCase().includes(searchQuery.toLowerCase()));

    const pending = student.pendingFees || 0;
    const paid = student.paidFees || 0;
    let status: 'paid' | 'partial' | 'pending' = 'pending';
    if (pending === 0 && paid > 0) status = 'paid';
    else if (paid > 0 && pending > 0) status = 'partial';
    else if (paid === 0) status = 'pending';

    const matchesFee = feeFilter === 'all' || status === feeFilter;
    const matchesCourse = courseFilter === 'all' || student.courseId === courseFilter || student.courseName === courseFilter;

    return matchesSearch && matchesFee && matchesCourse;
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentStudent) return;
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) return;

    dbService.updateStudentFees(paymentStudent.id, amount, {
      paymentMode,
      collectedBy: paymentStaff.trim() || 'Kalai SK (Admin)',
      notes: paymentNotes.trim()
    });
    setPaymentSuccess(true);
    setTimeout(() => {
      setPaymentSuccess(false);
      setPaymentStudent(null);
      setPaymentAmount('');
      setPaymentNotes('');
    }, 1200);
  };

  const handleOpenEditStudent = (student: UserProfile) => {
    const standardBatches = [
      'Morning (10:00 AM - 12:30 PM)',
      'Afternoon (02:00 PM - 04:30 PM)',
      'Evening (05:00 PM - 07:30 PM)',
      'Weekend Special Batch'
    ];
    const isStandard = standardBatches.includes(student.batchTiming || '');

    setEditingStudent(student);
    setEditForm({
      name: student.name,
      phone: student.phone,
      email: student.email || '',
      courseName: student.courseName || '',
      batchTiming: isStandard ? (student.batchTiming || 'Morning (10:00 AM - 12:30 PM)') : 'custom',
      customBatchTiming: isStandard ? '' : (student.batchTiming || ''),
      totalFees: student.totalFees || 25000,
      occupation: student.occupation || 'Student',
      standard: student.standard || '12th Standard'
    });
    setEditSuccessMessage(null);
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const finalBatchTiming = editForm.batchTiming === 'custom'
      ? (editForm.customBatchTiming.trim() || 'Custom Timing')
      : editForm.batchTiming;

    const total = Number(editForm.totalFees) || 0;
    const paid = editingStudent.paidFees || 0;
    const pending = Math.max(0, total - paid);

    const updated: UserProfile = {
      ...editingStudent,
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      courseName: editForm.courseName,
      batchTiming: finalBatchTiming,
      totalFees: total,
      pendingFees: pending,
      feeStatus: pending === 0 ? 'paid' : (paid > 0 ? 'partial' : 'pending'),
      occupation: editForm.occupation,
      standard: editForm.standard
    };

    dbService.saveUser(updated);
    setEditSuccessMessage(`Student ${updated.name}'s details & batch timing updated successfully!`);
    setTimeout(() => {
      setEditSuccessMessage(null);
      setEditingStudent(null);
    }, 1200);
  };

  const exportStudentsCSV = () => {
    const headers = [
      'Student ID',
      'Full Name',
      'Campus / Branch',
      'Course Name',
      'Batch Timing',
      'Phone Number',
      'Email',
      'Standard / Grade',
      'Occupation',
      'Total Fees (Rs)',
      'Paid Fees (Rs)',
      'Pending Fees (Rs)',
      'Fee Status',
      'Last Payment Mode',
      'Collected By Staff',
      'Payment Transactions Count',
      'Admission Date'
    ];

    const rows = filteredStudents.map(student => {
      const b = BRANCHES.find(br => br.id === student.branchId);
      const total = student.totalFees || 0;
      const paid = student.paidFees || 0;
      const pending = student.pendingFees !== undefined ? student.pendingFees : Math.max(0, total - paid);
      const statusText = pending === 0 ? 'Paid / Clear' : paid > 0 ? 'Partial Pending' : 'Fully Pending';

      return [
        student.studentId || student.id,
        student.name,
        b?.fullName || student.branchName || 'Salem',
        student.courseName || 'N/A',
        student.batchTiming || 'Morning (10:00 AM - 12:30 PM)',
        student.phone,
        student.email || 'N/A',
        student.standard || 'N/A',
        student.occupation || 'Student',
        total,
        paid,
        pending,
        statusText,
        student.lastPaymentMode ? student.lastPaymentMode.toUpperCase() : 'N/A',
        student.lastPaymentCollectedBy || 'N/A',
        student.paymentHistory ? student.paymentHistory.length : (paid > 0 ? 1 : 0),
        student.createdAt || 'N/A'
      ];
    });

    const branchLabel = branchFilter === 'all' ? 'all-branches' : branchFilter;
    downloadCSV(
      `csk-students-${branchLabel}-${getTodayDate()}.csv`,
      headers,
      rows
    );
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const branchObj = BRANCHES.find(b => b.id === newBranch);
    const selCourse = courses.find(c => c.id === newCourseId) || courses[0];
    const total = parseFloat(newTotalFees) || selCourse.fee;
    const paid = parseFloat(newPaidFees) || 0;
    const pending = Math.max(0, total - paid);

    const newStudent: UserProfile = {
      id: 'usr-student-' + Date.now(),
      email: newEmail.trim(),
      role: 'student',
      name: newName.trim(),
      phone: newPhone.trim(),
      studentId: `STU-${branchObj?.shortCode.split('-')[1] || 'SAL'}-${Math.floor(10 + Math.random() * 90)}`,
      occupation: newOccupation.trim(),
      standard: newStandard.trim(),
      branchId: newBranch,
      branchName: branchObj?.fullName,
      courseId: selCourse.id,
      courseName: selCourse.name,
      batchTiming: newBatchTiming || 'Morning (10:00 AM - 12:30 PM)',
      totalFees: total,
      paidFees: paid,
      pendingFees: pending,
      feeStatus: pending === 0 ? 'paid' : (paid > 0 ? 'partial' : 'pending'),
      createdAt: getTodayDate()
    };

    dbService.saveUser(newStudent);
    setShowAddModal(false);
    // Reset form
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewOccupation('Student');
    setNewStandard('12th Standard');
    setNewTotalFees('25000');
    setNewPaidFees('5000');
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar with Salem Branch Filter */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full lg:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, course, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Branch filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value as any)}
              className="bg-transparent outline-hidden font-semibold text-slate-800"
            >
              <option value="all">All Salem Branches</option>
              {BRANCHES.map(b => (
                <option key={b.id} value={b.id}>{b.name} - {b.location}</option>
              ))}
            </select>
          </div>

          {/* Fee Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setFeeFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                feeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Fees
            </button>
            <button
              onClick={() => setFeeFilter('paid')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                feeFilter === 'paid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setFeeFilter('partial')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                feeFilter === 'partial' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pending
            </button>
          </div>

          {/* Course filter */}
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Courses ({courses.length})</option>
            {courses.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Export Students CSV Button */}
          <button
            onClick={exportStudentsCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
            title="Export student details in CSV for selected branch or all branches"
          >
            <Download className="w-4 h-4" /> Export CSV ({filteredStudents.length})
          </button>

          {/* Add Student Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all shrink-0 ml-auto lg:ml-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 text-xs">
            No students found matching the selected branch or course filter.
          </div>
        ) : (
          filteredStudents.map(student => {
            const total = student.totalFees || 25000;
            const paid = student.paidFees || 0;
            const pending = student.pendingFees !== undefined ? student.pendingFees : Math.max(0, total - paid);
            const studentAttList = allStudentAttendance.filter(a => a.studentId === student.id);
            const todayAtt = studentAttList.find(a => a.date === today);
            const studentBranch = BRANCHES.find(b => b.id === student.branchId);

            return (
              <div
                key={student.id}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{student.name}</h4>
                        <p className="text-[11px] text-slate-500">{student.studentId || 'STU-2026-01'}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      pending === 0 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {pending === 0 ? 'Fees Clear' : `₹${pending.toLocaleString()} Due`}
                    </span>
                  </div>

                  {/* Branch Pill */}
                  <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200/80 rounded-xl text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span className="font-bold text-blue-900">{studentBranch?.name}</span>
                    <span className="text-blue-700">• {studentBranch?.location}</span>
                  </div>

                  {/* Details list */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Occupation:</span>
                      <span className="font-semibold text-slate-800">{student.occupation || 'Student'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Standard / Grade:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">{student.standard || '12th Standard'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Course:</span>
                      <span className="font-medium text-blue-700 truncate max-w-[160px] text-right">{student.courseName || 'Web Dev'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono font-medium text-slate-800">{student.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[150px]">{student.email || 'N/A'}</span>
                    </div>
                    {student.batchTiming && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Timing:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[150px]">{student.batchTiming}</span>
                      </div>
                    )}
                  </div>

                  {/* Fees Bar */}
                  <div className="mt-3 p-3 rounded-2xl border border-slate-100 bg-white">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Fees Paid / Total:</span>
                      <span className="font-bold text-slate-800">
                        ₹{paid.toLocaleString()} / ₹{total.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (paid / (total || 1)) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-[10px] font-bold ${pending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Pending: ₹{pending.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPaymentStudent(student);
                            setPaymentAmount('');
                            setPaymentMode('cash');
                            setPaymentStaff('Kalai SK (Admin)');
                            setPaymentNotes('');
                          }}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[10px] font-semibold border border-blue-200 cursor-pointer"
                        >
                          {pending > 0 ? '+ Collect Fee' : 'Update Fee'}
                        </button>
                        <button
                          onClick={() => handleOpenEditStudent(student)}
                          className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold border border-slate-200 flex items-center gap-1 cursor-pointer"
                          title="Edit Student Details & Batch Timing"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>

                    {student.lastPaymentMode && (
                      <div className="pt-1.5 mt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold">
                          {student.lastPaymentMode === 'upi' ? (
                            <span className="text-blue-700 font-bold flex items-center gap-0.5"><Smartphone className="w-3 h-3" /> UPI</span>
                          ) : (
                            <span className="text-emerald-700 font-bold flex items-center gap-0.5"><Banknote className="w-3 h-3" /> Cash</span>
                          )}
                        </span>
                        {student.lastPaymentCollectedBy && (
                          <span>Staff: <strong className="text-slate-700">{student.lastPaymentCollectedBy}</strong></span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Today's Attendance Snapshot */}
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-slate-500">Today:</span>
                    </div>
                    {todayAtt ? (
                      <span className="font-semibold text-emerald-700 truncate max-w-[180px]">
                        Present ({todayAtt.topicCovered || 'Module'})
                      </span>
                    ) : (
                      <span className="text-slate-400">No attendance today</span>
                    )}
                  </div>
                </div>

                {/* View full attendance button */}
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    View Attendance History ({studentAttList.length})
                  </button>
                  <span className="text-[10px] text-slate-400">{studentBranch?.shortCode}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Collect Fee Modal ("is it payed via upi or cash and name of the staff collected details") */}
      {paymentStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Collect Fee Payment</h3>
                <p className="text-xs text-slate-500">{paymentStudent.name} • {paymentStudent.studentId || paymentStudent.id}</p>
              </div>
              <button 
                onClick={() => setPaymentStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                <p className="font-bold text-slate-900 text-sm">Payment Recorded Successfully!</p>
                <p className="text-xs text-slate-500">Student pending balance and records updated.</p>
              </div>
            ) : (
              <form onSubmit={handleRecordPayment} className="mt-4 space-y-3.5 overflow-y-auto pr-1 flex-1">
                <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Enrolled Course:</span>
                    <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">{paymentStudent.courseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Course Fee:</span>
                    <span className="font-mono font-bold text-slate-800">₹{paymentStudent.totalFees?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Currently Paid:</span>
                    <span className="font-mono font-bold text-emerald-600">₹{paymentStudent.paidFees?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-rose-600 font-bold">Current Pending:</span>
                    <span className="font-mono font-bold text-rose-600">₹{paymentStudent.pendingFees?.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Received Now (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={paymentStudent.pendingFees || 999999}
                    placeholder={`e.g. ${paymentStudent.pendingFees || 5000}`}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                    required
                    autoFocus
                  />
                </div>

                {/* Quick preset buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount('2000')}
                    className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono font-medium cursor-pointer"
                  >
                    +₹2,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount('5000')}
                    className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono font-medium cursor-pointer"
                  >
                    +₹5,000
                  </button>
                  {paymentStudent.pendingFees && paymentStudent.pendingFees > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(paymentStudent.pendingFees))}
                      className="px-2 py-0.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-mono font-bold border border-emerald-200 cursor-pointer"
                    >
                      Clear Full Balance (₹{paymentStudent.pendingFees.toLocaleString()})
                    </button>
                  )}
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'cash'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>💵 Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('upi')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'upi'
                          ? 'bg-blue-50 text-blue-900 border-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>📱 UPI (GPay/PhonePe)</span>
                    </button>
                  </div>
                </div>

                {paymentMode === 'upi' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">UPI Transaction Reference / App</label>
                    <input
                      type="text"
                      placeholder="e.g. GPay / PhonePe Txn #410298"
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-blue-200 bg-blue-50/30 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                    />
                  </div>
                )}

                {/* Staff Member Who Collected Details */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cash / Fee Collected By (Staff Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter staff name who collected the fee"
                    value={paymentStaff}
                    onChange={e => setPaymentStaff(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Quick fill:</span>
                    <button
                      type="button"
                      onClick={() => setPaymentStaff('Kalai SK (Admin)')}
                      className="px-2 py-0.5 text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md font-bold cursor-pointer"
                    >
                      Kalai SK (Admin)
                    </button>
                  </div>
                </div>

                {/* Live Preview */}
                {parseFloat(paymentAmount) > 0 && (
                  <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-emerald-800">New Total Paid:</span>
                      <span className="font-mono font-bold text-emerald-900">
                        ₹{Math.min(paymentStudent.totalFees || 0, (paymentStudent.paidFees || 0) + (parseFloat(paymentAmount) || 0)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Remaining Balance:</span>
                      <span className="font-mono font-bold text-rose-700">
                        ₹{Math.max(0, (paymentStudent.totalFees || 0) - ((paymentStudent.paidFees || 0) + (parseFloat(paymentAmount) || 0))).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-emerald-200/60 text-[11px]">
                      <span className="text-slate-500">Method & Staff:</span>
                      <span className="font-semibold text-slate-800">
                        {paymentMode.toUpperCase()} • Collected by {paymentStaff || 'Staff'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Previous payment history */}
                {paymentStudent.paymentHistory && paymentStudent.paymentHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Previous Payments</span>
                      <span className="text-[10px] font-mono text-slate-400">({paymentStudent.paymentHistory.length})</span>
                    </h4>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {paymentStudent.paymentHistory.map(rec => (
                        <div key={rec.id} className="p-1.5 bg-slate-50 rounded-xl text-[10px] border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className={`px-1 py-0.2 rounded text-[8px] font-bold uppercase mr-1.5 ${rec.paymentMode === 'upi' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {rec.paymentMode}
                            </span>
                            <span className="font-mono font-bold text-slate-800">₹{rec.amount.toLocaleString()}</span>
                            <span className="text-slate-400 ml-1.5">{rec.date} • Staff: {rec.collectedBy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStudent(null)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Attendance & Detail Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-500">{selectedStudent.courseName}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 flex-1 mt-3 space-y-4">
              {/* Student metadata with branch */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Branch / Campus:</span>
                  <p className="font-bold text-blue-800">{selectedStudent.branchName || 'Salem'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Standard:</span>
                  <p className="font-semibold text-slate-800">{selectedStudent.standard || '12th'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Occupation:</span>
                  <p className="font-semibold text-slate-800">{selectedStudent.occupation || 'Student'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Pending Fees:</span>
                  <p className="font-bold text-rose-600">₹{(selectedStudent.pendingFees || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Attendance History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Attendance & Topic Covered Logs ({allStudentAttendance.filter(a => a.studentId === selectedStudent.id).length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {allStudentAttendance.filter(a => a.studentId === selectedStudent.id).length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No attendance recorded yet for this student.</p>
                  ) : (
                    allStudentAttendance
                      .filter(a => a.studentId === selectedStudent.id)
                      .map(att => (
                        <div key={att.id} className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{att.date}</span>
                            <span className="text-[10px] font-semibold text-slate-500 font-mono">
                              {att.inTime} - {att.outTime}
                            </span>
                          </div>
                          <p className="text-blue-700 font-medium">Topic: {att.topicCovered}</p>
                          {att.remarks && <p className="text-[11px] text-slate-500">{att.remarks}</p>}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">Add New Student</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="mt-3 space-y-3 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Salem Campus / Branch</label>
                <select
                  value={newBranch}
                  onChange={e => {
                    const nb = e.target.value as BranchId;
                    setNewBranch(nb);
                    const avail = dbService.getCourses(nb);
                    if (avail.length > 0) {
                      setNewCourseId(avail[0].id);
                      setNewTotalFees(String(avail[0].fee));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white font-semibold text-blue-900"
                >
                  {BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>{b.name} - {b.location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Karthik Raja"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="student@gmail.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Student / Job Seeker"
                    value={newOccupation}
                    onChange={e => setNewOccupation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">If studying: Standard</label>
                  <input
                    type="text"
                    placeholder="e.g. 10th / 12th / B.Tech"
                    value={newStandard}
                    onChange={e => setNewStandard(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Offered at Campus</label>
                <select
                  value={newCourseId}
                  onChange={e => {
                    const cId = e.target.value;
                    setNewCourseId(cId);
                    const found = courses.find(c => c.id === cId);
                    if (found) {
                      setNewTotalFees(String(found.fee));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white font-medium"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code ? `${c.code} - ` : ''}Fee: ₹{c.fee.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Timing</label>
                <select
                  value={newBatchTiming}
                  onChange={e => setNewBatchTiming(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white font-medium text-slate-800"
                >
                  <option value="Morning (10:00 AM - 12:30 PM)">Morning (10:00 AM - 12:30 PM)</option>
                  <option value="Afternoon (02:00 PM - 04:30 PM)">Afternoon (02:00 PM - 04:30 PM)</option>
                  <option value="Evening (05:00 PM - 07:30 PM)">Evening (05:00 PM - 07:30 PM)</option>
                  <option value="Weekend Special Batch">Weekend Special Batch</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Fee (₹)</label>
                  <input
                    type="number"
                    value={newTotalFees}
                    onChange={e => setNewTotalFees(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Paid (₹)</label>
                  <input
                    type="number"
                    value={newPaidFees}
                    onChange={e => setNewPaidFees(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT & BATCH TIMING MODAL (Admin) */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-blue-50 text-blue-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Edit Student Details & Timing</h3>
                  <p className="text-xs text-slate-500">{editingStudent.name} • {editingStudent.studentId || editingStudent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSuccessMessage && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{editSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditStudent} className="space-y-3.5 mt-3 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* BATCH TIMING (EDITABLE) */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
                <label className="block text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Batch Timing (Editable) *
                </label>
                <select
                  value={editForm.batchTiming}
                  onChange={e => setEditForm({ ...editForm, batchTiming: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white font-medium text-slate-800"
                >
                  <option value="Morning (10:00 AM - 12:30 PM)">Morning (10:00 AM - 12:30 PM)</option>
                  <option value="Afternoon (02:00 PM - 04:30 PM)">Afternoon (02:00 PM - 04:30 PM)</option>
                  <option value="Evening (05:00 PM - 07:30 PM)">Evening (05:00 PM - 07:30 PM)</option>
                  <option value="Weekend Special Batch">Weekend Special Batch</option>
                  <option value="custom">Custom Timing (Enter Manually)...</option>
                </select>

                {editForm.batchTiming === 'custom' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Enter Custom Timing:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 07:00 AM - 09:00 AM (Early Batch)"
                      value={editForm.customBatchTiming}
                      onChange={e => setEditForm({ ...editForm, customBatchTiming: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white font-medium"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name</label>
                <input
                  type="text"
                  value={editForm.courseName}
                  onChange={e => setEditForm({ ...editForm, courseName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Course Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.totalFees}
                    onChange={e => setEditForm({ ...editForm, totalFees: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard / Grade</label>
                  <input
                    type="text"
                    value={editForm.standard}
                    onChange={e => setEditForm({ ...editForm, standard: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 shrink-0 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
