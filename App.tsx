
import React, { useState, useEffect } from 'react';
import { Question, Difficulty, User, RankingEntry, AppView } from './types';
import { INITIAL_QUESTIONS, PRIZE_LEVELS, RANKS } from './constants';
import { getSergeantHint, getMissionFeedback, getCaboVelhoOpinions } from './services/geminiService';
import { supabase } from './services/supabase'; // Importando a conexão global

// ... (mesmas funções auxiliares getRankStyle e getRankIcon) ...
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

const Header: React.FC<{ user?: User; onViewChange: (view: AppView) => void }> = ({ user, onViewChange }) => (
  <header className="bg-slate-900 border-b-4 border-emerald-800 p-4 flex justify-between items-center sticky top-0 z-50 shadow-2xl">
    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onViewChange('menu')}>
      <div className="bg-emerald-600 p-2 rounded-lg border-2 border-white"><span className="text-white font-bold text-xl">⚓</span></div>
      <h1 className="font-military text-2xl text-emerald-400">SHOW DO CABÃO</h1>
    </div>
    {user && (
      <div className="flex items-center space-x-3">
        <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Combatente</span>
            <span className="text-white font-bold text-sm leading-tight">{user.nickname}</span>
        </div>
        <div className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase flex items-center ${getRankStyle(user.rank)}`}>
           <span className="mr-1">{getRankIcon(user.rank)}</span>{user.rank}
        </div>
        <button onClick={() => onViewChange('ranking')} className="bg-slate-800 p-2 rounded-full border border-slate-600 ml-1">🏆</button>
      </div>
    )}
  </header>
);

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

  // CARREGAR DADOS DO SUPABASE AO INICIAR
  useEffect(() => {
    fetchGlobalRanking();
    
    // O usuário logado ainda pode ser guardado no localStorage para ele não ter que logar toda hora
    const savedUser = localStorage.getItem('cabao_user');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
        setView('menu');
    }
  }, []);

  const fetchGlobalRanking = async () => {
    const { data, error } = await supabase
      .from('ranking')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (data) setRanking(data);
  };

  const handleLogin = async (nickname: string) => {
    if (!nickname.trim()) return;
    const upperNick = nickname.trim().toUpperCase();
    
    // Busca se o fuzileiro já tem registro no banco
    const { data } = await supabase
      .from('ranking')
      .select('*')
      .eq('nickname', upperNick)
      .single();

    const newUser: User = {
      nickname: upperNick,
      score: data?.score || 0,
      rank: data?.rank || 'Ferro',
      lastPlayed: Date.now(),
      isAdmin: upperNick === 'ADMIN'
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
    setView('game');
  };

  const handleAnswer = (optionIndex: number) => {
    const q = gameQuestions[currentQuestionIndex];
    if (optionIndex === q.correctAnswer) {
      if (currentQuestionIndex + 1 >= gameQuestions.length) {
        endGame(PRIZE_LEVELS[currentQuestionIndex], true);
      } else {
        setScore(PRIZE_LEVELS[currentQuestionIndex]);
        setCurrentQuestionIndex(i => i + 1);
        setHint(null); setCaboVelhoHint(null);
      }
    } else {
      endGame(score, false);
    }
  };

  const endGame = async (finalScore: number, won: boolean) => {
    setScore(finalScore);
    if (user) {
      let nextRank = user.rank;
      if (won) {
        const idx = RANKS.indexOf(user.rank);
        if (idx < RANKS.length - 1) nextRank = RANKS[idx + 1];
      }

      // AQUI ESTÁ O "UPSERT" DO SUPABASE (Substitui o localStorage central)
      const { error } = await supabase
        .from('ranking')
        .upsert({ 
          nickname: user.nickname, 
          score: Math.max(user.score, finalScore), 
          rank: nextRank 
        }, { onConflict: 'nickname' });

      if (!error) {
        setUser({ ...user, score: Math.max(user.score, finalScore), rank: nextRank });
        fetchGlobalRanking(); // Atualiza a lista na tela
      }
    }
    const msg = await getMissionFeedback(finalScore, won);
    setFeedback(msg);
    setView('gameOver');
  };

  // ... (LoginView, MenuView, GameView, RankingView, GameOverView) ...
  // Nota: Estas views permanecem idênticas, apenas o método de salvar mudou para a nuvem.

  const LoginView = () => {
    const [name, setName] = useState('');
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-emerald-600 flex items-center justify-center rounded-3xl border-4 border-white shadow-xl mx-auto mb-6"><span className="text-5xl">⚓</span></div>
          <h2 className="text-4xl font-military text-white drop-shadow-lg">IDENTIFIQUE-SE, RECRUTA!</h2>
          <p className="text-slate-400 uppercase text-xs tracking-widest font-bold">Show do Cabão - AD SUMUS</p>
        </div>
        <div className="w-full max-w-sm space-y-4">
          <input type="text" placeholder="NOME DE GUERRA" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className="w-full bg-slate-800 border-2 border-slate-700 p-4 rounded-xl text-white font-bold text-center focus:border-emerald-500 outline-none uppercase" />
          <button onClick={() => handleLogin(name)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-military text-2xl py-4 rounded-xl border-b-4 border-emerald-800 transition-all active:scale-95">ENTRAR NO QUARTEL</button>
        </div>
      </div>
    );
  };

  const MenuView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 animate-in slide-in-from-bottom-10">
      <div className="text-center"><h2 className="text-5xl font-military text-white">CENTRO DE OPERAÇÕES</h2><p className="text-emerald-400 font-bold tracking-widest text-sm uppercase">Pronto para a missão?</p></div>
      <div className="grid grid-cols-1 gap-4 w-full max-w-md">
        <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white p-6 rounded-2xl flex items-center justify-between border-b-4 border-emerald-800 shadow-xl group">
          <div className="text-left"><span className="block font-military text-3xl">INICIAR MISSÃO</span><span className="text-emerald-200 text-xs uppercase">Responda todas para subir de patente</span></div>
          <span className="text-4xl group-hover:translate-x-2 transition-transform">🎯</span>
        </button>
        <button onClick={() => setView('ranking')} className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl flex items-center justify-between border-b-4 border-slate-900 transition-all">
          <div className="text-left"><span className="block font-bold">QUADRO DE HONRA</span><span className="text-slate-400 text-xs uppercase">Elite dos Fuzileiros (Global)</span></div>
          <span className="text-2xl">🏆</span>
        </button>
      </div>
      <button onClick={() => { localStorage.removeItem('cabao_user'); setUser(null); setView('login'); }} className="text-slate-500 hover:text-red-400 text-xs font-bold mt-8 uppercase tracking-widest">Dar Baixa (Sair)</button>
    </div>
  );

  const RankingView = () => (
    <div className="flex-1 flex flex-col p-6 space-y-6 animate-in slide-in-from-right-10 duration-500">
      <div className="flex items-center space-x-4">
         <button onClick={() => setView('menu')} className="text-emerald-500 font-bold uppercase">← VOLTAR</button>
         <h2 className="text-3xl font-military text-white">QUADRO DE HONRA GLOBAL</h2>
      </div>
      <div className="bg-slate-800/50 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/50 text-slate-500 text-[10px] uppercase font-bold">
              <th className="p-4">#</th><th className="p-4">Combatente</th><th className="p-4">Patente</th><th className="p-4 text-right">Mérito</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {ranking.map((entry, i) => (
              <tr key={i} className={i < 3 ? 'bg-emerald-900/10' : ''}>
                <td className="p-4 font-military text-xl text-slate-500">{i+1}º</td>
                <td className="p-4 font-bold text-white uppercase">{entry.nickname}</td>
                <td className="p-4"><span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase flex items-center w-fit ${getRankStyle(entry.rank)}`}><span className="mr-1">{getRankIcon(entry.rank)}</span>{entry.rank}</span></td>
                <td className="p-4 text-right font-military text-emerald-400">{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const GameView = () => {
    const q = gameQuestions[currentQuestionIndex];
    if (!q) return null;
    return (
      <div className="flex-1 flex flex-col p-4 space-y-4 animate-in fade-in duration-300">
        <div className="flex justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Mérito Almejado</span>
            <span className="text-xl font-military text-amber-400">{PRIZE_LEVELS[currentQuestionIndex]} PONTOS</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Pergunta</span>
            <span className="block text-emerald-400 font-bold">{currentQuestionIndex + 1}/16</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center space-y-6 max-w-2xl mx-auto w-full">
          <div className="bg-slate-800 border-2 border-slate-600 p-8 rounded-3xl shadow-xl text-center">
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">{q.text}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(i)} className="flex items-center bg-slate-900 hover:bg-emerald-900/40 border-2 border-slate-700 hover:border-emerald-500 p-4 rounded-xl text-left transition-all active:scale-95 group">
                <div className="w-10 h-10 flex items-center justify-center bg-slate-800 group-hover:bg-emerald-600 rounded-lg text-slate-400 group-hover:text-white font-bold mr-4">{String.fromCharCode(65 + i)}</div>
                <span className="text-slate-200">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const GameOverView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in zoom-in text-center">
      <h2 className={`text-6xl font-military ${score >= 1600 ? 'text-emerald-400' : 'text-amber-500'}`}>{score >= 1600 ? 'PROMOVIDO!' : 'MISSÃO ENCERRADA'}</h2>
      <div className={`px-8 py-4 rounded-full border-2 font-black uppercase text-2xl flex items-center shadow-lg ${getRankStyle(user?.rank || 'Ferro')}`}>
        <span className="mr-3 text-3xl">{getRankIcon(user?.rank || 'Ferro')}</span>{user?.rank}
      </div>
      <p className="text-4xl font-military text-white tracking-widest">MÉRITO: {score} PONTOS</p>
      <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 max-w-md">
         <p className="text-white text-sm">{feedback || "Missão Cumprida. AD SUMUS!"}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
        <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white font-military text-2xl py-4 rounded-xl border-b-4 border-emerald-800">NOVA MISSÃO</button>
        <button onClick={() => setView('menu')} className="bg-slate-700 hover:bg-slate-600 text-white font-military text-2xl py-4 rounded-xl border-b-4 border-slate-900">MENU</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col military-gradient">
      <Header user={user || undefined} onViewChange={setView} />
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-y-auto">
        {view === 'login' && <LoginView />}
        {view === 'menu' && <MenuView />}
        {view === 'game' && <GameView />}
        {view === 'ranking' && <RankingView />}
        {view === 'gameOver' && <GameOverView />}
      </main>
      <footer className="p-6 text-center text-slate-500 text-xs">© 2026 CORPO DE FUZILEIROS NAVAIS - AD SUMUS</footer>
    </div>
  );
}
