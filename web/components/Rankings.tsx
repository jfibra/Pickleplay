
import React from 'react';
import { Link } from 'react-router-dom';
import useSEO from '../hooks/useSEO';
import { ArrowRight, Medal, Trophy, Target } from 'lucide-react';

/**
 * Public rankings page.
 *
 * There is no verified match-results feed yet, so this page explains how ratings work and points
 * players to the skill quiz and tournaments instead of showing a leaderboard. (It previously showed
 * hard-coded sample players.) When real rankings exist, render them here from opted-in profiles.
 */
const RATING_LEVELS: { range: string; label: string; description: string }[] = [
  { range: '2.0 – 2.5', label: 'Beginner', description: 'Learning the rules, the serve and keeping rallies going.' },
  { range: '3.0 – 3.5', label: 'Intermediate', description: 'Consistent serves and returns, starting to dink and move up to the kitchen line.' },
  { range: '4.0 – 4.5', label: 'Advanced', description: 'Controlled third-shot drops, resets and solid doubles strategy.' },
  { range: '5.0+', label: 'Expert / Pro', description: 'Tournament-level shot selection, speed and consistency.' },
];

const Rankings: React.FC = () => {
  useSEO({
    title: 'Pickleball Player Rankings Philippines',
    description:
      'PicklePlay player rankings for the Philippines are coming soon. Learn how pickleball skill ratings work and find your level with our free skill rating quiz.',
    canonical: 'https://www.pickleplay.ph/rankings',
  });

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Leaderboard</p>
        <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">Player Rankings.</h1>
        <p className="mt-4 text-slate-500 text-base md:text-lg max-w-2xl leading-relaxed">
          Official PicklePlay rankings for players in the Philippines are launching soon. They will be built from
          verified match and tournament results, so every spot on the board is earned on court.
        </p>
      </div>

      {/* What to do now */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/guides/skill-rating"
          className="group bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col gap-4 hover:shadow-xl hover:border-blue-200 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Find your skill rating</h2>
            <p className="mt-1 text-slate-500">
              Answer 10 quick questions and get an estimate on the 1.0 to 5.0+ scale used to match partners, clinics and divisions.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-2 font-bold text-blue-600 group-hover:gap-3 transition-all">
            Take the quiz <ArrowRight size={16} />
          </span>
        </Link>

        <Link
          to="/tournaments"
          className="group bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col gap-4 hover:shadow-xl hover:border-lime-300 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-lime-50 text-lime-700 flex items-center justify-center">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Play ranked events</h2>
            <p className="mt-1 text-slate-500">
              Tournament results will count toward the first PicklePlay rankings. Browse upcoming events near you.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-2 font-bold text-lime-700 group-hover:gap-3 transition-all">
            Browse tournaments <ArrowRight size={16} />
          </span>
        </Link>
      </div>

      {/* How ratings work */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center gap-3">
          <Medal size={22} className="text-blue-600" />
          <h2 className="text-lg md:text-xl font-black text-slate-900">How pickleball skill ratings work</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-y border-slate-100">
                <th scope="col" className="px-6 md:px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rating</th>
                <th scope="col" className="px-6 md:px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Level</th>
                <th scope="col" className="px-6 md:px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">What it looks like</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {RATING_LEVELS.map((level) => (
                <tr key={level.range}>
                  <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-sm">{level.range}</span>
                  </td>
                  <td className="px-6 md:px-8 py-4 font-bold text-slate-900 whitespace-nowrap">{level.label}</td>
                  <td className="px-6 md:px-8 py-4 text-sm text-slate-600 min-w-[16rem]">{level.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-6 md:px-8 py-5 text-xs text-slate-400 border-t border-slate-100">
          Ratings shown here are general guidance. DUPR is an independent rating system; PicklePlay estimates are not official DUPR ratings.
        </p>
      </section>
    </div>
  );
};

export default Rankings;
