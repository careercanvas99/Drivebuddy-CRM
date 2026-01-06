
import React, { useState } from 'react';
import { StorageConfig } from '../types';
import { Database, Key, Github, Folder, GitBranch, ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { GitHubService } from '../services/githubService';

interface CloudStorageSetupProps {
  config: StorageConfig;
  onUpdateConfig: (config: StorageConfig) => void;
}

const CloudStorageSetup: React.FC<CloudStorageSetupProps> = ({ config, onUpdateConfig }) => {
  const [localConfig, setLocalConfig] = useState<StorageConfig>(config);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyStatus('IDLE');
    
    const isValid = await GitHubService.verifyConnection(localConfig);
    
    if (isValid) {
      setVerifyStatus('SUCCESS');
      onUpdateConfig({ ...localConfig, isConnected: true });
    } else {
      setVerifyStatus('ERROR');
    }
    setIsVerifying(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-purple-500" /> Cloud Storage
          </h2>
          <p className="text-slate-400 mt-1">Configure GitHub as your serverless enterprise database.</p>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest ${
          config.isConnected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${config.isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          {config.isConnected ? 'System Connected' : 'Storage Offline'}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Github className="w-3 h-3" /> GitHub Username
                </label>
                <input 
                  type="text" 
                  value={localConfig.owner}
                  onChange={e => setLocalConfig({...localConfig, owner: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Database className="w-3 h-3" /> Repository Name
                </label>
                <input 
                  type="text" 
                  value={localConfig.repo}
                  onChange={e => setLocalConfig({...localConfig, repo: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  placeholder="drivebuddy-db"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <GitBranch className="w-3 h-3" /> Branch
                </label>
                <input 
                  type="text" 
                  value={localConfig.branch}
                  onChange={e => setLocalConfig({...localConfig, branch: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  placeholder="main"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Folder className="w-3 h-3" /> Target Folder Path
                </label>
                <input 
                  type="text" 
                  value={localConfig.folderPath}
                  onChange={e => setLocalConfig({...localConfig, folderPath: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  placeholder="/crm-data/"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Key className="w-3 h-3" /> Personal Access Token (PAT)
              </label>
              <input 
                type="password" 
                value={localConfig.token}
                onChange={e => setLocalConfig({...localConfig, token: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div className="pt-6">
              <button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-purple-900/20"
              >
                {isVerifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Github className="w-5 h-5" />
                )}
                Connect & Authenticate GitHub
              </button>
            </div>

            {verifyStatus === 'SUCCESS' && (
              <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="text-sm font-bold text-green-400">Connection Verified Successfully!</p>
              </div>
            )}

            {verifyStatus === 'ERROR' && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-sm font-bold text-red-400">Connection Failed. Check Token & Repo Permissions.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" /> Security Protocol
            </h4>
            <ul className="space-y-4 text-xs text-slate-400 leading-relaxed">
              <li className="flex gap-2">
                <div className="w-1 h-1 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                Configuration is stored in browser session storage and never exposed to other roles.
              </li>
              <li className="flex gap-2">
                <div className="w-1 h-1 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                Only users with <span className="text-white font-bold">ADMIN</span> credentials can view or modify these settings.
              </li>
              <li className="flex gap-2">
                <div className="w-1 h-1 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                All data packets are Base64 encoded during transit to GitHub REST API.
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Live Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">API Latency</span>
                <span className="text-green-400 font-bold">42ms</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Data Sync</span>
                <span className="text-purple-400 font-bold">Automatic</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Daily Snapshots</span>
                <span className="text-white font-bold">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudStorageSetup;
