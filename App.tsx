
import React, { useState, useEffect, useCallback } from 'react';
import { Question, Difficulty, User, RankingEntry, AppView } from './types';
import { INITIAL_QUESTIONS, PRIZE_LEVELS, RANKS } from './constants';
import { getSergeantHint, getMissionFeedback, getCaboVelhoOpinions } from './services/geminiService';

// --- Helper Functions ---

const getRankStyle = (rank: string) => {
  switch (rank) {
    case 'Grão-Mestre': return 'text-purple-400 border-purple-500 bg-purple-900/20';
    case 'Mestre': return 'text-red-400 border-red-500 bg-red-900/20';
    case 'Diamante': return 'text-cyan-300 border-cyan-400 bg-cyan-900/20';
    case 'Esmeralda': return 'text-emerald-400 border-emerald-500 bg-emerald-900/20';
    case 'Platina': return 'text-slate-300 border-slate-400 bg-slate-900/20';
    case 'Ouro': return 'text-amber-400 border-amber-500 bg-amber-900/20';
    case 'Prata': return 'text-gray-400 border-gray-500 bg-gray-900/20';
    case 'Bronze': return 'text-orange-600 border-orange-700 bg-orange-900/20';
    default: return 'text-zinc-500 border-zinc-600 bg-zinc-900/20';
  }
};

const getRankIcon = (rank: string) => {
  switch (rank) {
    case 'Grão-Mestre': return '🌌';
    case 'Mestre': return '🎖️';
    case 'Diamante': return '💎';
    case 'Esmeralda': return '💹';
    case 'Platina': return '🛡️';
    case 'Ouro': return '🥇';
    case 'Prata': return '🥈';
    case 'Bronze': return '🥉';
    default: return '⚙️';
  }
};

// --- Stylized Components ---

