"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient'; 
import { academyData, Level, Lesson } from './academyData';

export default function AcademyView({ darkMode, userData, updateUserBalance }: any) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  
  // Stanja za Gatekeeperja
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Stanje napredka (na podlagi baze)
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const [unlockedLessonIdx, setUnlockedLessonIdx] = useState(0);
  
  // 🔥 AI MENTOR STATE 🔥
  const [isAcademyCompleted, setIsAcademyCompleted] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [isActivatingMentor, setIsActivatingMentor] = useState(false);

  const activeLesson: Lesson = academyData[currentLevel]?.lessons[currentLessonIdx];

  const getGlassPanelClass = (darkMode: boolean) => darkMode 
    ? 'bg-zinc-900/40 backdrop-blur-2xl border border-white/5 shadow-2xl text-white' 
    : 'bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-xl text-zinc-900';

  // 1. FETCH PROGRESS FROM DATABASE
  useEffect(() => {
    const fetchProgress = async () => {
      if (!userData?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userData.id)
          .eq('is_completed', true)
          .order('level_index', { ascending: false })
          .order('lesson_index', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const highestCompleted = data[0];
          
          let nextLevel = highestCompleted.level_index;
          let nextLesson = highestCompleted.lesson_index + 1;

          // Preveri, če smo že prebili celotno akademijo (zadnji level, zadnja lekcija)
          if (highestCompleted.level_index === academyData.length - 1 && 
              highestCompleted.lesson_index === academyData[academyData.length - 1].lessons.length - 1) {
              setIsAcademyCompleted(true);
          }

          if (nextLesson >= academyData[nextLevel].lessons.length) {
              if (nextLevel < academyData.length - 1) {
                  nextLevel++;
                  nextLesson = 0;
              } else {
                  nextLesson = academyData[nextLevel].lessons.length - 1;
              }
          }

          setUnlockedLevel(nextLevel);
          setUnlockedLessonIdx(nextLesson);
          setCurrentLevel(nextLevel);
          setCurrentLessonIdx(nextLesson);
        }
      } catch (err) {
        console.error("Error fetching academy progress", err);
      }
    };
    
    fetchProgress();
  }, [userData?.id]);

  useEffect(() => {
    if (showQuiz && activeLesson?.quiz_bank && activeLesson.quiz_bank.length > 0) {
        const randomIdx = Math.floor(Math.random() * activeLesson.quiz_bank.length);
        setActiveQuestion(activeLesson.quiz_bank[randomIdx]);
    }
  }, [showQuiz, activeLesson]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    } else if (cooldown === 0 && quizFeedback === 'wrong') {
       setQuizFeedback(null);
       if (activeLesson?.quiz_bank && activeLesson.quiz_bank.length > 1) {
           let newRandomIdx;
           do {
               newRandomIdx = Math.floor(Math.random() * activeLesson.quiz_bank.length);
           } while (activeLesson.quiz_bank[newRandomIdx].question === activeQuestion?.question);
           
           setActiveQuestion(activeLesson.quiz_bank[newRandomIdx]);
       }
    }
    return () => clearInterval(timer);
  }, [cooldown, quizFeedback, activeLesson, activeQuestion]);

  // 🔥 EARN-TO-LEARN PROTOKOL 🔥
  const saveProgressToDB = async (lvl: number, les: number) => {
      if (!userData?.id) return false;
      try {
          const { data: existing } = await supabase
            .from('user_progress')
            .select('id')
            .eq('user_id', userData.id)
            .eq('level_index', lvl)
            .eq('lesson_index', les)
            .maybeSingle();

          if (!existing) {
              await supabase
                .from('user_progress')
                .insert([{
                    user_id: userData.id,
                    level_index: lvl,
                    lesson_index: les,
                    is_completed: true,
                    updated_at: new Date().toISOString()
                }]);
              
              if (updateUserBalance) {
                await updateUserBalance(userData.id, 1);
              }
              toast.success("🧠 KNOWLEDGE ACQUIRED: +1 GAINS added to Vault!");
              return true; 
          }
          return false; 
      } catch (err) {
          console.error("Progress save failed:", err);
          return false;
      }
  };

  const handleQuizSubmit = async () => {
    if (!activeQuestion) return;

    if (selectedAnswer === activeQuestion.correctAnswer) {
      setQuizFeedback("correct");
      
      const isNewVictory = await saveProgressToDB(currentLevel, currentLessonIdx);

      setTimeout(async () => {
        setQuizFeedback(null);
        setSelectedAnswer(null);
        setShowQuiz(false);
        
        const isLastLessonInLevel = currentLessonIdx === academyData[currentLevel].lessons.length - 1;
        const isLastLevel = currentLevel === academyData.length - 1;

        if (!isLastLessonInLevel) {
          // Naslednja lekcija
          const nextLessonIdx = currentLessonIdx + 1;
          setCurrentLessonIdx(nextLessonIdx);
          
          if (currentLevel === unlockedLevel && nextLessonIdx > unlockedLessonIdx) {
              setUnlockedLessonIdx(nextLessonIdx);
          }
        } else {
          // 🔥 MODUL ZAKLJUČEN BONUS 🔥
          if (isNewVictory) {
              if (updateUserBalance) await updateUserBalance(userData.id, 5);
              toast.success("🏆 MODULE MASTERED: +5 GAINS Bonus Awarded!", { duration: 5000, icon: '💰' });
          }
          
          if (!isLastLevel) {
            // Skok na naslednji level
            const nextLevel = currentLevel + 1;
            setCurrentLevel(nextLevel);
            setCurrentLessonIdx(0);
            
            if (nextLevel > unlockedLevel) {
               setUnlockedLevel(nextLevel);
               setUnlockedLessonIdx(0);
            }
          } else {
             // 🔥 AKADEMIJA ZAKLJUČENA - PODELITEV ZNAČKE IN ODKLEP MENTORJA 🔥
             if (isNewVictory) {
                 await supabase.from('profiles').update({ style: 'Verified Scholar 🎓' }).eq('id', userData.id);
                 
                 await supabase.from('messages').insert([{ 
                    from_alias: 'SYSTEM', 
                    to_alias: userData.alias, 
                    text: '🎓 ACADEMY COMPLETE: You have earned the [VERIFIED SCHOLAR] badge and elite network status!', 
                    is_read: false 
                 }]);
             }
             setIsAcademyCompleted(true);
             toast.success("🎉 ACADEMY COMPLETED! You are now a Verified Scholar.", { duration: 8000 });
          }
        }
      }, 1500);
    } else {
      setQuizFeedback("wrong");
      setCooldown(10); 
      setSelectedAnswer(null); 
    }
  };

  const isLessonLocked = (lIdx: number, lessonIdx: number) => {
      if (lIdx < unlockedLevel) return false; 
      if (lIdx === unlockedLevel && lessonIdx <= unlockedLessonIdx) return false; 
      return true; 
  };

  const handleActivateMentor = async () => {
     if (!selectedStrategy) return toast.error("Please select a trading strategy first.");
     if (!userData.is_premium) return toast.error("PRO Node access is required to deploy the AI Mentor.");
     
     setIsActivatingMentor(true);
     toast.loading("Initiating J.A.R.V.I.S. Protocol...");
     
     try {
         // Shranimo strategijo v profil uporabnika
         await supabase.from('profiles').update({ mentor_strategy: selectedStrategy }).eq('id', userData.id);
         
         setTimeout(() => {
             toast.dismiss();
             toast.success("AI Mentor Activated! Your personalized trading assistant is now online.");
             setIsActivatingMentor(false);
             // Tukaj bi ga načeloma lahko preusmerili v chat ali mu odprli novo okno
         }, 3000);
     } catch (e) {
         toast.dismiss();
         toast.error("Failed to connect to the mainframe.");
         setIsActivatingMentor(false);
     }
  };

  if (!activeLesson && !isAcademyCompleted) return <div className="p-10 text-center uppercase font-black opacity-50">Loading Curriculum...</div>;

  return (
    <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto h-[80vh] gap-6 animate-in fade-in duration-700">
      
      {/* SIDEBAR (SKRIT ČE JE AKADEMIJA ZAKLJUČENA IN SMO V MENTOR POGLEDU) */}
      {!isAcademyCompleted && (
        <div className={`${isSidebarOpen ? 'w-full md:w-80' : 'w-16'} transition-all duration-500 flex flex-col gap-4 overflow-hidden shrink-0`}>
          <div className={`p-6 rounded-[2rem] h-full overflow-y-auto custom-scrollbar ${getGlassPanelClass(darkMode)}`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className={`text-xs font-black uppercase tracking-widest text-blue-500 ${!isSidebarOpen && 'hidden'}`}>Curriculum</h3>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="opacity-50 hover:opacity-100 p-2 transition-transform">
                {isSidebarOpen ? '◀' : '▶'}
              </button>
            </div>

            {isSidebarOpen && academyData.map((level, lIdx) => (
              <div key={lIdx} className="mb-6">
                <div className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-[0.2em] flex items-center justify-between">
                  <span>Level {level.level}: {level.title}</span>
                  {unlockedLevel > lIdx && <span className="text-green-500">✓</span>}
                </div>
                <div className="space-y-2">
                  {level.lessons.map((lesson, lessonIdx) => {
                    const locked = isLessonLocked(lIdx, lessonIdx);
                    const active = currentLevel === lIdx && currentLessonIdx === lessonIdx;
                    
                    return (
                      <button
                        key={lesson.id}
                        disabled={locked}
                        onClick={() => {
                          if (!locked) {
                             setCurrentLevel(lIdx);
                             setCurrentLessonIdx(lessonIdx);
                             setShowQuiz(false);
                             setQuizFeedback(null);
                             setCooldown(0);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-between ${
                          active 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                          : locked
                             ? 'border-transparent opacity-30 cursor-not-allowed'
                             : 'border-transparent opacity-60 hover:opacity-100 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate pr-2">{lesson.id} {lesson.title}</span>
                        {locked && <span>🔒</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className={`p-8 md:p-12 rounded-[2.5rem] h-full overflow-y-auto custom-scrollbar relative ${getGlassPanelClass(darkMode)}`}>
          
          {isAcademyCompleted ? (
            /* 🔥 AI MENTOR DEPLOYMENT TERMINAL (Po uspešni akademiji) 🔥 */
            <div className="animate-in zoom-in-95 duration-700 text-center flex flex-col h-full max-w-2xl mx-auto py-4">
               
               <div className="mb-8">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_40px_rgba(59,130,246,0.6)] border-4 border-white/10 animate-pulse">
                     🤖
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">J.A.R.V.I.S. Protocol</h2>
                  <p className="text-[10px] md:text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Personalized Trading Artificial Intelligence</p>
               </div>

               <div className={`p-6 md:p-8 rounded-2xl mb-8 border text-left ${darkMode ? 'bg-black/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <h4 className={`text-sm font-black uppercase tracking-widest mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>Configure Your Assistant</h4>
                  <p className="text-[10px] md:text-xs text-zinc-500 mb-6 leading-relaxed">
                    You have successfully completed the GainWave Academy. You may now deploy your personal AI Mentor. Please select your primary trading strategy so the algorithm can optimize its market analysis for your specific style.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button 
                        onClick={() => setSelectedStrategy('SMC')}
                        className={`p-4 rounded-xl border text-left transition-all group ${selectedStrategy === 'SMC' ? 'bg-blue-500/20 border-blue-500' : 'border-zinc-700 bg-black/20 hover:border-blue-500/50'}`}
                     >
                        <span className={`block text-xs font-black uppercase tracking-widest mb-1 ${selectedStrategy === 'SMC' ? 'text-blue-400' : 'text-zinc-400'}`}>SMC Master</span>
                        <span className="block text-[9px] text-zinc-500 uppercase">Focuses purely on Orderblocks, FVG, and Liquidity Sweeps. Strict risk management.</span>
                     </button>
                     
                     <button 
                        onClick={() => setSelectedStrategy('PriceAction')}
                        className={`p-4 rounded-xl border text-left transition-all group ${selectedStrategy === 'PriceAction' ? 'bg-purple-500/20 border-purple-500' : 'border-zinc-700 bg-black/20 hover:border-purple-500/50'}`}
                     >
                        <span className={`block text-xs font-black uppercase tracking-widest mb-1 ${selectedStrategy === 'PriceAction' ? 'text-purple-400' : 'text-zinc-400'}`}>Pure Price Action</span>
                        <span className="block text-[9px] text-zinc-500 uppercase">Focuses on Support/Resistance, Trendlines, and classic candlestick patterns.</span>
                     </button>
                  </div>
                  
                  <div className="mt-4">
                      <button 
                        onClick={() => setSelectedStrategy('Custom')}
                        className={`w-full p-4 rounded-xl border text-center transition-all group ${selectedStrategy === 'Custom' ? 'bg-zinc-800 border-white text-white' : 'border-zinc-700 bg-black/20 hover:border-zinc-500 text-zinc-400'}`}
                     >
                        <span className="block text-xs font-black uppercase tracking-widest">Custom / Hybrid</span>
                     </button>
                  </div>
               </div>

               {/* 🔥 PRO PAYWALL 🔥 */}
               {!userData?.is_premium ? (
                  <div className="mt-auto p-6 rounded-2xl bg-gradient-to-r from-red-900/40 to-black border border-red-500/30">
                     <span className="text-3xl mb-3 block">🔒</span>
                     <h4 className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">Access Denied</h4>
                     <p className="text-[10px] text-zinc-400 mb-4">The AI Mentor is an elite, server-intensive protocol available exclusively to PRO Nodes.</p>
                     <button className="px-8 py-4 w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                        Upgrade to PRO to Unlock
                     </button>
                  </div>
               ) : (
                  <div className="mt-auto space-y-4">
                      <button 
                        onClick={handleActivateMentor}
                        disabled={!selectedStrategy || isActivatingMentor}
                        className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
                          !selectedStrategy || isActivatingMentor 
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:brightness-110 active:scale-95 border border-white/20'
                        }`}
                      >
                         {isActivatingMentor ? 'Establishing Neural Link...' : 'Deploy AI Mentor'}
                      </button>
                      
                      {/* 🔥 LEGAL DISCLAIMER 🔥 */}
                      <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 mt-6 rounded-xl">
                          <p className="text-[7px] md:text-[8px] text-zinc-500 uppercase leading-relaxed font-bold">
                            <span className="text-red-500">⚠️ NODE WARNING:</span> The AI Mentor is an analytical engine designed to provide probability-based insights according to specific trading strategies. It is <strong>NOT a financial advisor</strong>. The AI can misinterpret data. All trading carries extreme financial risk. No AI advice is a guarantee of profit. You are solely responsible for executing trades. Always Do Your Own Research (DYOR) before risking capital.
                          </p>
                      </div>
                  </div>
               )}
            </div>

          ) : !showQuiz ? (
            /* 🔥 NORMALNI ACADEMY LESSON VIEW 🔥 */
            <div className="animate-in slide-in-from-right-4 duration-500 pb-10">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl">📘</span>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">{activeLesson.title}</h2>
                  <p className="text-[9px] font-black uppercase opacity-50 tracking-widest">GainWave Academy Lesson {activeLesson.id}</p>
                </div>
              </div>

              <div 
                className={`prose prose-invert max-w-none text-sm md:text-base leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-600'} [&>h3]:text-blue-400 [&>h3]:uppercase [&>h3]:font-black [&>h3]:text-lg [&>h3]:mt-8 [&>h3]:mb-4 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-6 [&>ul>li]:mb-2 [&_strong]:text-blue-500`}
                dangerouslySetInnerHTML={{ __html: activeLesson.content }} 
              />

              <div className="mt-16 flex justify-end">
                <button 
                  onClick={() => setShowQuiz(true)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:brightness-110 hover:-translate-y-1 active:scale-95 transition-all"
                >
                  Verify Knowledge ➔
                </button>
              </div>
            </div>
          ) : (
            /* 🔥 GATEKEEPER QUIZ VIEW 🔥 */
            <div className="animate-in zoom-in-95 duration-300 text-center flex flex-col h-full justify-center max-w-xl mx-auto py-10">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl mb-6 transition-all ${quizFeedback === 'wrong' ? 'bg-red-500/20 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-110' : 'bg-blue-500/20 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}`}>🤖</div>
              <h3 className="text-2xl font-black uppercase mb-2">Gatekeeper Challenge</h3>
              <p className="text-xs mb-8 opacity-60 uppercase tracking-widest">Answer correctly to unlock next intel & earn GAINS</p>

              {activeQuestion && (
                <div className={`p-6 md:p-8 rounded-2xl text-left mb-8 transition-all ${quizFeedback === 'wrong' ? 'border-red-500/50 bg-red-900/10' : darkMode ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-zinc-100 border border-zinc-300'}`}>
                  <p className="text-sm md:text-base font-bold mb-6">{activeQuestion.question}</p>
                  <div className="space-y-3">
                    {activeQuestion.options.map((opt: string, i: number) => (
                      <button 
                        key={i}
                        onClick={() => { if (cooldown === 0) setSelectedAnswer(i); }}
                        disabled={cooldown > 0}
                        className={`w-full text-left p-4 rounded-xl text-xs md:text-sm font-medium transition-all border ${
                          selectedAnswer === i 
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-inner' 
                            : cooldown > 0 
                               ? 'border-transparent opacity-40 cursor-not-allowed'
                               : darkMode ? 'border-zinc-700 hover:border-zinc-500 hover:bg-white/5' : 'border-zinc-300 hover:border-zinc-400 hover:bg-black/5'
                        }`}
                      >
                        <span className="font-black text-blue-500 mr-2">{String.fromCharCode(65 + i)})</span> {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {quizFeedback === 'wrong' && (
                <div className="text-red-500 text-xs md:text-sm font-black uppercase tracking-widest mb-6 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                  <span className="block mb-1">❌ Access Denied. Flawed logic detected.</span>
                  {cooldown > 0 ? (
                    <span className="text-white opacity-80">Terminal locked for {cooldown} seconds. Shuffling question data.</span>
                  ) : (
                    <span className="text-white opacity-80 animate-pulse">Terminal Unlocked. Try new protocol.</span>
                  )}
                </div>
              )}
              
              {quizFeedback === 'correct' && (
                <div className="text-green-500 text-xs md:text-sm font-black uppercase tracking-widest animate-pulse mb-6 bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                  ✅ Knowledge Verified. Protocol advancing...
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => { setShowQuiz(false); setQuizFeedback(null); setCooldown(0); }} className="flex-1 py-4 text-[10px] font-black uppercase opacity-50 hover:opacity-100 hover:bg-white/5 rounded-xl transition-all">Back to Reading</button>
                <button 
                  onClick={handleQuizSubmit}
                  disabled={selectedAnswer === null || quizFeedback === 'correct' || cooldown > 0}
                  className={`flex-[2] py-4 text-white font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl transition-all shadow-lg border ${
                     selectedAnswer !== null && quizFeedback !== 'correct' && cooldown === 0
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:brightness-110 active:scale-95 border-blue-400/30 shadow-[0_10px_20px_rgba(37,99,235,0.3)]' 
                        : 'bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {cooldown > 0 ? `Locked (${cooldown}s)` : 'Submit Protocol'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
