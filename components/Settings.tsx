
import React, { useRef, useState, useEffect } from 'react';
import { CompanySettings, GitHubConfig } from '../types.ts';
import { ICONS } from '../constants.tsx';

interface SettingsProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

interface SyncLog {
  time: string;
  status: 'success' | 'error';
  message: string;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'github'>('profile');
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleGitUpdate = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      githubConfig: {
        ...(prev.githubConfig || {
          repository: '',
          branch: 'main',
          filePath: 'data/db.json',
          token: ''
        }),
        [name]: value
      }
    }));
  };

  const addLog = (status: 'success' | 'error', message: string) => {
    const newLog = {
      time: new Date().toLocaleTimeString(),
      status,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 5));
  };

  const testGitHubConnection = async () => {
    const config = settings.githubConfig;
    if (!config?.repository || !config?.token) {
      alert('Missing Repository or Token.');
      return;
    }

    setIsSyncing(true);
    addLog('success', 'Starting GitHub API Handshake...');

    try {
      const response = await fetch(`https://api.github.com/repos/${config.repository}`, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        addLog('success', `Verified: Access to ${data.full_name} established.`);
        const now = new Date().toLocaleString();
        setSettings(prev => ({
          ...prev,
          githubConfig: { ...prev.githubConfig!, lastSync: now }
        }));
        alert(`Success! Handshake with GitHub repository "${data.full_name}" is active.`);
      } else {
        throw new Error('Repository not found or Token invalid.');
      }
    } catch (error: any) {
      addLog('error', error.message);
      alert(`GitHub Sync Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerGitHubAction = async () => {
    const config = settings.githubConfig;
    if (!config?.workflowId) {
      alert('Please specify a Workflow ID or Filename (e.g. main.yml)');
      return;
    }

    try {
      addLog('success', `Triggering GitHub Action: ${config.workflowId}...`);
      const response = await fetch(
        `https://api.github.com/repos/${config.repository}/actions/workflows/${config.workflowId}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ref: config.branch })
        }
      );

      if (response.status === 204) {
        addLog('success', 'Workflow Dispatch Received by GitHub.');
        alert('GitHub Action Triggered Successfully! Monitor progress in your Repo Actions tab.');
      } else {
        throw new Error('Failed to trigger workflow.');
      }
    } catch (error: any) {
      addLog('error', error.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Cloud & Repository</h2>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Enterprise Persistence Hub</p>
        </div>
        
        <div className="flex bg-gray-900/50 p-1.5 rounded-[1.5rem] border border-gray-800 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'profile' ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' : 'text-gray-500 hover:text-white'}`}
          >
            Brand Assets
          </button>
          <button 
            onClick={() => setActiveTab('github')}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'github' ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' : 'text-gray-500 hover:text-white'}`}
          >
            GitHub Sync
          </button>
        </div>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-[3.5rem] p-12 shadow-2xl space-y-12">
        {activeTab === 'profile' ? (
          <div className="animate-in fade-in slide-in-from-left duration-300">
            {/* Branding form content */}
            <div className="flex flex-col md:flex-row items-center gap-12 border-b border-gray-900 pb-12">
              <div className="relative group">
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-48 h-48 bg-gray-900 border-2 border-dashed border-gray-800 rounded-[3rem] flex items-center justify-center cursor-pointer overflow-hidden group-hover:border-purple-500 transition-all shadow-inner"
                 >
                    {settings.logo ? (
                      <img src={settings.logo} className="w-full h-full object-contain p-6" alt="Logo" />
                    ) : (
                      <div className="text-gray-700 flex flex-col items-center gap-3">
                        <div className="scale-150">{ICONS.Camera}</div>
                        <span className="text-[9px] font-black uppercase tracking-widest">Logo</span>
                      </div>
                    )}
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-2xl font-black text-white">Identity Configuration</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xl">Updates to your brand identity are automatically mirrored to the cloud repository.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-12">
               <div className="space-y-3">
                  <label className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">Entity Name</label>
                  <input 
                    name="name"
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm focus:border-purple-500 outline-none transition-all shadow-inner font-bold text-white"
                    value={settings.name}
                    onChange={handleUpdate}
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">Mobile Helpline</label>
                  <input 
                    name="mobile"
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm focus:border-purple-500 outline-none transition-all shadow-inner font-mono text-purple-400"
                    value={settings.mobile}
                    onChange={handleUpdate}
                  />
               </div>
               <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">Full Office Address</label>
                  <textarea 
                    name="address"
                    className="w-full bg-gray-900 border border-gray-800 rounded-3xl p-6 text-sm h-32 focus:border-purple-500 outline-none transition-all shadow-inner leading-relaxed text-gray-300"
                    value={settings.address}
                    onChange={handleUpdate}
                  />
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-right duration-300">
            {/* GitHub Specific Fields */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                  <h3 className="text-2xl font-black text-white">GitHub Repo Sync</h3>
                  <p className="text-sm text-gray-500 mt-1">Transform your repository into a production database.</p>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={testGitHubConnection}
                    disabled={isSyncing}
                    className="bg-white text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {isSyncing ? 'Pinging GitHub...' : 'Test Connection'}
                  </button>
                  <button 
                    onClick={triggerGitHubAction}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
                  >
                    Run GitHub Action
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
               <div className="space-y-3">
                  <label className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">Repository (owner/repo)</label>
                  <input 
                    name="repository"
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm focus:border-purple-500 outline-none transition-all font-mono text-white"
                    value={settings.githubConfig?.repository || ''}
                    onChange={handleGitUpdate}
                    placeholder="e.g. drivebuddy/operational-data"
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">Branch Name</label>
                  <input 
                    name="branch"
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm focus:border-purple-500 outline-none transition-all font-mono text-white"
                    value={settings.githubConfig?.branch || 'main'}
                    onChange={handleGitUpdate}
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">Data File Path</label>
                  <input 
                    name="filePath"
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm focus:border-purple-500 outline-none transition-all font-mono text-white"
                    value={settings.githubConfig?.filePath || 'data/db.json'}
                    onChange={handleGitUpdate}
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">Personal Access Token (PAT)</label>
                  <input 
                    name="token"
                    type="password"
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm focus:border-purple-500 outline-none transition-all text-purple-500"
                    value={settings.githubConfig?.token || ''}
                    onChange={handleGitUpdate}
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
               </div>
               <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">Workflow YAML (Actions Trigger)</label>
                  <input 
                    name="workflowId"
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm focus:border-purple-500 outline-none transition-all font-mono text-gray-400"
                    value={settings.githubConfig?.workflowId || ''}
                    onChange={handleGitUpdate}
                    placeholder="e.g. nightly-report.yml"
                  />
               </div>
            </div>

            {/* Audit Logs */}
            <div className="space-y-4 pt-10 border-t border-gray-900">
               <h4 className="text-[10px] text-gray-500 uppercase px-4 font-black tracking-[0.2em]">GitHub Sync Audit</h4>
               <div className="bg-gray-950 rounded-[2rem] border border-gray-900 p-6 space-y-3 max-h-40 overflow-y-auto">
                 {logs.length === 0 ? (
                   <p className="text-[10px] text-gray-700 italic text-center py-4">Waiting for Git Commit activity...</p>
                 ) : (
                   logs.map((log, idx) => (
                     <div key={idx} className="flex items-center justify-between text-[10px] font-mono border-b border-gray-900 pb-2">
                       <span className="text-gray-600">[{log.time}]</span>
                       <span className={log.status === 'success' ? 'text-purple-500' : 'text-red-500'}>{log.message}</span>
                     </div>
                   ))
                 )}
               </div>
            </div>
          </div>
        )}

        {/* Global Persistence Status Footer */}
        <div className={`p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 border transition-all duration-700 ${settings.githubConfig?.lastSync ? 'bg-purple-500/5 border-purple-500/20 shadow-lg shadow-purple-900/10' : 'bg-gray-900 border-gray-800'}`}>
           <div className={`p-5 rounded-2xl transition-all duration-500 ${settings.githubConfig?.lastSync ? 'bg-purple-600 text-white animate-pulse' : 'bg-gray-800 text-gray-600'}`}>
             {ICONS.Check}
           </div>
           <div className="flex-1 text-center md:text-left">
             <p className="text-xs text-white font-black uppercase tracking-widest">Git Persistence Status</p>
             <p className="text-[10px] text-gray-500 uppercase font-bold mt-1.5 leading-relaxed tracking-tighter">
               {settings.githubConfig?.lastSync 
                 ? `ACTIVE: Every Operational change is committed to "${settings.githubConfig.repository}" on branch "${settings.githubConfig.branch}".` 
                 : 'LOCAL STANDBY: No GitHub link configured. System is running on browser-level cache only.'}
             </p>
           </div>
           {settings.githubConfig?.lastSync && (
             <span className="bg-purple-600 text-white px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">Enterprise Cloud Live</span>
           )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
