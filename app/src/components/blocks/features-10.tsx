import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Cpu, Sun, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ChromaGrid } from '@/components/ui/chroma-grid'

export function Features() {
    return (
        <section className="bg-transparent py-16">
            <div className="mx-auto max-w-2xl px-6 lg:max-w-5xl">
                <div className="mx-auto grid gap-4 lg:grid-cols-2">
                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Sun}
                                title="Virtual IoT Layer"
                                description="50 simulated buildings with solar panels, batteries, and realistic load patterns."
                            />
                        </CardHeader>

                        <div className="relative mb-6 border-t border-dashed border-emerald-500/20 sm:mb-0">
                            <div className="absolute inset-0 [background:radial-gradient(125%_125%_at_50%_0%,transparent_40%,rgba(16,185,129,0.05),transparent_125%)]"></div>
                            <div className="aspect-[76/59] p-1 px-6">
                                <DualModeImage
                                    darkSrc="/smart_grid_hero.png"
                                    lightSrc="/smart_grid_hero.png"
                                    alt="IoT illustration"
                                    width={1207}
                                    height={929}
                                    className="rounded-xl border border-emerald-500/20"
                                />
                            </div>
                        </div>
                    </FeatureCard>

                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Cpu}
                                title="AI Trading Agents"
                                description="Each building runs a LangGraph AI agent that autonomously buys or sells energy."
                            />
                        </CardHeader>

                        <CardContent>
                            <div className="relative mb-6 sm:mb-0">
                                <div className="absolute -inset-6 [background:radial-gradient(50%_50%_at_75%_50%,transparent,rgba(15,23,42,0.8)_100%)]"></div>
                                <div className="aspect-[76/59] border border-emerald-500/20 rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/10">
                                    <DualModeImage
                                        darkSrc="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1207&auto=format&fit=crop"
                                        lightSrc="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1207&auto=format&fit=crop"
                                        alt="AI illustration"
                                        width={1207}
                                        height={929}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </FeatureCard>

                    <FeatureCard className="p-6 lg:col-span-2 bg-slate-900/40">
                        <p className="mx-auto my-6 max-w-md text-balance text-center text-2xl font-semibold text-white">Watch your city breathe with 3D Digital Twins and Blockchain Settlement.</p>

                        <div className="flex justify-center gap-6 overflow-hidden">
                            <CircularUI
                                label="3D Engine"
                                circles={[{ pattern: 'border' }, { pattern: 'primary' }]}
                            />
                            <CircularUI
                                label="Blockchain"
                                circles={[{ pattern: 'blue' }, { pattern: 'none' }]}
                            />
                        </div>
                    </FeatureCard>
                </div>
            </div>
        </section>
    )
}

interface FeatureCardProps {
    children: ReactNode
    className?: string
}

const FeatureCard = ({ children, className }: FeatureCardProps) => (
    <Card className={cn('group relative rounded-none shadow-none bg-slate-900/20 border-white/5 backdrop-blur-md overflow-hidden', className)}>
        <ChromaGrid color="#10b981" cellSize={32} />
        <CardDecorator />
        {children}
    </Card>
)

const CardDecorator = () => (
    <>
        <span className="border-emerald-500 absolute -left-px -top-px block size-2 border-l-2 border-t-2"></span>
        <span className="border-emerald-500 absolute -right-px -top-px block size-2 border-r-2 border-t-2"></span>
        <span className="border-emerald-500 absolute -bottom-px -left-px block size-2 border-b-2 border-l-2"></span>
        <span className="border-emerald-500 absolute -bottom-px -right-px block size-2 border-b-2 border-r-2"></span>
    </>
)

interface CardHeadingProps {
    icon: LucideIcon
    title: string
    description: string
}

const CardHeading = ({ icon: Icon, title, description }: CardHeadingProps) => (
    <div className="p-6">
        <span className="text-emerald-400 flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <Icon className="size-4" />
            {title}
        </span>
        <p className="mt-8 text-2xl font-semibold text-white">{description}</p>
    </div>
)

interface DualModeImageProps {
    darkSrc: string
    lightSrc: string
    alt: string
    width: number
    height: number
    className?: string
}

const DualModeImage = ({ darkSrc, lightSrc, alt, width, height, className }: DualModeImageProps) => (
    <div className="overflow-hidden h-full">
        <img
            src={darkSrc}
            className={cn('hidden dark:block w-full h-full object-cover', className)}
            alt={`${alt} dark`}
            width={width}
            height={height}
        />
        <img
            src={lightSrc}
            className={cn('shadow dark:hidden w-full h-full object-cover', className)}
            alt={`${alt} light`}
            width={width}
            height={height}
        />
    </div>
)

interface CircleConfig {
    pattern: 'none' | 'border' | 'primary' | 'blue'
}

interface CircularUIProps {
    label: string
    circles: CircleConfig[]
    className?: string
}

const CircularUI = ({ label, circles, className }: CircularUIProps) => (
    <div className={className}>
        <div className="bg-gradient-to-b from-emerald-500/20 size-fit rounded-2xl to-transparent p-px shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/50 relative flex aspect-square w-fit items-center -space-x-4 rounded-[15px] p-4">
                {circles.map((circle, i) => (
                    <div
                        key={i}
                        className={cn('size-7 rounded-full border border-emerald-500/40 sm:size-8', {
                            'bg-transparent': circle.pattern === 'none',
                            'bg-[repeating-linear-gradient(-45deg,rgba(16,185,129,0.2),rgba(16,185,129,0.2)_1px,transparent_1px,transparent_4px)]': circle.pattern === 'border',
                            'bg-emerald-500 bg-[repeating-linear-gradient(-45deg,rgba(16,185,129,0.5),rgba(16,185,129,0.5)_1px,transparent_1px,transparent_4px)]': circle.pattern === 'primary',
                            'z-10 border-blue-500 bg-[repeating-linear-gradient(-45deg,theme(colors.blue.500),theme(colors.blue.500)_1px,transparent_1px,transparent_4px)]': circle.pattern === 'blue',
                        })}></div>
                ))}
            </div>
        </div>
        <span className="text-emerald-400 mt-2 block text-center text-xs tracking-widest uppercase font-bold">{label}</span>
    </div>
)
