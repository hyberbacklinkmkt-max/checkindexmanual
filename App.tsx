import React, { useState } from 'react';
import { IndexStatus, LinkData } from './types';
import { checkUrlIndexStatus } from './services/geminiService';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon, 
  TrashIcon,
  LinkIcon,
  ArrowUpOnSquareIcon,
  ClipboardDocumentIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

function App() {
  const [inputText, setInputText] = useState('');
  const [links, setLinks] = useState<LinkData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const processInput = () => {
    if (!inputText.trim()) return;

    const rawLines = inputText.split('\n');
    const newLinks: LinkData[] = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('http') || line.startsWith('www')))
      .map(url => {
        // Ensure protocol
        const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
        return {
          id: Math.random().toString(36).substr(2, 9),
          originalUrl: cleanUrl,
          siteUrl: `https://www.google.com/search?q=site:${encodeURIComponent(cleanUrl)}`,
          status: IndexStatus.PENDING
        };
      });

    setLinks(prev => [...prev, ...newLinks]);
    setInputText('');
  };

  const checkSingleLink = async (id: string) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, status: IndexStatus.CHECKING } : l));
    
    const link = links.find(l => l.id === id);
    if (!link) return;

    const status = await checkUrlIndexStatus(link.originalUrl);

    setLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const updateLinkStatus = (id: string, status: IndexStatus) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const checkAllLinks = async () => {
    setIsProcessing(true);
    for (const link of links) {
      if (link.status === IndexStatus.PENDING) {
        await checkSingleLink(link.id);
      }
    }
    setIsProcessing(false);
  };

  const deleteLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear all data?")) {
      setLinks([]);
    }
  };

  const getRawResultText = () => {
    return links.map(link => {
      if (link.status === IndexStatus.INDEXED) return 'INDEXED';
      if (link.status === IndexStatus.NOT_INDEXED) return 'NO';
      if (link.status === IndexStatus.CHECKING) return 'Checking';
      return 'Pending';
    }).join('\n');
  };

  const copyResults = async () => {
    const text = getRawResultText();

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy results:', err);
      alert('Could not copy to clipboard. Please use the "Show List" option to copy manually.');
    }
  };

  const stats = {
    total: links.length,
    indexed: links.filter(l => l.status === IndexStatus.INDEXED).length,
    notIndexed: links.filter(l => l.status === IndexStatus.NOT_INDEXED).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">IndexChecker <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium bg-slate-100 px-3 py-1 rounded-full text-slate-600">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             API Active
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Input Source */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 sticky top-24">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <ArrowUpOnSquareIcon className="w-4 h-4 text-slate-500"/> 
                  Input Source
                </h2>
                <span className="text-xs text-slate-400">One URL per line</span>
              </div>
              
              <div className="p-4 flex flex-col gap-3">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="https://example.com/page1&#10;https://example.com/page2"
                  className="w-full h-[60vh] lg:h-[calc(100vh-20rem)] p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-mono text-xs leading-5 text-slate-600 shadow-inner bg-slate-50"
                  spellCheck={false}
                />
                <button
                  onClick={processInput}
                  disabled={!inputText.trim()}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpOnSquareIcon className="w-4 h-4 mr-2" />
                  Process List
                </button>
              </div>
            </div>
            
            <div className="text-xs text-slate-400 text-center px-2">
              Supports bulk copy-paste. URLs are automatically cleaned and validated.
            </div>
          </div>

          {/* RIGHT COLUMN: Results Table */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
            
            {/* Action & Stats Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 text-sm w-full sm:w-auto overflow-x-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="text-slate-600 font-medium">Total: {stats.total}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-md border border-green-100">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-green-700 font-medium">Indexed: {stats.indexed}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-md border border-red-100">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-red-700 font-medium">No: {stats.notIndexed}</span>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {links.length > 0 && (
                  <>
                    <button 
                      onClick={() => setShowRaw(!showRaw)}
                      className={`flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center min-w-[100px] ${showRaw ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                    >
                      <ListBulletIcon className="w-4 h-4 mr-2" />
                      {showRaw ? 'Hide List' : 'Show List'}
                    </button>
                    <button 
                      onClick={copyResults}
                      className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center min-w-[140px]"
                    >
                      {copySuccess ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                          Copy Results
                        </>
                      )}
                    </button>
                    <button 
                      onClick={clearAll}
                      className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={checkAllLinks}
                      disabled={isProcessing}
                      className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center disabled:opacity-70"
                    >
                      {isProcessing ? <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin"/> : <MagnifyingGlassIcon className="w-4 h-4 mr-2"/>}
                      {isProcessing ? 'Checking...' : 'Check All (AI)'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Data Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 min-h-[400px]">
              {links.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">
                          Site Command
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-56">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {links.map((link, index) => (
                        <tr key={link.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                            {(index + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4">
                            <a 
                              href={link.siteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm transition-all group-hover:bg-white w-full max-w-xl"
                            >
                              <MagnifyingGlassIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="font-mono truncate">site:{link.originalUrl.replace(/^https?:\/\//, '')}</span>
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {link.status === IndexStatus.CHECKING ? (
                              <span className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-full max-w-[180px] mx-auto">
                                <ArrowPathIcon className="w-3.5 h-3.5 mr-2 animate-spin"/> Checking...
                              </span>
                            ) : (
                              <div className="flex justify-center items-center gap-2">
                                <button 
                                  onClick={() => updateLinkStatus(link.id, IndexStatus.INDEXED)}
                                  className={`
                                    relative flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 border select-none min-w-[80px]
                                    ${link.status === IndexStatus.INDEXED 
                                      ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-200 scale-105 z-10' 
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-green-300 hover:text-green-600 hover:bg-green-50'}
                                  `}
                                >
                                  INDEXED
                                </button>
                                <button 
                                  onClick={() => updateLinkStatus(link.id, IndexStatus.NOT_INDEXED)}
                                  className={`
                                    relative flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 border select-none min-w-[80px]
                                    ${link.status === IndexStatus.NOT_INDEXED 
                                      ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-200 scale-105 z-10' 
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50'}
                                  `}
                                >
                                  NO
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => checkSingleLink(link.id)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Check this URL"
                              >
                                <ArrowPathIcon className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteLink(link.id)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Remove"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <ArrowUpOnSquareIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900">List is empty</h3>
                  <p className="text-xs mt-1">Add URLs from the left panel to begin.</p>
                </div>
              )}
            </div>

            {/* Raw Results View */}
            {showRaw && links.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Raw Results List</h3>
                  <button 
                    onClick={copyResults}
                    className="text-xs flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <ClipboardDocumentIcon className="w-3.5 h-3.5 mr-1"/>
                    Copy to Clipboard
                  </button>
                </div>
                <textarea
                  readOnly
                  value={getRawResultText()}
                  className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                  onClick={(e) => e.currentTarget.select()}
                />
                <p className="text-xs text-slate-400 mt-2">
                  Click inside to select all. Format: One status per line.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;