
import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { 
  TABLE_WIDTH, 
  TABLE_HEIGHT, 
  BALL_RADIUS, 
  CUSHION_WIDTH,
  BALL_COLORS,
  FRICTION_AIR,
  FRICTION,
  RESTITUTION,
  FORCE_MULTIPLIER,
  MAX_POWER,
  POCKET_RADIUS,
  FELT_COLOR,
  RAIL_COLOR
} from '../constants';
import { GameState, Player, GameScore, Particle } from '../types';
import ScoreBoard from './ScoreBoard';
import { ChevronDown, ChevronsDown, Lock, LockOpen, Target } from 'lucide-react';

const PoolTable: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<number | null>(null);
  
  // Game State Refs
  const gameStateRef = useRef<GameState>(GameState.IDLE);
  const ballsRef = useRef<Matter.Body[]>([]);
  const cueBallRef = useRef<Matter.Body | null>(null);
  
  // Logic Refs
  const ballsPottedThisTurnRef = useRef<number>(0);
  const isScratchRef = useRef<boolean>(false);

  // Interaction Refs
  const aimAngleRef = useRef<number>(0); // Angle in radians
  const aimLockedRef = useRef<boolean>(false); // Whether aim is currently locked
  const powerRef = useRef<number>(0); // 0 to 100
  const isPowerDraggingRef = useRef<boolean>(false);
  const mousePosRef = useRef<{x: number, y: number}>({x: 0, y: 0}); // Relative to table center or absolute? Used for rendering target.

  // Visual Effects Refs
  const particlesRef = useRef<Particle[]>([]);

  // React State for UI
  const [score, setScore] = useState<GameScore>({
    player1Balls: [],
    player2Balls: [],
    currentTurn: Player.ONE,
    message: 'Aim with Mouse, Click to LOCK'
  });
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [powerUI, setPowerUI] = useState(0); 
  const [isAimLocked, setIsAimLocked] = useState(false);

  // Sync ref with state
  useEffect(() => {
    setGameState(gameStateRef.current);
  }, [gameStateRef.current]);

  const updateMessage = (msg: string) => {
    setScore(prev => ({ ...prev, message: msg }));
  };

  // --- Initialization ---
  useEffect(() => {
    if (!canvasRef.current) return;

    const Engine = Matter.Engine;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Events = Matter.Events;

    // Create Engine
    const engine = Engine.create();
    engine.gravity.y = 0;
    engineRef.current = engine;

    // Table bounds logic
    const w = TABLE_WIDTH;
    const h = TABLE_HEIGHT;
    const t = CUSHION_WIDTH;

    const wallOptions = { 
      isStatic: true, 
      restitution: 1.0, 
      render: { visible: false },
      label: 'Wall'
    };

    const walls = [
      Bodies.rectangle(w/2, -t/2, w + t*2, t, wallOptions),
      Bodies.rectangle(w/2, h + t/2, w + t*2, t, wallOptions),
      Bodies.rectangle(-t/2, h/2, t, h + t*2, wallOptions),
      Bodies.rectangle(w + t/2, h/2, t, h + t*2, wallOptions)
    ];

    World.add(engine.world, walls);
    resetBalls(engine);

    // Collision Events
    Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
            const labelA = pair.bodyA.label;
            const labelB = pair.bodyB.label;
            
            // Check for Ball-Ball collisions
            if (labelA.startsWith('Ball') && labelB.startsWith('Ball')) {
                // Determine collision point
                let x = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
                let y = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;

                // Use support point if available for more precision
                if (pair.collision.supports.length > 0) {
                    x = pair.collision.supports[0].x;
                    y = pair.collision.supports[0].y;
                }
                
                // Impact speed check to avoid sparks on resting contact
                const speedA = Matter.Vector.magnitude(pair.bodyA.velocity);
                const speedB = Matter.Vector.magnitude(pair.bodyB.velocity);
                if (speedA + speedB > 0.5) {
                     spawnSparks(x, y, 8); // Spawn 8 sparks
                }
            }
        });
    });

    // --- Game Loop ---
    let animationFrameId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas || !engineRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      Matter.Engine.update(engineRef.current, 1000 / 60);
      
      // Update Particles
      updateParticles();
      
      checkGameLogic(engineRef.current);
      drawScene(ctx, engineRef.current);

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    runnerRef.current = animationFrameId;

    return () => {
      cancelAnimationFrame(animationFrameId);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Particle System ---
  const spawnSparks = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 1; // 1 to 4 px/frame
          particlesRef.current.push({
              id: Math.random(),
              x, 
              y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              color: Math.random() > 0.5 ? '#facc15' : '#ffffff' // Yellow or White
          });
      }
  };

  const updateParticles = () => {
      particlesRef.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.05; // Fade out speed
      });
      // Remove dead particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  };

  // --- Ball Setup ---
  const resetBalls = (engine: Matter.Engine) => {
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Composite = Matter.Composite;

    const existingBalls = Composite.allBodies(engine.world).filter(b => b.label.startsWith('Ball'));
    Composite.remove(engine.world, existingBalls);

    ballsRef.current = [];
    
    const ballOptions = {
      restitution: RESTITUTION,
      friction: FRICTION,
      frictionAir: FRICTION_AIR,
      density: 0.05,
      label: 'Ball'
    };

    const cx = TABLE_WIDTH / 4;
    const cy = TABLE_HEIGHT / 2;

    const cueBall = Bodies.circle(cx, cy, BALL_RADIUS, { ...ballOptions, label: 'Ball_Cue' });
    cueBallRef.current = cueBall;
    ballsRef.current.push(cueBall);

    // Rack Setup
    const rackX = TABLE_WIDTH * 0.75;
    const rackY = TABLE_HEIGHT / 2;
    const r = BALL_RADIUS;
    const rows = 5;
    let count = 1;
    const rackBalls: Matter.Body[] = [];

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j <= i; j++) {
        const x = rackX + i * (r * 2 * 0.866);
        const y = rackY - (i * r) + (j * r * 2);
        
        let currentId = 0;
        if (i === 2 && j === 1) {
          currentId = 8;
        } else {
           if (count === 8) count++; 
           currentId = count;
           count++;
        }

        const ball = Bodies.circle(x, y, BALL_RADIUS, { 
            ...ballOptions, 
            label: `Ball_${currentId}` 
        });
        rackBalls.push(ball);
        ballsRef.current.push(ball);
      }
    }

    World.add(engine.world, [cueBall, ...rackBalls]);
    gameStateRef.current = GameState.IDLE;
    setGameState(GameState.IDLE);
    aimLockedRef.current = false;
    setIsAimLocked(false);
  };

  const handleReset = () => {
    if (engineRef.current) resetBalls(engineRef.current);
    setScore({
      player1Balls: [],
      player2Balls: [],
      currentTurn: Player.ONE,
      message: 'New Game Started'
    });
    ballsPottedThisTurnRef.current = 0;
    isScratchRef.current = false;
    particlesRef.current = [];
  };

  // --- Game Logic ---
  const checkGameLogic = (engine: Matter.Engine) => {
    let isMoving = false;
    ballsRef.current.forEach(ball => {
      if (ball.speed > 0.05) isMoving = true; 
    });

    // TRANSITION: MOVING -> IDLE
    if (gameStateRef.current === GameState.MOVING && !isMoving) {
      gameStateRef.current = GameState.IDLE;
      setGameState(GameState.IDLE);
      aimLockedRef.current = false;
      setIsAimLocked(false);
      
      // Turn Logic
      let nextMessage = "";
      let shouldSwitchTurn = false;

      // Handle Scratch
      if (isScratchRef.current) {
         nextMessage = "Scratch! Ball in hand.";
         shouldSwitchTurn = true;
         
         // Respawn Cue Ball
         const cueBall = Matter.Bodies.circle(TABLE_WIDTH / 4, TABLE_HEIGHT / 2, BALL_RADIUS, {
            restitution: RESTITUTION,
            friction: FRICTION,
            frictionAir: FRICTION_AIR,
            density: 0.05,
            label: 'Ball_Cue'
         });
         Matter.Body.setVelocity(cueBall, { x: 0, y: 0 });
         Matter.World.add(engine.world, cueBall);
         ballsRef.current.push(cueBall);
         cueBallRef.current = cueBall;
         isScratchRef.current = false;
      } 
      else if (ballsPottedThisTurnRef.current > 0) {
          // Player potted a ball, keep turn
          nextMessage = "Ball potted! Go again.";
          shouldSwitchTurn = false;
      } else {
          // Nothing happened
          nextMessage = "No ball potted.";
          shouldSwitchTurn = true;
      }

      if (shouldSwitchTurn) {
          toggleTurn(nextMessage);
      } else {
          updateMessage(`${score.currentTurn}: ${nextMessage}`);
      }
      
      // Reset turn stats
      ballsPottedThisTurnRef.current = 0;

    } else if (gameStateRef.current !== GameState.MOVING && isMoving) {
      // TRANSITION: IDLE -> MOVING
      gameStateRef.current = GameState.MOVING;
      setGameState(GameState.MOVING);
      updateMessage("...");
      // Reset turn trackers at start of shot
      ballsPottedThisTurnRef.current = 0;
      isScratchRef.current = false;
    }

    // Check Pockets
    const pockets = [
      { x: 0, y: 0 },
      { x: TABLE_WIDTH / 2, y: -5 },
      { x: TABLE_WIDTH, y: 0 },
      { x: 0, y: TABLE_HEIGHT },
      { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 5 },
      { x: TABLE_WIDTH, y: TABLE_HEIGHT }
    ];

    const ballsToRemove: Matter.Body[] = [];
    ballsRef.current.forEach(ball => {
      for (const pocket of pockets) {
        const dx = ball.position.x - pocket.x;
        const dy = ball.position.y - pocket.y;
        if (dx*dx + dy*dy < POCKET_RADIUS * POCKET_RADIUS) {
          ballsToRemove.push(ball);
        }
      }
    });

    if (ballsToRemove.length > 0) {
      ballsToRemove.forEach(ball => {
        Matter.World.remove(engine.world, ball);
        ballsRef.current = ballsRef.current.filter(b => b !== ball);
        
        const label = ball.label;
        if (label === 'Ball_Cue') {
            isScratchRef.current = true;
        } else if (label === 'Ball_8') {
            updateMessage(`${score.currentTurn} Wins!`); // Simplified winning logic
            gameStateRef.current = GameState.GAME_OVER;
            setGameState(GameState.GAME_OVER);
        } else {
            // Normal Ball Potted
            const ballId = parseInt(label.split('_')[1]);
            ballsPottedThisTurnRef.current += 1;
            
            setScore(prev => {
                const isP1 = prev.currentTurn === Player.ONE;
                return {
                    ...prev,
                    player1Balls: isP1 ? [...prev.player1Balls, ballId] : prev.player1Balls,
                    player2Balls: !isP1 ? [...prev.player2Balls, ballId] : prev.player2Balls,
                };
            });
        }
      });
    }
  };

  const toggleTurn = (reason: string = "") => {
    setScore(prev => {
        const nextPlayer = prev.currentTurn === Player.ONE ? Player.TWO : Player.ONE;
        return {
            ...prev,
            currentTurn: nextPlayer,
            message: `${reason} ${nextPlayer}'s Turn`
        };
    });
  };

  // --- Interactions ---

  // Aiming (Table Area)
  const handleTableMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameStateRef.current === GameState.MOVING || gameStateRef.current === GameState.GAME_OVER) return;
    
    // Get mouse pos relative to canvas
    if (!canvasRef.current || !cueBallRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;

    // Always update mouse pos for rendering target if needed
    mousePosRef.current = { x: mouseX, y: mouseY };

    if (aimLockedRef.current) return; // DON'T update angle if locked

    // Calculate Angle: Mouse points TO the target.
    // So Aim Vector = Mouse - Ball
    const dx = mouseX - cueBallRef.current.position.x;
    const dy = mouseY - cueBallRef.current.position.y;
    aimAngleRef.current = Math.atan2(dy, dx);
  };

  const handleTableClick = (e: React.MouseEvent | React.TouchEvent) => {
      if (gameStateRef.current !== GameState.IDLE) return;
      
      // Toggle Lock
      const newLockState = !aimLockedRef.current;
      aimLockedRef.current = newLockState;
      setIsAimLocked(newLockState);
      
      if (newLockState) {
          updateMessage("Aim LOCKED. Use side bar to shoot!");
      } else {
          updateMessage("Aim Unlocked.");
          // Update aim immediately to current mouse pos
          handleTableMouseMove(e);
      }
  };

  // Power Control (Sidebar Area)
  const handlePowerStart = (e: React.MouseEvent | React.TouchEvent) => {
     if (gameStateRef.current !== GameState.IDLE) return;
     isPowerDraggingRef.current = true;
     handlePowerMove(e);
  };

  const handlePowerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPowerDraggingRef.current) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    let clientY;
    if ('touches' in e) {
        clientY = e.touches[0].clientY;
    } else {
        clientY = (e as React.MouseEvent).clientY;
    }

    // 0 at top, 100 at bottom
    let val = (clientY - rect.top) / rect.height; 
    val = Math.max(0, Math.min(1, val));
    
    powerRef.current = val * 100;
    setPowerUI(Math.round(val * 100));
  };

  const handlePowerEnd = () => {
    if (!isPowerDraggingRef.current) return;
    isPowerDraggingRef.current = false;
    
    // SHOOT
    if (powerRef.current > 5 && cueBallRef.current) { // Min threshold
        const forceMagnitude = (powerRef.current / 100) * FORCE_MULTIPLIER;
        
        // Aim angle is where we want to go.
        // Force vector is cos(angle), sin(angle)
        // Note: applyForce adds impulse.
        Matter.Body.applyForce(cueBallRef.current, cueBallRef.current.position, {
            x: Math.cos(aimAngleRef.current) * forceMagnitude,
            y: Math.sin(aimAngleRef.current) * forceMagnitude
        });

        gameStateRef.current = GameState.MOVING;
        setGameState(GameState.MOVING);
        aimLockedRef.current = false;
        setIsAimLocked(false);
    }
    
    // Reset power
    powerRef.current = 0;
    setPowerUI(0);
  };

  // --- Rendering ---
  const drawScene = (ctx: CanvasRenderingContext2D, engine: Matter.Engine) => {
    // 1. Clear & Rails
    ctx.fillStyle = RAIL_COLOR;
    ctx.fillRect(0, 0, TABLE_WIDTH + CUSHION_WIDTH*2, TABLE_HEIGHT + CUSHION_WIDTH*2);
    
    ctx.save();
    ctx.translate(CUSHION_WIDTH, CUSHION_WIDTH);
    
    // Felt
    ctx.fillStyle = FELT_COLOR;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    
    // Pockets
    ctx.fillStyle = '#000';
    const pockets = [
      { x: 0, y: 0 }, { x: TABLE_WIDTH / 2, y: -5 }, { x: TABLE_WIDTH, y: 0 },
      { x: 0, y: TABLE_HEIGHT }, { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 5 }, { x: TABLE_WIDTH, y: TABLE_HEIGHT }
    ];
    pockets.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Aim Line & Target (Only when IDLE, Draw BEHIND balls)
    if (gameStateRef.current === GameState.IDLE && cueBallRef.current) {
        const cx = cueBallRef.current.position.x;
        const cy = cueBallRef.current.position.y;
        const angle = aimAngleRef.current;
        const locked = aimLockedRef.current;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // -- Guide Line --
        ctx.beginPath();
        ctx.moveTo(BALL_RADIUS + 5, 0);
        ctx.lineTo(900, 0); 
        ctx.strokeStyle = locked ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.4)'; // Red if locked
        ctx.setLineDash(locked ? [] : [5, 5]); // Solid if locked
        ctx.lineWidth = locked ? 3 : 2;
        ctx.stroke();

        ctx.restore();

        // -- Visual Target Point (The "Fixed Point" User Requested) --
        let targetDist = 200; // default
        if (!locked) {
            const dx = mousePosRef.current.x - cx;
            const dy = mousePosRef.current.y - cy;
            targetDist = Math.sqrt(dx*dx + dy*dy);
        }

        if (!locked) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.translate(targetDist, 0);
            
            // Target Marker (The "Fixed Point")
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI*2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.restore();
        }
    }

    // 3. Balls
    const allBodies = Matter.Composite.allBodies(engine.world);
    allBodies.forEach(body => {
      if (body.label.startsWith('Ball')) {
        const id = parseInt(body.label.split('_')[1]) || 0;
        const isCue = body.label === 'Ball_Cue';
        
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        
        const color = isCue ? '#fff' : (BALL_COLORS as any)[id <= 8 ? id : id - 8];
        
        // Main Circle
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Lighting
        const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, BALL_RADIUS);
        grad.addColorStop(0, 'rgba(255,255,255,0.3)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Stripe
        if (id > 8) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.rect(-BALL_RADIUS, -BALL_RADIUS/2, BALL_RADIUS*2, BALL_RADIUS);
          ctx.fill();
        }

        // Number
        if (!isCue) {
           const isStripe = id > 8;
           // REMOVED WHITE CIRCLE
           
           // Text
           ctx.fillStyle = isStripe ? '#000' : '#fff'; // Black text on Stripe, White on Solid
           ctx.font = 'bold 9px Arial';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           
           // Shadow for solid balls to pop against color
           if (!isStripe) {
             ctx.shadowColor = 'rgba(0,0,0,0.5)';
             ctx.shadowBlur = 2;
           } else {
             ctx.shadowBlur = 0;
           }

           ctx.fillText(id.toString(), 0, 0);
           
           // Reset Shadow
           ctx.shadowBlur = 0;
        }
        ctx.restore();
      }
    });
    
    // 4. Particles (Spark Effect) - Render on top of balls
    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); // 3px radius
        ctx.fill();
        
        // Glow
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.globalAlpha = 1.0;
    });

    // 5. Cue Stick (Rendered LAST so it's on top)
    if (gameStateRef.current === GameState.IDLE && cueBallRef.current) {
        const cx = cueBallRef.current.position.x;
        const cy = cueBallRef.current.position.y;
        const angle = aimAngleRef.current;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Power animation
        const pullBackDist = BALL_RADIUS + 10 + (powerRef.current * 2); 
        
        ctx.beginPath();
        // Tip
        ctx.fillStyle = '#facc15'; 
        ctx.fillRect(-pullBackDist - 5, -3, 5, 6);
        
        // Shaft
        const stickGrad = ctx.createLinearGradient(-pullBackDist - 300, 0, -pullBackDist, 0);
        stickGrad.addColorStop(0, '#3f1f11');
        stickGrad.addColorStop(1, '#d97706');
        
        ctx.fillStyle = stickGrad;
        ctx.fillRect(-pullBackDist - 305, -5, 300, 10);
        
        ctx.restore();
    }

    ctx.restore();
  };

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        // Adjust scale to fit but leave room for sidebar
        const { width } = containerRef.current.getBoundingClientRect();
        const targetWidth = TABLE_WIDTH + CUSHION_WIDTH * 2;
        setScale(Math.min(width / targetWidth, 1));
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const powerPercentage = Math.min(powerUI, 100);
  const powerColor = `hsl(${120 - (powerPercentage * 1.2)}, 100%, 50%)`;

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-slate-950 p-2 md:p-6 gap-4 select-none overflow-hidden">
      
      {/* LEFT: Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <ScoreBoard score={score} gameState={gameState} onReset={handleReset} />
        
        <div 
          ref={containerRef}
          className="relative shadow-2xl rounded-lg border-8 border-slate-800 bg-slate-800 overflow-hidden"
          style={{
             width: (TABLE_WIDTH + CUSHION_WIDTH * 2) * scale,
             height: (TABLE_HEIGHT + CUSHION_WIDTH * 2) * scale,
          }}
        >
            <canvas
              ref={canvasRef}
              width={TABLE_WIDTH + CUSHION_WIDTH * 2}
              height={TABLE_HEIGHT + CUSHION_WIDTH * 2}
              className={`block touch-none ${isAimLocked ? 'cursor-default' : 'cursor-crosshair'}`}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
              onMouseMove={handleTableMouseMove}
              onTouchMove={handleTableMouseMove}
              onClick={handleTableClick} // Click to lock aim
            />
            
            {gameState === GameState.IDLE && (
                <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg ${isAimLocked ? 'bg-red-500 text-white' : 'bg-slate-700/80 text-slate-300'}`}>
                        {isAimLocked ? <Lock size={12}/> : <LockOpen size={12}/>}
                        {isAimLocked ? 'Aim Locked' : 'Aim Unlocked'}
                    </div>
                </div>
            )}
        </div>
        
        <div className="mt-4 text-slate-400 text-sm flex items-center gap-4">
           <div className="flex items-center gap-2">
              <span className="p-1 bg-slate-800 rounded border border-slate-600"><Target size={14}/></span>
              <span>Move to Aim</span>
           </div>
           <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
           <div className="flex items-center gap-2">
              <span className="p-1 bg-slate-800 rounded border border-slate-600"><Lock size={14}/></span>
              <span><b>Click Table</b> to Lock Angle</span>
           </div>
           <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
           <div className="flex items-center gap-2">
              <span className="p-1 bg-slate-800 rounded border border-slate-600"><ChevronsDown size={14}/></span>
              <span>Pull Bar to Shoot</span>
           </div>
        </div>
      </div>

      {/* RIGHT: Power Slider Control */}
      <div className="w-24 md:w-32 flex flex-col items-center justify-center shrink-0 h-[60vh] md:h-auto z-20">
         <div className={`relative w-full h-full max-h-[500px] rounded-2xl border-4 overflow-hidden shadow-inner flex flex-col items-center group touch-none transition-colors ${isAimLocked ? 'border-red-500/50 bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}>
            
            {/* Background Track */}
            <div className="absolute top-0 bottom-0 w-2 bg-slate-900/50 rounded-full my-4"></div>
            
            {/* Interaction Layer */}
            <div 
                className="absolute inset-0 cursor-ns-resize z-10"
                onMouseDown={handlePowerStart}
                onMouseMove={handlePowerMove}
                onMouseUp={handlePowerEnd}
                onMouseLeave={handlePowerEnd}
                onTouchStart={handlePowerStart}
                onTouchMove={handlePowerMove}
                onTouchEnd={handlePowerEnd}
            ></div>

            {/* Instruction Text */}
            <div className={`absolute top-4 text-xs font-bold uppercase tracking-widest text-center pointer-events-none ${isAimLocked ? 'text-white animate-pulse' : 'text-slate-600'}`}>
                {isAimLocked ? 'PULL\nDOWN' : 'Lock Aim\nFirst'}
            </div>
            
            {/* Dynamic Fill */}
            <div 
                className="absolute top-0 left-0 right-0 bg-gradient-to-b from-transparent to-red-500/20 transition-all duration-75 pointer-events-none"
                style={{ height: `${powerPercentage}%` }}
            ></div>

            {/* The Handle / Puck */}
            <div 
                className="absolute w-16 h-16 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border-4 border-slate-200 flex items-center justify-center transform -translate-y-1/2 transition-transform duration-75 pointer-events-none"
                style={{ 
                    top: `${powerPercentage}%`,
                    backgroundColor: powerColor,
                    boxShadow: `0 0 ${powerPercentage/2}px ${powerColor}`
                }}
            >
                {powerPercentage > 0 ? (
                    <span className="font-bold text-white text-lg">{powerPercentage}%</span>
                ) : (
                    <div className={`${isAimLocked ? 'animate-bounce' : ''} mt-1`}>
                        <ChevronsDown size={24} className={isAimLocked ? "text-white" : "text-slate-600"} />
                    </div>
                )}
            </div>

            {/* Spring visualization */}
            <div 
                className="absolute top-0 w-1 bg-white/50 pointer-events-none origin-top"
                style={{ height: `${powerPercentage}%` }}
            ></div>
         </div>
         <div className={`mt-2 font-bold text-sm ${isAimLocked ? 'text-red-400' : 'text-slate-600'}`}>POWER</div>
      </div>

    </div>
  );
};

export default PoolTable;
