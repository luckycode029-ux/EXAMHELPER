
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
      setError(err.message || "Analysis failed. Please try again.");
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
      doc.setTextColor(79, 70, 229);
      doc.text(text, margin, y);
      y += 10;
      doc.setTextColor(30, 41, 59);
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

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("Exam Analysis Report", margin, y);
    y += 15;

    addHeading("1. REPEATED QUESTIONS");
    result.repeated_questions.forEach((q, i) => {
      addParagraph(`${i + 1}. ${q.question}`, 11, true);
      addParagraph(`Repeated ${q.count} times in: ${q.years.join(', ')}`, 10);
      y += 2;
    });

    addHeading("2. GENERAL / IMPORTANT QUESTIONS");
    result.important_questions.forEach((q, i) => {
      addParagraph(`${i + 1}. ${q}`);
    });

    addHeading("3. TOP 15 QUESTIONS");
    result.top_15.forEach((q, i) => {
      addParagraph(`${i + 1}. ${q}`);
    });

    addHeading("4. REVISION NOTES");
    result.notes.forEach((note) => {
      addParagraph(`TOPIC: ${note.topic.toUpperCase()}`, 11, true);
      note.content.forEach(point => addParagraph(`• ${point}`, 10));
      y += 4;
    });

    doc.save(`Exam_Analysis_${Date.now()}.pdf`);
  };

  const exportResultsAsText = () => {
    if (!result) return;
    let content = `EXAM PAPER ANALYSIS REPORT\n\n`;
    content += `1. REPEATED QUESTIONS\n`;
    result.repeated_questions.forEach(q => {
      content += `- ${q.question} (Repeated ${q.count}x in ${q.years.join(', ')})\n`;
    });
    content += `\n2. TOP 15 QUESTIONS\n`;
    result.top_15.forEach((q, i) => content += `${i + 1}. ${q}\n`);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Exam_Analysis.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setStatus('IDLE');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg dark:text-white">Exam Helper</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'COMPLETED' && (
            <div className="flex items-center gap-1">
              <button onClick={exportResultsAsPDF} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                <FileDown className="w-5 h-5" />
              </button>
              <button onClick={exportResultsAsText} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                <Download className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <button onClick={() => setIsDark(!isDark)} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {status !== 'IDLE' && (
            <button onClick={reset} className="ml-1 px-2 py-1 text-xs font-bold uppercase text-slate-500 hover:text-indigo-600">
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {status === 'IDLE' && (
          <div className="p-6 space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold dark:text-white">Analysis Engine</h2>
              <p className="text-slate-500 text-sm mt-1">Upload PYQs for high-yield summaries.</p>
            </div>

            <div className="relative group">
              <input type="file" multiple accept="image/*,.pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-white dark:bg-slate-900 hover:border-indigo-500 transition-colors">
                <Plus className="w-8 h-8 text-slate-400 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Add Paper Documents</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-400">Selected ({files.length})</h3>
                {files.map((f, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-3 rounded-lg flex items-center justify-between">
                    <span className="text-sm truncate dark:text-slate-300">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-slate-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={startAnalysis} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4">
                  Generate Analysis <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'ANALYZING' && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold dark:text-white">Analyzing Papers</h3>
            <p className="text-sm text-slate-500 mt-2">Strictly scanning for repetition patterns...</p>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-bold dark:text-white">Engine Error</h3>
            <p className="text-slate-500 mt-2 mb-6">{error}</p>
            <button onClick={reset} className="bg-slate-800 text-white px-8 py-3 rounded-lg font-bold">Try Again</button>
          </div>
        )}

        {status === 'COMPLETED' && result && (
          <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            <div className="flex border-b dark:border-slate-800 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900">
              {[
                { id: 0, label: 'Repeated', icon: History },
                { id: 1, label: 'Important', icon: AlertCircle },
                { id: 2, label: 'Top 15', icon: ListOrdered },
                { id: 3, label: 'Notes', icon: BookOpen }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-5 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                  }`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 pb-24 space-y-8">
              {activeTab === 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 dark:text-white">1. Repeated Questions</h3>
                  <div className="space-y-4">
                    {result.repeated_questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border dark:border-slate-800">
                        <p className="text-sm font-semibold mb-3 dark:text-slate-200">{q.question}</p>
                        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                          <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 px-2 py-1 rounded">REPEATED {q.count}X</span>
                          <span className="flex gap-1">
                            {q.years.map(y => <span key={y} className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{y}</span>)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 dark:text-white">2. Important Concepts</h3>
                  <div className="space-y-3">
                    {result.important_questions.map((q, i) => (
                      <div key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-indigo-600">{i + 1}.</span> {q}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 dark:text-white">3. Top 15 Must-Knows</h3>
                  <div className="space-y-4">
                    {result.top_15.map((q, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-xl">
                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full block w-fit mb-2">TARGET #{i + 1}</span>
                        <p className="text-sm font-medium dark:text-slate-200">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 3 && (
                <div className="space-y-8">
                  <h3 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 dark:text-white">4. Revision Notes</h3>
                  {result.notes.map((n, i) => (
                    <div key={i} className="space-y-2">
                      <h4 className="font-bold text-sm text-indigo-700 uppercase">{n.topic}</h4>
                      <ul className="space-y-1">
                        {n.content.map((c, ci) => <li key={ci} className="text-sm text-slate-600 dark:text-slate-400 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-indigo-300 before:rounded-full">{c}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-12 pt-8 border-t dark:border-slate-800 flex flex-col gap-3">
                <button onClick={exportResultsAsPDF} className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all">
                  <FileDown className="w-5 h-5" /> Download Full Report (PDF)
                </button>
                <p className="text-center text-[10px] text-slate-400 font-bold tracking-widest uppercase">Strict Examiner AI Summary</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800 text-center">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Exam Helper App v1.2</p>
      </footer>
    </div>
  );
}
