import Link from 'next/link';
import { Swords, Trophy, Zap, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Swords className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">CodeDuel</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href="/register" className="btn-primary">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
            Battle Your Way to the{' '}
            <span className="text-primary-500">Top</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted">
            Challenge opponents in real-time 1v1 coding battles. Solve problems
            faster, climb the leaderboard, and prove your skills.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Start Dueling
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-3">
              Learn More
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-card/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Why CodeDuel?
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="card text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10">
                  <Zap className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Real-time Battles</h3>
                <p className="text-muted">
                  Race against your opponent in real-time. See their progress as
                  you code and feel the adrenaline.
                </p>
              </div>
              <div className="card text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10">
                  <Trophy className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">ELO Rankings</h3>
                <p className="text-muted">
                  Climb the competitive ladder with our ELO-based ranking
                  system. Match against players of similar skill.
                </p>
              </div>
              <div className="card text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10">
                  <Users className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Spectate & Learn</h3>
                <p className="text-muted">
                  Watch live matches, analyze replays, and learn from the best
                  coders in the community.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Compete?</h2>
            <p className="mb-8 text-muted">
              Join thousands of developers testing their skills every day.
            </p>
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Create Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} CodeDuel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
