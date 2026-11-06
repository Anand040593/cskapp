import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  CheckCircle, 
  Globe, 
  Save, 
  Download, 
  Upload,
  RotateCcw, 
  ShieldCheck,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  Zap,
  RefreshCw,
  ExternalLink,
  Flame
} from 'lucide-react';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  DEFAULT_FIREBASE_SPARK_CONFIG,
  isFirebaseConfigured,
  type FirebaseConfig 
} from '../../services/firebase';
import { dbService } from '../../services/db';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface CloudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudModal: React.FC<CloudModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'firebase_spark' | 'backup_sync'>('firebase_spark');

  const [config, setConfig] = useState<FirebaseConfig>(() => {
    const saved = getSavedFirebaseConfig();
    return saved || DEFAULT_FIREBASE_SPARK_CONFIG;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncCloudSuccess, setSyncCloudSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      window.location.reload();
    }, 1500);
  };

  const handleLoadDemoSpark = () => {
    setConfig(DEFAULT_FIREBASE_SPARK_CONFIG);
    saveFirebaseConfig(DEFAULT_FIREBASE_SPARK_CONFIG);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      window.location.reload();
    }, 1500);
  };

  const handleSyncWithCloudNow = async () => {
    setSyncingCloud(true);
    setSyncCloudSuccess(false);
    const ok = await dbService.syncWithCloud();
    setSyncingCloud(false);
    if (ok) {
      setSyncCloudSuccess(true);
      setTimeout(() => setSyncCloudSuccess(false), 3000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset sample data back to original state for all 4 Salem branches?')) {
      dbService.resetToSeed();
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        window.location.reload();
      }, 1000);
    }
  };

  const handleExport = async () => {
    const fullBackup = {
      users: dbService.getUsers(),
      staffAttendance: dbService.getStaffAttendance(),
      studentAttendance: dbService.getStudentAttendance(),
      workReports: dbService.getWorkReports(),
      courses: dbService.getCourses(),
      exportedAt: new Date().toISOString(),
      center: 'CSK Academy & InfoSpark Innovation Pvt Ltd (Salem, Tamil Nadu)'
    };
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    const filename = `csk-salem-backup-${new Date().toISOString().split('T')[0]}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        const fileResult = await Filesystem.writeFile({
          path: filename,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: filename,
          text: `CSK Academy Full System Backup`,
          url: fileResult.uri,
          dialogTitle: `Export Backup File`
        });
        return;
      } catch (err) {
        console.warn('Native share failed, using blob fallback', err);
      }
    }

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.users && Array.isArray(parsed.users)) {
          localStorage.setItem('csk_users_v3', JSON.stringify(parsed.users));
        }
        if (parsed.staffAttendance && Array.isArray(parsed.staffAttendance)) {
          localStorage.setItem('csk_staff_attendance_v3', JSON.stringify(parsed.staffAttendance));
        }
        if (parsed.studentAttendance && Array.isArray(parsed.studentAttendance)) {
          localStorage.setItem('csk_student_attendance_v3', JSON.stringify(parsed.studentAttendance));
        }
        if (parsed.workReports && Array.isArray(parsed.workReports)) {
          localStorage.setItem('csk_work_reports_v3', JSON.stringify(parsed.workReports));
        }
        if (parsed.courses && Array.isArray(parsed.courses)) {
          localStorage.setItem('csk_courses_v3', JSON.stringify(parsed.courses));
        }
        window.dispatchEvent(new Event('educenter-db-change'));
        setImportSuccess(true);
        setTimeout(() => {
          setImportSuccess(false);
          window.location.reload();
        }, 1200);
      } catch (err) {
        setImportError('Invalid backup file. Please select a valid CSK JSON backup file.');
        setTimeout(() => setImportError(null), 3500);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header with Free Badge */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Firebase Spark Plan</h3>
                <span className="bg-emerald-500 text-white font-black text-[9px] sm:text-[10px] uppercase px-2 py-0.5 rounded-full shadow-xs">
                  100% Free
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">Live Cloud Firestore • Salem 4 Branches</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 flex-1">

        {/* 100% Free Spark Plan Guarantee Banner */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-50 via-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <p className="font-bold text-emerald-950 text-xs">Official Google Spark Plan Quota (₹0 / Month)</p>
            </div>
            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              FREE FOREVER
            </span>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            Google Firebase Spark Plan provides <strong>50,000 free document reads</strong> and <strong>20,000 free document writes every single day</strong> with <strong>no credit card required</strong>.
          </p>
        </div>

        {/* Navigation tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('firebase_spark')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'firebase_spark'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Firebase Spark Config</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup_sync')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'backup_sync'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Backup & Transfer</span>
          </button>
        </div>

        {activeTab === 'firebase_spark' ? (
          /* TAB 1: Firebase Spark Plan Setup & Form */
          <div className="mt-4 space-y-4">
            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncWithCloudNow}
                disabled={syncingCloud}
                className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
                <span>{syncingCloud ? 'Syncing...' : 'Sync Live Cloud Data'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadDemoSpark}
                className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Fill demo Spark keys"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Load Default Keys</span>
              </button>
            </div>

            {syncCloudSuccess && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" /> Cloud database synchronized successfully!
              </p>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Firebase Project ID (Spark Plan)
                </label>
                <input
                  type="text"
                  placeholder="e.g. csk-salem-spark"
                  value={config.projectId}
                  onChange={e => setConfig({ ...config, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">API Key</label>
                  <input
                    type="text"
                    placeholder="Firebase API Key"
                    value={config.apiKey}
                    onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden font-mono text-[11px]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Auth Domain</label>
                  <input
                    type="text"
                    placeholder="csk-salem.firebaseapp.com"
                    value={config.authDomain}
                    onChange={e => setConfig({ ...config, authDomain: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden text-[11px]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Bucket (Optional)</label>
                  <input
                    type="text"
                    placeholder="csk-salem.appspot.com"
                    value={config.storageBucket || ''}
                    onChange={e => setConfig({ ...config, storageBucket: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">App ID</label>
                  <input
                    type="text"
                    placeholder="1:1098...:web:..."
                    value={config.appId || ''}
                    onChange={e => setConfig({ ...config, appId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden text-[11px] font-mono"
                  />
                </div>
              </div>

              {savedSuccess && (
                <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-center flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Firebase Spark Plan Connected! Reloading...
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
              >
                <Save className="w-4 h-4" /> Connect Free Firebase Spark Plan
              </button>
            </form>

            {/* Quick 3-Step Setup Instructions */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                How to get your own Free Firebase Project (2 mins):
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">console.firebase.google.com</a> with your Gmail.</li>
                <li>Click <strong>Add project</strong> (e.g. <code>csk-salem</code>) and select default <strong>Spark Plan (Free)</strong>.</li>
                <li>Go to <strong>Build → Firestore Database</strong> → click <strong>Create database</strong> (choose "Start in test mode").</li>
                <li>In Project Settings, click <code>&lt;/&gt;</code> Web icon to copy your free keys and paste above!</li>
              </ol>
            </div>
          </div>
        ) : (
          /* TAB 2: Backup & Restore */
          <div className="mt-4 space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Local-First Multi-Device Engine:</span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                <li>Works completely offline & online on all Android phones.</li>
                <li>Staff updates their attendance & reports with zero internet delay.</li>
                <li>Data is permanently cached on the device and synchronized.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-800">
                1-Click Free Cross-Device Sync & Backup:
              </p>
              <p className="text-[11px] text-slate-500">
                Export all branch data to transfer to another phone, or restore from a backup:
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExport}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
                >
                  <Download className="w-4 h-4" /> Export Backup
                </button>

                <label className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 transition-colors">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Restore Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>

              {importSuccess && (
                <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2 rounded-xl flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Data synchronized and restored successfully! Reloading...
                </p>
              )}

              {importError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {importError}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Reset 4 Salem branches to default demo data:</span>
              <button
                type="button"
                onClick={handleReset}
                className="py-1.5 px-3 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Data
              </button>
            </div>
          </div>
        )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>CSK Academy & InfoSpark</span>
          <span className="font-extrabold text-amber-600 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Firebase Spark Plan (₹0 / Free)
          </span>
        </div>
      </div>
    </div>
  );
};
