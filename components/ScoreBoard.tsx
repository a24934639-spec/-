
import React from 'react';
import { GameScore, GameState, Player } from '../types';
import { Trophy, RefreshCw, User, Disc } from 'lucide-react';
import { BALL_COLORS } from '../constants';

interface ScoreBoardProps {
  score: GameScore;
  gameState: GameState;
  onReset: () => void;
}

const MiniBall: React.FC<{ id: number }> = ({ id }) => {
  const color = (BALL_COLORS as any)[id <= 8 ? id : id - 8];
  const isStripe = id > 8;
  
  return (
    <div 
      className="w-6 h-6 rounded-full border border-slate-900/50 flex items-center justify-center shadow-sm text-[10px] font-bold relative overflow-hidden"
      style={{ 
        backgroundColor: color,
        color: isStripe ? '#000' : '#fff'
      }}
    >
        {/* Stripe */}
        {isStripe && (
            <div className="absolute top-1 bottom-1 left-0 right-0 bg-white -z-0"></div>
        )}
        <span className="relative z-10 drop-shadow-md">
            {id}
        </span>
    </div>
  );
};

const PlayerCard: React.FC<{ 
    player: Player, 
    isTurn: boolean, 
    balls: number[], 
    colorClass: string 
}> = ({ player, isTurn, balls, colorClass }) => (
    <div className={`
        flex flex-col items-center md:flex-row gap-3 p-3 rounded-xl transition-all duration-300 border-2
        ${isTurn 
            ? 'bg-slate-800 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-105 z-10' 
            : 'bg-slate-800/60 border-transparent opacity-80 scale-100'}
    `}>
        <div className={`
            w-12 h-12 rounded-full flex items-center justify-center shadow-lg text-white
            ${colorClass} ${isTurn ? 'animate-bounce-subtle ring-2 ring-white/50' : ''}
        `}>
            <User size={24} />
        </div>
        
        <div className={`flex flex-col ${player === Player.TWO ? 'md:items-end' : 'md:items-start'} items-center min-w-[100px]`}>
            <div className={`text-xs font-bold tracking-wider mb-1 ${isTurn ? 'text-yellow-400' : 'text-slate-400'}`}>
                {player} {isTurn && '(YOUR TURN)'}
            </div>
            
            {/* Potted Balls Container */}
            <div className="flex gap-1 flex-wrap max-w-[140px] h-8 items-center justify-center md:justify-start">
                {balls.length === 0 ? (
                    <span className="text-slate-600 text-xs italic">No balls yet</span>
                ) : (
                    balls.map(id => <MiniBall key={id} id={id} />)
                )}
            </div>
        </div>
    </div>
);

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, gameState, onReset }) => {
  return (
    <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none z-30 px-4">
      <div className="bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl flex items-center justify-between pointer-events-auto">
        
        {/* Player 1 */}
        <PlayerCard 
            player={Player.ONE} 
            isTurn={score.currentTurn === Player.ONE} 
            balls={score.player1Balls}
            colorClass="bg-blue-600"
        />

        {/* Status Center */}
        <div className="flex flex-col items-center px-4 shrink-0">
          <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Status</div>
          <div className={`font-bold text-center text-sm md:text-lg animate-pulse ${gameState === GameState.GAME_OVER ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {score.message}
          </div>
          {gameState === GameState.GAME_OVER && (
             <div className="flex items-center gap-2 text-yellow-400 mt-1 bg-yellow-400/10 px-3 py-1 rounded-full">
                <Trophy size={14} />
                <span className="text-xs font-bold uppercase">Game Over</span>
             </div>
          )}
        </div>

        {/* Player 2 */}
        <div className="flex items-center">
            <PlayerCard 
                player={Player.TWO} 
                isTurn={score.currentTurn === Player.TWO} 
                balls={score.player2Balls}
                colorClass="bg-red-600"
            />
            
            {/* Controls */}
            <button 
                onClick={onReset}
                className="ml-4 p-3 bg-slate-700 hover:bg-slate-600 hover:text-white text-slate-300 rounded-full transition-all hover:rotate-180 active:scale-95 shadow-lg border border-slate-600"
                title="Restart Game"
            >
                <RefreshCw size={20} />
            </button>
        </div>

      </div>
    </div>
  );
};

export default ScoreBoard;