const Header: React.FC<{ user?: User; onViewChange: (view: AppView) => void }> = ({ user, onViewChange }) => (
  <header className="bg-slate-900 border-b-4 border-emerald-800 p-4 flex justify-between items-center sticky top-0 z-50 shadow-2xl">
    <div 
      className="flex items-center space-x-2 cursor-pointer" 
      onClick={() => onViewChange('menu')}
    >
      <div className="bg-emerald-600 p-2 rounded-lg border-2 border-white">
        <span className="text-white font-bold text-xl">⚓</span>
      </div>
      <h1 className="font-military text-2xl text-emerald-400">SHOW DO CABÃO</h1>
    </div>
    {user && (
      <div className="flex items-center space-x-3">
        <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase leading-none">Combatente</span>
            <span className="text-white font-bold text-sm leading-tight">{user.nickname}</span>
        </div>
        <div className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter flex items-center shadow-sm ${getRankStyle(user.rank)}`}>
           <span className="mr-1">{getRankIcon(user.rank)}</span>
           {user.rank}
        </div>
        <button 
          onClick={() => onViewChange('ranking')}
          className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full border border-slate-600 transition-colors ml-1"
        >
          🏆
        </button>
        {user.isAdmin && (
          <button 
            onClick={() => onViewChange('admin')}
            className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter"
          >
            ADM
          </button>
        )}
      </div>
    )}
  </header>
);

const Footer: React.FC = () => (
  <footer className="p-6 text-center text-slate-500 text-xs mt-auto">
    <p>© 2026 CORPO DE FUZILEIROS NAVAIS - AD SUMUS</p>
    <p>Simulador de Estudo para Promoção de Cabo</p>
  </footer>
);

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [lifelines, setLifelines] = useState({ skip: 3, sergeant: 2, caboVelho: 1 });
  const [hint, setHint] = useState<string | null>(null);
  const [caboVelhoHint, setCaboVelhoHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  // Load Data
  useEffect(() => {
    const savedQuestions = localStorage.getItem('cabao_questions');
    if (savedQuestions) setQuestions(JSON.parse(savedQuestions));

    const savedRanking = localStorage.getItem('cabao_ranking');
    if (savedRanking) setRanking(JSON.parse(savedRanking));

    const savedUser = localStorage.getItem('cabao_user');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
        setView('menu');
    }
  }, []);

  const saveRanking = (entry: RankingEntry) => {
    // Check if user already exists in ranking
    const existingIndex = ranking.findIndex(r => r.nickname.toUpperCase() === entry.nickname.toUpperCase());
    let newRanking = [...ranking];

    if (existingIndex !== -1) {
      // Update with latest rank and best score
      newRanking[existingIndex].rank = entry.rank;
      if (entry.score > ranking[existingIndex].score) {
        newRanking[existingIndex].score = entry.score;
      }
    } else {
      newRanking.push(entry);
    }

    // Limit to top 10 as per request
    newRanking = newRanking.sort((a, b) => {
        // Sort primarily by rank index, then by score
        const rankIdxA = RANKS.indexOf(a.rank);
        const rankIdxB = RANKS.indexOf(b.rank);
        if (rankIdxB !== rankIdxA) return rankIdxB - rankIdxA;
        return b.score - a.score;
    }).slice(0, 10);

    setRanking(newRanking);
    localStorage.setItem('cabao_ranking', JSON.stringify(newRanking));
  };

  const handleLogin = (nickname: string, password?: string) => {
    if (!nickname.trim()) return;
    
    const upperNick = nickname.trim().toUpperCase();
    const isAdminAttempt = upperNick === 'ADMIN';
    if (isAdminAttempt && password?.toUpperCase() !== 'MARINHA') {
      alert("SENHA INCORRETA PARA ACESSO ADMIN!");
      return;
    }

    // Retrieve previous data if user exists in ranking
    const existingEntry = ranking.find(r => r.nickname.toUpperCase() === upperNick);
    const previousRank = existingEntry?.rank || 'Ferro';
    const previousScore = existingEntry?.score || 0;

    const newUser: User = {
      nickname: upperNick,
      score: previousScore,
      rank: previousRank,
      lastPlayed: Date.now(),
      isAdmin: isAdminAttempt
    };
    setUser(newUser);
    localStorage.setItem('cabao_user', JSON.stringify(newUser));
    setView('menu');
  };

  const startGame = () => {
    const sorted = [...questions].sort(() => Math.random() - 0.5);
    setGameQuestions(sorted.slice(0, 16));
    setCurrentQuestionIndex(0);
    setScore(0);
    setLifelines({ skip: 3, sergeant: 2, caboVelho: 1 });
    setHint(null);
    setCaboVelhoHint(null);
    setView('game');
  };

  const handleAnswer = (optionIndex: number) => {
    const currentQ = gameQuestions[currentQuestionIndex];
    if (optionIndex === currentQ.correctAnswer) {
      const nextIndex = currentQuestionIndex + 1;
      const currentPoints = PRIZE_LEVELS[currentQuestionIndex];
      
      if (nextIndex >= gameQuestions.length || nextIndex >= PRIZE_LEVELS.length) {
        endGame(currentPoints, true);
      } else {
        setScore(currentPoints);
        setCurrentQuestionIndex(nextIndex);
        setHint(null);
        setCaboVelhoHint(null);
      }
    } else {
      endGame(score, false);
    }
  };

  const useSergeantHint = async () => {
    if (lifelines.sergeant <= 0 || isHintLoading) return;
    setIsHintLoading(true);
    const h = await getSergeantHint(gameQuestions[currentQuestionIndex]);
    setHint(h);
    setLifelines(prev => ({ ...prev, sergeant: prev.sergeant - 1 }));
    setIsHintLoading(false);
  };

  const useCaboVelho = async () => {
    if (lifelines.caboVelho <= 0 || isHintLoading) return;
    setIsHintLoading(true);
    const h = await getCaboVelhoOpinions(gameQuestions[currentQuestionIndex]);
    setCaboVelhoHint(h);
    setLifelines(prev => ({ ...prev, caboVelho: 0 }));
    setIsHintLoading(false);
  };

  const endGame = async (finalScore: number, won: boolean) => {
    setScore(finalScore);
    
    if (user) {
      let currentRank = user.rank;
      
      // Advance rank only if all questions were answered correctly (won)
      if (won) {
        const currentRankIndex = RANKS.indexOf(currentRank);
        if (currentRankIndex < RANKS.length - 1) {
            currentRank = RANKS[currentRankIndex + 1];
        }
      }

      const updatedUser = { 
        ...user, 
        score: Math.max(user.score, finalScore), 
        rank: currentRank 
      };
      setUser(updatedUser);
      localStorage.setItem('cabao_user', JSON.stringify(updatedUser));
      
      saveRanking({ nickname: user.nickname, score: finalScore, rank: currentRank });
    }

    const msg = await getMissionFeedback(finalScore, won);
    setFeedback(msg);
    setView('gameOver');
  };

  // --- Views ---

  const LoginView = () => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const isAdmin = name.toUpperCase() === 'ADMIN';

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-emerald-600 flex items-center justify-center rounded-3xl border-4 border-white shadow-xl mx-auto mb-6">
            <span className="text-5xl">⚓</span>
          </div>
          <h2 className="text-4xl font-military text-white drop-shadow-lg uppercase">IDENTIFIQUE-SE, RECRUTA!</h2>
          <p className="text-slate-400 max-w-xs mx-auto uppercase text-sm tracking-widest font-bold">Rumo à promoção de Cabo</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <input 
            type="text" 
            placeholder="NOME DE GUERRA"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            className="w-full bg-slate-800 border-2 border-slate-700 p-4 rounded-xl text-white font-bold text-center focus:outline-none focus:border-emerald-500 transition-all uppercase"
          />
          
          {isAdmin && (
            <input 
              type="password" 
              placeholder="SENHA DE COMANDO"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-amber-900/20 border-2 border-amber-600/50 p-4 rounded-xl text-white font-bold text-center focus:outline-none focus:border-amber-500 transition-all uppercase animate-in slide-in-from-top-2"
            />
          )}

          <button 
            onClick={() => handleLogin(name, password)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-military text-2xl py-4 rounded-xl shadow-lg transform active:scale-95 transition-all border-b-4 border-emerald-800 uppercase"
          >
            ENTRAR NO QUARTEL
          </button>
        </div>
      </div>
    );
  };

  const MenuView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 animate-in slide-in-from-bottom-10 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-5xl font-military text-white uppercase">CENTRO DE OPERAÇÕES</h2>
        <p className="text-emerald-400 font-bold tracking-widest uppercase text-sm">Pronto para a missão?</p>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full max-w-md">
        <button 
          onClick={startGame}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-6 rounded-2xl flex items-center justify-between group transition-all border-b-4 border-emerald-800 shadow-xl"
        >
          <div className="text-left">
            <span className="block font-military text-3xl">INICIAR MISSÃO</span>
            <span className="text-emerald-200 text-sm uppercase">Acumule mérito para subir de patente</span>
          </div>
          <span className="text-4xl group-hover:translate-x-2 transition-transform">🎯</span>
        </button>

        <button 
          onClick={() => setView('ranking')}
          className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl flex items-center justify-between border-b-4 border-slate-900 transition-all"
        >
          <div className="text-left">
            <span className="block font-bold">QUADRO DE HONRA</span>
            <span className="text-slate-400 text-xs uppercase">Elite dos Fuzileiros</span>
          </div>
          <span className="text-2xl">🏆</span>
        </button>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
          <span className="block text-slate-500 text-xs uppercase font-bold tracking-widest">Status de Prontidão</span>
          <span className="text-2xl font-military text-emerald-400 uppercase">OPERACIONAL</span>
        </div>
      </div>
      
      <button 
        onClick={() => {
            localStorage.removeItem('cabao_user');
            setUser(null);
            setView('login');
        }}
        className="text-slate-500 hover:text-red-400 text-xs uppercase font-bold tracking-widest mt-8"
      >
        DAR BAIXA (LOGOUT)
      </button>
    </div>
  );

  const GameView = () => {
    const currentQ = gameQuestions[currentQuestionIndex];
    if (!currentQ) return null;

    return (
      <div className="flex-1 flex flex-col p-4 space-y-4 animate-in fade-in duration-300">
        <div className="flex justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700 backdrop-blur-sm">
           <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Mérito Almejado</span>
              <span className="text-xl font-military text-amber-400">{PRIZE_LEVELS[currentQuestionIndex]} PONTOS</span>
           </div>
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Nível</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800/50 uppercase">{currentQ.difficulty}</span>
           </div>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-6 max-w-2xl mx-auto w-full">
          <div className="relative">
             <div className="absolute -top-4 -left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm z-10 uppercase">Ordem do Dia #{currentQuestionIndex + 1}</div>
             <div className="bg-slate-800 border-2 border-slate-600 p-8 rounded-3xl shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                   <span className="text-8xl">⚓</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold leading-tight text-white text-center relative z-10">
                  {currentQ.text}
                </h3>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => handleAnswer(i)}
                className="group relative flex items-center bg-slate-900 hover:bg-emerald-900/40 border-2 border-slate-700 hover:border-emerald-500 p-4 rounded-xl text-left transition-all active:scale-95 overflow-hidden"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-slate-800 group-hover:bg-emerald-600 rounded-lg text-slate-400 group-hover:text-white font-bold mr-4 shrink-0 transition-colors">
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="text-slate-200 font-medium">{opt}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto w-full">
           {hint && (
             <div className="bg-amber-900/30 border border-amber-500/50 p-4 rounded-xl text-amber-200 text-sm italic animate-in slide-in-from-top-4">
                <span className="font-bold not-italic mr-2 uppercase">🗣️ SARGENTO DIZ:</span>
                "{hint}"
             </div>
           )}

           {caboVelhoHint && (
             <div className="bg-emerald-900/30 border border-emerald-500/50 p-4 rounded-xl text-emerald-200 text-sm italic animate-in slide-in-from-top-4">
                <span className="font-bold not-italic mr-2 uppercase">👴 CABO VELHO DIZ:</span>
                {caboVelhoHint}
             </div>
           )}

           <div className="grid grid-cols-3 gap-3 sticky bottom-4">
             <button 
               onClick={() => {
                  if (lifelines.skip > 0) {
                     setLifelines(prev => ({ ...prev, skip: prev.skip - 1 }));
                     setCurrentQuestionIndex(prev => prev + 1);
                     setHint(null);
                     setCaboVelhoHint(null);
                  }
               }}
               disabled={lifelines.skip <= 0}
               className={`flex flex-col items-center justify-center p-3 rounded-xl border-b-4 transition-all ${lifelines.skip > 0 ? 'bg-slate-800 border-slate-900 hover:bg-slate-700' : 'bg-slate-900 opacity-50 cursor-not-allowed border-slate-950'}`}
             >
                <span className="text-xl">🏃</span>
                <span className="text-[10px] font-bold text-white mt-1 uppercase">RECUAR ({lifelines.skip})</span>
             </button>

             <button 
               onClick={useSergeantHint}
               disabled={lifelines.sergeant <= 0 || isHintLoading}
               className={`flex flex-col items-center justify-center p-3 rounded-xl border-b-4 transition-all ${lifelines.sergeant > 0 && !isHintLoading ? 'bg-amber-600 border-amber-800 hover:bg-amber-500' : 'bg-slate-900 opacity-50 cursor-not-allowed border-slate-950'}`}
             >
                <span className="text-xl">{isHintLoading ? '⏳' : '👨‍✈️'}</span>
                <span className="text-[10px] font-bold text-white mt-1 uppercase tracking-tighter">BUZU DO SG ({lifelines.sergeant})</span>
             </button>

             <button 
                onClick={useCaboVelho}
                disabled={lifelines.caboVelho <= 0 || isHintLoading}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-b-4 transition-all ${lifelines.caboVelho > 0 && !isHintLoading ? 'bg-emerald-700 border-emerald-900 hover:bg-emerald-600' : 'bg-slate-900 opacity-50 cursor-not-allowed border-slate-950'}`}
             >
                <span className="text-xl">👴</span>
                <span className="text-[10px] font-bold text-white mt-1 uppercase">CABO VELHO ({lifelines.caboVelho})</span>
             </button>
           </div>
        </div>
      </div>
    );
  };

  const RankingView = () => (
    <div className="flex-1 flex flex-col p-6 space-y-6 animate-in slide-in-from-right-10 duration-500">
      <div className="flex items-center space-x-4">
         <button onClick={() => setView('menu')} className="text-emerald-500 font-bold uppercase">← VOLTAR</button>
         <h2 className="text-3xl font-military text-white uppercase">QUADRO DE HONRA</h2>
      </div>

      <div className="bg-slate-800/50 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/50 text-slate-500 text-[10px] uppercase font-bold">
              <th className="p-4">Posição</th>
              <th className="p-4">Combatente</th>
              <th className="p-4">Patente</th>
              <th className="p-4 text-right uppercase">Mérito (Pts)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {ranking.length > 0 ? ranking.map((entry, i) => {
              const rankClass = getRankStyle(entry.rank || 'Ferro');
              const rankIcon = getRankIcon(entry.rank || 'Ferro');
              return (
                <tr key={i} className={`${i === 0 ? 'bg-emerald-900/10' : ''}`}>
                  <td className="p-4 font-military text-2xl text-slate-500">
                     {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                  </td>
                  <td className="p-4 font-bold text-white uppercase">{entry.nickname}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter flex items-center w-fit ${rankClass}`}>
                       <span className="mr-1">{rankIcon}</span>
                       {entry.rank || 'Ferro'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-military text-emerald-400">
                    {entry.score.toLocaleString()}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 italic uppercase">Nenhum fuzileiro registrado no quadro ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const AdminView = () => {
    const [newQ, setNewQ] = useState<Partial<Question>>({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      difficulty: Difficulty.RECRUTA,
      category: 'Geral'
    });

    const addQuestion = () => {
      if (!newQ.text || newQ.options?.some(o => !o)) return alert("Preencha tudo!");
      const q: Question = {
        id: Date.now().toString(),
        text: newQ.text!,
        options: newQ.options as string[],
        correctAnswer: newQ.correctAnswer!,
        difficulty: newQ.difficulty as Difficulty,
        category: newQ.category!
      };
      const updated = [...questions, q];
      setQuestions(updated);
      localStorage.setItem('cabao_questions', JSON.stringify(updated));
      alert("Questão adicionada ao arsenal!");
      setNewQ({ text: '', options: ['', '', '', ''], correctAnswer: 0, difficulty: Difficulty.RECRUTA, category: 'Geral' });
    };

    return (
      <div className="flex-1 flex flex-col p-6 space-y-6 max-w-2xl mx-auto w-full animate-in zoom-in duration-300">
        <div className="flex items-center justify-between">
           <h2 className="text-2xl font-military text-amber-500 uppercase">ARSENAL DE QUESTÕES (ADMIN)</h2>
           <button onClick={() => setView('menu')} className="text-slate-400 font-bold text-sm uppercase">SAIR</button>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border-2 border-slate-700 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Pergunta</label>
            <textarea 
              value={newQ.text}
              onChange={e => setNewQ({...newQ, text: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white mt-1 focus:border-emerald-500 outline-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {newQ.options?.map((opt, i) => (
                <div key={i}>
                  <label className="text-xs font-bold text-slate-500 uppercase">Opção {String.fromCharCode(65 + i)}</label>
                  <input 
                    type="text"
                    value={opt}
                    onChange={e => {
                      const opts = [...(newQ.options || [])];
                      opts[i] = e.target.value;
                      setNewQ({...newQ, options: opts});
                    }}
                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white mt-1"
                  />
                </div>
             ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Resposta Correta</label>
               <select 
                value={newQ.correctAnswer}
                onChange={e => setNewQ({...newQ, correctAnswer: parseInt(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white mt-1"
               >
                 <option value={0}>A</option>
                 <option value={1}>B</option>
                 <option value={2}>C</option>
                 <option value={3}>D</option>
               </select>
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Dificuldade</label>
               <select 
                value={newQ.difficulty}
                onChange={e => setNewQ({...newQ, difficulty: e.target.value as Difficulty})}
                className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white mt-1"
               >
                 {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
               <input 
                type="text"
                value={newQ.category}
                onChange={e => setNewQ({...newQ, category: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white mt-1 uppercase"
               />
             </div>
          </div>

          <button 
            onClick={addQuestion}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all uppercase"
          >
            ADICIONAR AO BANCO DE DADOS
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-64 pr-2">
           <h4 className="text-xs font-bold text-slate-500 uppercase">Arsenal Disponível ({questions.length})</h4>
           {questions.map((q, i) => (
             <div key={q.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-sm">
                <span className="truncate mr-4 text-slate-400 uppercase font-medium">{i+1}. {q.text}</span>
                <button 
                  onClick={() => {
                    const updated = questions.filter(item => item.id !== q.id);
                    setQuestions(updated);
                    localStorage.setItem('cabao_questions', JSON.stringify(updated));
                  }}
                  className="text-red-500 hover:text-red-400 font-bold px-2 uppercase"
                >
                  X
                </button>
             </div>
           ))}
        </div>
      </div>
    );
  };

  const GameOverView = () => {
    const finalRank = user?.rank || 'Ferro';
    const rankStyle = getRankStyle(finalRank);
    const rankIcon = getRankIcon(finalRank);

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in zoom-in duration-500 text-center">
        <div className="space-y-4">
          <h2 className={`text-6xl font-military uppercase ${score > 800 ? 'text-emerald-400' : 'text-amber-500'}`}>
             {score >= 1600 ? 'MISSÃO CUMPRIDA!' : 'FIM DA MISSÃO'}
          </h2>
          
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="w-24 h-24 bg-emerald-600 flex items-center justify-center rounded-3xl border-4 border-white shadow-xl mx-auto">
                <span className="text-5xl">⚓</span>
            </div>
            
            <div className={`mt-4 px-6 py-2 rounded-full border-2 font-black uppercase text-xl flex items-center shadow-lg ${rankStyle}`}>
               <span className="mr-3 text-2xl">{rankIcon}</span>
               Patente Atual: {finalRank}
            </div>
          </div>
          
          <p className="text-4xl font-military text-white pt-2 uppercase tracking-widest">Mérito: {score.toLocaleString()} PONTOS</p>
        </div>

        <div className="max-w-md bg-slate-800/50 p-6 rounded-3xl border border-slate-700 backdrop-blur-sm">
           <p className="text-emerald-400 font-bold text-lg italic mb-2 uppercase tracking-tighter">Relatório do Comandante:</p>
           <p className="text-white font-medium uppercase text-sm tracking-tight">{feedback || "Processando relatório de combate..."}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
          <button 
            onClick={startGame}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-military text-2xl py-4 rounded-xl shadow-lg transform active:scale-95 transition-all border-b-4 border-emerald-800 uppercase"
          >
            NOVA TENTATIVA
          </button>
          <button 
            onClick={() => setView('menu')}
            className="bg-slate-700 hover:bg-slate-600 text-white font-military text-2xl py-4 rounded-xl shadow-lg transform active:scale-95 transition-all border-b-4 border-slate-900 uppercase"
          >
            MENU INICIAL
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col military-gradient">
      <Header user={user || undefined} onViewChange={setView} />
      
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {view === 'login' && <LoginView />}
        {view === 'menu' && <MenuView />}
        {view === 'game' && <GameView />}
        {view === 'ranking' && <RankingView />}
        {view === 'admin' && <AdminView />}
        {view === 'gameOver' && <GameOverView />}
      </main>

      <Footer />
    </div>
  );
}
