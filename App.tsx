
import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  FileText, 
  ListOrdered, 
  History, 
  Loader2, 
  AlertCircle, 
  Plus, 
  X,
  ChevronRight,
  BookOpen,
  Download,
  Moon,
  Sun,
  FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { FileData, AnalysisResult, AppStatus } from './types';
import { analyzePapers } from './geminiService';

export default function App() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [status, setStatus] = useState<AppStatus>('IDLE');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    const uploadedFiles = Array.from(fileList);
    if (uploadedFiles.length === 0) return;

    uploadedFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        setFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setStatus('ANALYZING');
    setError(null);
    try {
      const analysis = await analyzePapers(files);
      setResult(analysis);
      setStatus('COMPLETED');
    } catch (err: any) {
      console.error(err);
      setError("Analysis failed. Please check your documents and try again.");
      setStatus('ERROR');
    }
  };

  const exportResultsAsPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    const checkPageBreak = (needed: number) => {
      if (y + needed > 280) {
        doc.addPage();
        y = 20;
      }
    };

    const addHeading = (text: string) => {
      checkPageBreak(15);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text(text, margin, y);
      y += 10;
      doc.setTextColor(30, 41, 59); // slate-800
    };

    const addParagraph = (text: string, size = 11, isBold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, contentWidth);
      const lineHeight = size * 0.5;
      checkPageBreak(lines.length * lineHeight + 5);
      lines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += 2;
    };

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Exam Analysis Report", margin, y);
    y += 15;

    // 1. Repeated Questions
    addHeading("1. REPEATED QUESTIONS");
    result.repeated_questions.forEach((q, i) => {
      addParagraph(`${i + 1}. ${q.question}`, 11, true);
      addParagraph(`Repeated ${q.count} times in: ${q.years.join(', ')}`, 10);
      y += 2;
    });

    // 2. Important Questions
    addHeading("2. GENERAL / IMPORTANT QUESTIONS");
    result.important_questions.forEach((q, i) => {
      addParagraph(`${i + 1}. ${q}`);
    });

    // 3. Top 15 Questions
    addHeading("3. TOP 15 QUESTIONS (HIGH SCORING)");
    result.top_15.forEach((q, i) => {
      addParagraph(`${i + 1}. ${q}`);
    });

    // 4. Revision Notes
    addHeading("4. REVISION NOTES");
    result.notes.forEach((note) => {
      addParagraph(`TOPIC: ${note.topic.toUpperCase()}`, 11, true);
      note.content.forEach(point => {
        addParagraph(`• ${point}`, 10);
      });
      y += 4;
    });

    doc.save(`Exam_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportResultsAsText = () => {
    if (!result) return;

    let content = `EXAM PAPER ANALYSIS REPORT\n`;
    content += `==========================\n\n`;

    content += `1. REPEATED QUESTIONS\n`;
    content += `--------------------\n`;
    result.repeated_questions.forEach((q, i) => {
      content += `${i + 1}. ${q.question}\n`;
      content += `   Repeated: ${q.count} times\n`;
      content += `   Years: ${q.years.join(', ')}\n\n`;
    });

    content += `2. GENERAL / IMPORTANT QUESTIONS\n`;
    content += `-------------------------------\n`;
    result.important_questions.forEach((q, i) => {
      content += `${i + 1}. ${q}\n`;
    });
    content += `\n`;

    content += `3. TOP 15 QUESTIONS (HIGH SCORING)\n`;
    content += `---------------------------------\n`;
    result.top_15.forEach((q, i) => {
      content += `${i + 1}. ${q}\n`;
    });
    content += `\n`;

    content += `4. REVISION NOTES (THEORY + DEFINITIONS)\n`;
    content += `--------------------------------------\n`;
    result.notes.forEach((note) => {
      content += `TOPIC: ${note.topic.toUpperCase()}\n`;
      note.content.forEach(point => {
        content += `• ${point}\n`;
      });
      content += `\n`;
    });

    content += `\nGenerated by Exam Helper AI Engine`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Exam_Analysis_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setStatus('IDLE');
    setResult(null);
    setError(null);
    setActiveTab(0);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-[#f8fafc] dark:bg-slate-950 text-[#1e293b] dark:text-slate-200 flex flex-col max-w-md mx-auto shadow-xl ring-1 ring-slate-200 dark:ring-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight dark:text-white">Exam Helper</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'COMPLETED' && (
            <div className="flex items-center gap-1">
              <button 
                onClick={exportResultsAsPDF}
                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Download PDF"
              >
                <FileDown className="w-5 h-5" />
              </button>
              <button 
                onClick={exportResultsAsText}
                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                title="Download Text"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setIsDark(!isDark)} 
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isDark ? "Light Mode" : "Dark Mode"}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {status !== 'IDLE' && (
            <button 
              onClick={reset} 
              className="ml-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {status === 'IDLE' && (
          <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Paper Analysis Engine</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Upload your PYQs to generate a high-scoring revision strategy.</p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 group-hover:border-indigo-500 dark:group-hover:border-indigo-400 rounded-xl p-8 flex flex-col items-center justify-center transition-colors bg-white dark:bg-slate-900">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-4">
                    <Plus className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Add PYQ Documents</p>
                  <p className="text-xs text-slate-400 mt-1">Images or PDFs supported</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Selected Papers ({files.length})</h3>
                  {files.map((file, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                        <span className="text-sm truncate font-medium dark:text-slate-300">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(idx)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    onClick={startAnalysis}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    Generate Analysis
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'ANALYZING' && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/20 rounded-full animate-ping opacity-25"></div>
              <div className="relative bg-white dark:bg-slate-900 p-6 rounded-full shadow-xl dark:shadow-indigo-900/10">
                <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 dark:text-white">Analyzing Patterns</h3>
            <div className="space-y-3 max-w-xs">
              <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Scanning documents for repetition...</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse delay-150">Categorizing core concepts...</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse delay-300">Filtering high-yield questions...</p>
            </div>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2 dark:text-white">Analysis Failed</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
            <button onClick={reset} className="bg-slate-800 dark:bg-slate-700 text-white px-8 py-3 rounded-lg font-bold">Try Again</button>
          </div>
        )}

        {status === 'COMPLETED' && result && (
          <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Tabs for Result Sections */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 px-2 overflow-x-auto no-scrollbar">
              {[
                { id: 0, label: 'Repeated', icon: History },
                { id: 1, label: 'Important', icon: AlertCircle },
                { id: 2, label: 'Top 15', icon: ListOrdered },
                { id: 3, label: 'Notes', icon: BookOpen }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-4 border-b-2 transition-all whitespace-nowrap text-sm font-semibold ${
                    activeTab === tab.id 
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 pb-24 overflow-y-auto">
              {activeTab === 0 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3 dark:text-white">1. Repeated Questions</h3>
                  <div className="space-y-4">
                    {result.repeated_questions.length > 0 ? result.repeated_questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-sm font-semibold mb-3 leading-relaxed dark:text-slate-200">{q.question}</p>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-[10px] font-bold">REPEATED {q.count}X</span>
                          <span className="flex gap-1">
                            {q.years.map(y => <span key={y} className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">{y}</span>)}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-400 dark:text-slate-500 text-sm italic">No significant repetition detected.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3 dark:text-white">2. Important Questions</h3>
                  <div className="space-y-3">
                    {result.important_questions.map((q, idx) => (
                      <div key={idx} className="flex gap-3 items-start group">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3 dark:text-white">3. Top 15 (High Scoring)</h3>
                  <div className="space-y-3">
                    {result.top_15.map((q, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold bg-indigo-600 dark:bg-indigo-500 text-white px-2 py-0.5 rounded-full shadow-sm">MUST KNOW #{idx + 1}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3 dark:text-white">4. Revision Notes</h3>
                  <div className="space-y-8">
                    {result.notes.map((note, idx) => (
                      <div key={idx} className="space-y-3">
                        <h4 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900/30 pb-2 flex items-center gap-2">
                          <BookOpen className="w-3 h-3" />
                          {note.topic}
                        </h4>
                        <ul className="space-y-2">
                          {note.content.map((point, pIdx) => (
                            <li key={pIdx} className="text-sm text-slate-600 dark:text-slate-400 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-indigo-300 dark:before:bg-indigo-600 before:rounded-full">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Prominent Download Button at the end of Results */}
              <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                <button 
                  onClick={exportResultsAsPDF}
                  className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                >
                  <FileDown className="w-5 h-5" />
                  Download Full Report (PDF)
                </button>
                <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">
                  Ready to Study? Save your strategy now.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
          Strict Examiner AI Engine • V1.0
        </p>
      </footer>
    </div>
  );
}
