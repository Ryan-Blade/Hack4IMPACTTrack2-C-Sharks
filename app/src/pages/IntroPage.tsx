import { useNavigate } from 'react-router-dom';
import { ScrollStack, ScrollStackItem } from '@/components/ui/ScrollStack';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { Zap, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
// @ts-expect-error - JSX module without type declarations
import Particles from '@/components/Particles';

export default function IntroPage() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-950 text-white">
      {/* Particles Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Particles
          particleColors={["#ffffff", "#10b981"]}
          particleCount={50}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
        />
      </div>

      {/* Scroll-snap container fills the screen */}
      <div className="relative z-10 w-full h-full">
        <ScrollStack>
          {/* Slide 0 — Title */}
          <ScrollStackItem index={-1}>
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                System Initialization
              </h1>
              <p className="text-xl text-slate-400">
                Scroll down to boot the EcoSync Smart Grid modules.
              </p>
            </div>
          </ScrollStackItem>

          {/* Slide 1 — Module 1 */}
          <ScrollStackItem index={0}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl"><Activity className="w-8 h-8 text-emerald-400" /></div>
              <h2 className="text-3xl font-bold">Module 1: Real-time Analytics</h2>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed">
              Establishing WebSocket conduits to 50 smart buildings. Data streams mapped and stabilized.
              Grid load balancing algorithms online.
            </p>
          </ScrollStackItem>

          {/* Slide 2 — Module 2 */}
          <ScrollStackItem index={1}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl"><ShieldCheck className="w-8 h-8 text-blue-400" /></div>
              <h2 className="text-3xl font-bold">Module 2: Blockchain Settlement</h2>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed">
              Polygon Mumbai testnet connected. Smart contracts for peer-to-peer energy trading activated.
              Verifying cryptographic signatures.
            </p>
          </ScrollStackItem>

          {/* Slide 3 — Module 3 + CTA */}
          <ScrollStackItem index={2}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl"><Zap className="w-8 h-8 text-purple-400" /></div>
              <h2 className="text-3xl font-bold">Module 3: AI Agents Ready</h2>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed mb-10">
              LangGraph models loaded. Independent AI agents are now managing local energy storage and
              bidding on the open energy market.
            </p>

            <div className="flex justify-center">
              <LiquidButton
                onClick={() => navigate('/dashboard')}
                className="text-white border border-emerald-500/30 rounded-full bg-emerald-500/10 backdrop-blur-md"
                size={'xl'}
              >
                <Zap className="w-5 h-5 mr-3 text-emerald-400 animate-pulse" />
                Enter Active Dashboard
                <ArrowRight className="w-5 h-5 ml-3" />
              </LiquidButton>
            </div>
          </ScrollStackItem>
        </ScrollStack>
      </div>
    </div>
  );
}

