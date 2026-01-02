import React, { useState, useEffect } from 'react';
import { 
  Play, CheckCircle, XCircle, RefreshCw, Trophy, 
  ChevronRight, List, AlertCircle, Loader, 
  Clock, Hash, BookOpen
} from 'lucide-react';

const App = () => {
  // Application States
  const [appState, setAppState] = useState('loading_registry'); // 'loading_registry', 'dashboard', 'playing', 'results'
  
  // Data State
  const [availableQuizzes, setAvailableQuizzes] = useState([]); // Stores fully loaded quizzes
  const [currentQuiz, setCurrentQuiz] = useState(null);         // Currently active quiz object
  const [error, setError] = useState(null);

  // Gameplay State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // --- INITIALIZATION: Fetch Registry & All Quizzes ---
  useEffect(() => {
    const fetchAllQuizzes = async () => {
      try {
        // 1. Fetch the Manifest (List of filenames)
        // Note: This fetch handles the connection to your static folder on GitHub.
        const indexResponse = await fetch('quizzes/index.json');
        
        if (!indexResponse.ok) {
           throw new Error(`Could not load 'quizzes/index.json'. Status: ${indexResponse.status}`);
        }
        
        const filenames = await indexResponse.json();

        if (!Array.isArray(filenames)) throw new Error("index.json must be an array of filenames.");

        // 2. Fetch every file listed in the manifest
        const quizPromises = filenames.map(async (filename) => {
          try {
            const res = await fetch(`quizzes/${filename}`);
            if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
            const data = await res.json();
            
            // Normalize data structure
            let normalized = {
              filename: filename,
              meta: data.meta || { title: filename, topic: 'Unknown', duration: '?', questionCount: data.length || 0 },
              questions: Array.isArray(data) ? data : data.questions
            };
            
            // Validate
            if (!normalized.questions || normalized.questions.length === 0) return null;
            return normalized;

          } catch (err) {
            console.warn(`Skipping invalid quiz file: ${filename}`, err);
            return null;
          }
        });

        // 3. Wait for all requests to finish and filter out failures
        const results = await Promise.all(quizPromises);
        const validQuizzes = results.filter(q => q !== null);

        setAvailableQuizzes(validQuizzes);
        setAppState('dashboard');

      } catch (err) {
        console.warn("Fetch failed (Expected in Preview Mode):", err);
        
        // --- FALLBACK FOR PREVIEW MODE ---
        // Since the 'quizzes' folder doesn't exist in this code editor's preview,
        // we load dummy data so you can still verify the UI works.
        const demoQuizzes = [
          {
            filename: 'demo-js.json',
            meta: { title: 'JavaScript (Demo Preview)', topic: 'Programming', duration: '10 Mins', questionCount: 2 },
            questions: [
              { "question": "What is the result of 2 + '2' in JS?", "options": ["4", "22", "NaN", "Error"], "correctAnswer": 1 },
              { "question": "Which keyword is used to declare a constant?", "options": ["var", "let", "const", "fixed"], "correctAnswer": 2 }
            ]
          },
          {
             filename: 'demo-history.json',
             meta: { title: 'History (Demo Preview)', topic: 'History', duration: '15 Mins', questionCount: 2 },
             questions: [
               { "question": "Who was the first President of the USA?", "options": ["Lincoln", "Washington", "Jefferson", "Adams"], "correctAnswer": 1 },
               { "question": "In which year did WWII end?", "options": ["1940", "1945", "1950", "1939"], "correctAnswer": 1 }
             ]
          }
        ];
        
        setAvailableQuizzes(demoQuizzes);
        setAppState('dashboard');
        // We do not set the error state here so the user sees the dashboard instead of an error message.
      }
    };

    fetchAllQuizzes();
  }, []);

  // --- Gameplay Logic ---

  const startQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setAppState('playing');
    setCurrentQuestionIndex(0);
    setScore(0);
    setUserAnswers([]);
    resetQuestionState();
  };

  const resetQuestionState = () => {
    setSelectedOption(null);
    setIsAnswerRevealed(false);
  };

  const handleOptionSelect = (index) => {
    if (isAnswerRevealed) return;
    setSelectedOption(index);
    setIsAnswerRevealed(true);

    const currentQ = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = index === currentQ.correctAnswer;

    if (isCorrect) setScore(s => s + 1);

    setUserAnswers(prev => [...prev, {
      questionIndex: currentQuestionIndex,
      selectedOptionIndex: index,
      isCorrect
    }]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      resetQuestionState();
    } else {
      setAppState('results');
    }
  };

  // --- Components ---

  const LoadingRegistryScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
      <Loader className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
      <p className="text-lg font-medium">Scanning Quiz Library...</p>
    </div>
  );

  const Dashboard = () => (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-12 pt-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Quiz Dashboard</h1>
        <p className="text-lg text-gray-500">Select a topic below to begin your assessment</p>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">System Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {availableQuizzes.length === 0 && !error ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-400 font-medium">No quizzes found in library.</p>
          <p className="text-sm text-gray-400 mt-2">Upload JSON files to /quizzes and update index.json</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {availableQuizzes.map((quiz, idx) => (
            <button
              key={idx}
              onClick={() => startQuiz(quiz)}
              className="group bg-white rounded-xl shadow-sm hover:shadow-xl border border-gray-200 hover:border-indigo-200 transition-all duration-300 text-left flex flex-col overflow-hidden transform hover:-translate-y-1 h-full"
            >
              <div className="p-6 flex-grow w-full">
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {quiz.meta.topic}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                
                <h3 className="font-bold text-xl text-gray-900 mb-2 line-clamp-2">{quiz.meta.title}</h3>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {quiz.meta.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />
                    {quiz.questions.length} Qs
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-3 text-xs font-bold text-indigo-600 uppercase tracking-wider group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center gap-2">
                Start Quiz <Play className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const QuizScreen = () => {
    const question = currentQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / currentQuiz.questions.length) * 100;

    return (
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 pt-8">
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
           <button 
             onClick={() => setAppState('dashboard')} 
             className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors text-sm font-medium"
           >
             <List className="w-4 h-4" /> Dashboard
           </button>
           <div className="text-center">
             <h2 className="font-bold text-gray-800 text-sm sm:text-base">{currentQuiz.meta.title}</h2>
             <span className="text-xs text-gray-400">{currentQuiz.meta.topic}</span>
           </div>
           <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm">
             Score: {score}
           </span>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium">
            <span>Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}</span>
            <span>{Math.round(progress)}% Completed</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[400px] flex flex-col animate-fade-in border border-gray-100">
          <div className="p-8 md:p-10 flex-grow">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-snug">
              {question.question}
            </h2>
            
            <div className="space-y-3">
              {question.options.map((opt, idx) => {
                let baseClasses = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex justify-between items-center relative group ";
                if (!isAnswerRevealed) {
                  baseClasses += "border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
                } else {
                  if (idx === question.correctAnswer) {
                    baseClasses += "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500";
                  } else if (idx === selectedOption) {
                    baseClasses += "border-red-500 bg-red-50 text-red-800";
                  } else {
                    baseClasses += "border-gray-100 opacity-50 grayscale";
                  }
                }
                return (
                  <button key={idx} onClick={() => handleOptionSelect(idx)} disabled={isAnswerRevealed} className={baseClasses}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        !isAnswerRevealed ? 'bg-gray-100 text-gray-500 group-hover:bg-indigo-200 group-hover:text-indigo-700' : 
                        idx === question.correctAnswer ? 'bg-green-200 text-green-800' :
                        idx === selectedOption ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-medium">{opt}</span>
                    </div>
                    {isAnswerRevealed && idx === question.correctAnswer && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {isAnswerRevealed && idx === selectedOption && idx !== question.correctAnswer && <XCircle className="w-5 h-5 text-red-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-400 italic">
              {isAnswerRevealed ? (
                 selectedOption === question.correctAnswer ? "Correct!" : "Incorrect."
              ) : "Select an answer"}
            </div>
            <button
              onClick={handleNextQuestion}
              disabled={!isAnswerRevealed}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all transform ${
                isAnswerRevealed 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:-translate-y-0.5' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentQuestionIndex === currentQuiz.questions.length - 1 ? 'See Results' : 'Next'} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ResultsScreen = () => {
    const percentage = Math.round((score / currentQuiz.questions.length) * 100);
    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in m-4 mt-10">
        <div className="bg-indigo-600 p-12 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <Trophy className="w-20 h-20 mx-auto mb-6 text-yellow-300 drop-shadow-md" />
            <h2 className="text-5xl font-extrabold mb-2">{score} / {currentQuiz.questions.length}</h2>
            <p className="text-2xl font-medium text-indigo-100 mb-6">{percentage >= 80 ? "Outstanding Performance!" : "Good Effort!"}</p>
            <div className="inline-block bg-indigo-800 bg-opacity-50 px-4 py-2 rounded-lg text-sm">
              Accuracy: {percentage}%
            </div>
          </div>
        </div>
        
        <div className="p-8 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Detailed Summary
          </h3>

          <div className="space-y-4 mb-8">
            {currentQuiz.questions.map((q, index) => {
              const userAnswer = userAnswers.find(a => a.questionIndex === index);
              const isCorrect = userAnswer?.isCorrect;
              const userSelectedOption = userAnswer ? q.options[userAnswer.selectedOptionIndex] : "Skipped";
              const correctOption = q.options[q.correctAnswer];

              return (
                <div key={index} className={`p-4 rounded-xl border-l-4 bg-white shadow-sm ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0">
                      {isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800 text-lg mb-2">
                        <span className="text-gray-500 text-sm font-normal mr-2">Q{index + 1}.</span>
                        {q.question}
                      </p>
                      
                      <div className="text-sm grid gap-2 sm:flex sm:items-center sm:gap-6">
                        {!isCorrect && (
                          <div className="flex items-center gap-2 text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 w-fit">
                            <span className="uppercase text-[10px] tracking-wider font-bold opacity-70">You Selected:</span>
                            {userSelectedOption}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-green-700 font-medium bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 w-fit">
                          <span className="uppercase text-[10px] tracking-wider font-bold opacity-70">Correct Answer:</span>
                          {correctOption}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
            <button onClick={() => startQuiz(currentQuiz)} className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 rounded-xl font-bold transition-all shadow-sm">
              <RefreshCw className="w-5 h-5" /> Replay Quiz
            </button>
            <button onClick={() => setAppState('dashboard')} className="flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md transform hover:-translate-y-0.5">
              <List className="w-5 h-5" /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (appState === 'loading_registry') return <LoadingRegistryScreen />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {appState === 'dashboard' && <Dashboard />}
      {appState === 'playing' && <QuizScreen />}
      {appState === 'results' && <ResultsScreen />}
    </div>
  );
};

export default App;