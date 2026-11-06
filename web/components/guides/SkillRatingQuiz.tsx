// SkillRatingQuiz - Interactive quiz to determine player skill level
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import useSEO from '../../hooks/useSEO';
import {
    getGuideBySlug,
    getQuizQuestions,
    getSkillLevels,
    calculateSkillLevel,
    saveQuizResult,
    getLatestQuizResult,
    Guide,
    QuizQuestion,
    SkillLevel,
    UserQuizResult
} from '../../services/guides';
import { supabase } from '../../services/supabase';
import { flushPlayerEvents, trackEvent } from '../../services/playerEvents';
import GuideScreen, { SegmentedProgress } from './GuideScreen';

interface SkillRatingQuizProps {
    isLoggedIn: boolean;
}

// Guests can answer this many questions before being asked to sign up
const FREE_QUESTIONS = 3;

const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 text-white px-6 py-3 text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors';
const quietButton = 'inline-flex items-center gap-2 py-3 text-sm font-semibold text-slate-500 hover:text-slate-950 transition-colors';

const SkillRatingQuiz: React.FC<SkillRatingQuizProps> = ({ isLoggedIn }) => {
    const [guide, setGuide] = useState<Guide | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const [started, setStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<{ question_id: string; selected_option: string; skill_points: number }[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<SkillLevel | null>(null);
    const [startTime, setStartTime] = useState<number>(0);
    const [previousResult, setPreviousResult] = useState<UserQuizResult | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const quizProgressRef = useRef({ started: false, completed: false, question: 0, total: 0, loginPrompt: false });
    quizProgressRef.current = {
        ...quizProgressRef.current,
        question: currentQuestion + 1,
        total: questions.length,
        loginPrompt: showLoginPrompt,
    };

    useEffect(() => {
        const reportAbandon = () => {
            const progress = quizProgressRef.current;
            if (!progress.started || progress.completed) return;
            quizProgressRef.current = { ...progress, started: false };
            trackEvent('quiz_abandoned', {
                question: progress.question,
                total: progress.total,
                reason: progress.loginPrompt ? 'login_prompt' : 'left',
            });
            flushPlayerEvents();
        };
        window.addEventListener('pagehide', reportAbandon);
        return () => {
            window.removeEventListener('pagehide', reportAbandon);
            reportAbandon();
        };
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const [guideResult, skillResult] = await Promise.all([
                getGuideBySlug('skill-rating'),
                getSkillLevels()
            ]);

            if (guideResult.success && guideResult.data) {
                setGuide(guideResult.data);

                const questionsResult = await getQuizQuestions(guideResult.data.id);
                if (questionsResult.success) {
                    setQuestions(questionsResult.data);
                }

                if (userId) {
                    const prevResult = await getLatestQuizResult(userId, guideResult.data.id);
                    if (prevResult.success && prevResult.data) {
                        setPreviousResult(prevResult.data);
                    }
                }
            }

            if (skillResult.success) {
                setSkillLevels(skillResult.data);
            }

            setLoading(false);
        };
        fetchData();
    }, [userId]);

    useSEO({
        title: 'Pickleball Skill Rating Quiz Philippines | PicklePlay',
        description:
            guide?.description || 'Take a pickleball skill rating quiz to estimate your level, compare your game, and find the right playing partners on PicklePlay.',
        canonical: 'https://www.pickleplay.ph/guides/skill-rating',
        structuredData: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Pickleball Skill Rating Quiz Philippines',
            description:
                guide?.description || 'Interactive pickleball skill rating quiz for players in the Philippines.',
            url: 'https://www.pickleplay.ph/guides/skill-rating',
        },
    });

    const handleStart = () => {
        setStarted(true);
        setStartTime(Date.now());
        quizProgressRef.current = { ...quizProgressRef.current, started: true, completed: false };
        trackEvent('quiz_started', { loggedIn: isLoggedIn, total: questions.length });
    };

    const handleNext = () => {
        if (!selectedOption) return;

        const question = questions[currentQuestion];
        const selectedOpt = question.options.find(o => o.value === selectedOption);
        if (!selectedOpt) return;

        const newAnswers = [...answers.slice(0, currentQuestion), {
            question_id: question.id,
            selected_option: selectedOption,
            skill_points: selectedOpt.skill_points
        }];
        setAnswers(newAnswers);

        const nextQuestion = currentQuestion + 1;

        if (!isLoggedIn && nextQuestion >= FREE_QUESTIONS) {
            setShowLoginPrompt(true);
            return;
        }

        if (nextQuestion < questions.length) {
            setCurrentQuestion(nextQuestion);
            setSelectedOption(newAnswers[nextQuestion]?.selected_option ?? null);
        } else {
            const score = newAnswers.reduce((sum, a) => sum + a.skill_points, 0);
            const skillLevel = calculateSkillLevel(score, skillLevels);
            setResult(skillLevel);
            setShowResult(true);
            quizProgressRef.current = { ...quizProgressRef.current, completed: true };
            trackEvent('quiz_completed', {
                loggedIn: isLoggedIn,
                seconds: Math.round((Date.now() - startTime) / 1000),
                level: skillLevel?.name ?? null,
            });

            if (userId && guide && skillLevel) {
                const timeTaken = Math.round((Date.now() - startTime) / 1000);
                saveQuizResult(userId, guide.id, score, skillLevel, newAnswers, timeTaken);
            }
        }
    };

    const handleBack = () => {
        if (currentQuestion === 0) return;
        const previous = currentQuestion - 1;
        setCurrentQuestion(previous);
        setSelectedOption(answers[previous]?.selected_option ?? null);
    };

    const handleRetake = () => {
        setStarted(false);
        setCurrentQuestion(0);
        setAnswers([]);
        setSelectedOption(null);
        setShowResult(false);
        setShowLoginPrompt(false);
        setResult(null);
        setStartTime(0);
    };

    if (loading) {
        return (
            <GuideScreen isLoggedIn={isLoggedIn}>
                <div className="animate-pulse space-y-4" aria-busy="true">
                    <div className="h-10 bg-slate-100 rounded w-2/3" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-4/5" />
                </div>
            </GuideScreen>
        );
    }

    if (showLoginPrompt) {
        return (
            <GuideScreen
                isLoggedIn={isLoggedIn}
                counter={`${FREE_QUESTIONS} / ${questions.length}`}
                progress={<SegmentedProgress count={questions.length} current={FREE_QUESTIONS} isLocked={(i) => i >= FREE_QUESTIONS} />}
                footer={
                    <div className="flex items-center justify-between gap-4">
                        <button type="button" onClick={handleRetake} className={quietButton}>
                            <RotateCcw size={16} />
                            Start over
                        </button>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="hidden sm:inline text-sm font-semibold text-slate-500 hover:text-slate-950 transition-colors">
                                Log in
                            </Link>
                            <Link to="/signup" className={primaryButton}>
                                Create a free account
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                }
            >
                <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter leading-tight max-w-2xl">
                    Sign up to finish the quiz.
                </h1>
                <p className="mt-5 text-[15px] md:text-lg leading-relaxed text-slate-600 max-w-xl">
                    You've answered {FREE_QUESTIONS} of {questions.length} questions. With a free account you can answer the rest,
                    get your rating from 1.0 to 5.0+, and save it to your profile so partners and clinics can match your level.
                </p>
                <p className="mt-4 text-sm text-slate-500 sm:hidden">
                    Already a member?{' '}
                    <Link to="/login" className="font-semibold text-slate-950 underline underline-offset-4">Log in</Link>
                </p>
            </GuideScreen>
        );
    }

    if (showResult && result) {
        const improved = previousResult && parseFloat(result.level) > parseFloat(previousResult.skill_rating);
        return (
            <GuideScreen
                isLoggedIn={isLoggedIn}
                footer={
                    <div className="flex items-center justify-between gap-4">
                        <button type="button" onClick={handleRetake} className={quietButton}>
                            <RotateCcw size={16} />
                            Retake
                        </button>
                        <Link to={isLoggedIn ? '/profile' : '/signup'} className={primaryButton}>
                            {isLoggedIn ? 'View my profile' : 'Sign up to save it'}
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                }
            >
                <p className="text-sm text-slate-500">Your skill rating</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <span className="text-7xl md:text-9xl font-black text-slate-950 tracking-tighter leading-none tabular-nums">{result.level}</span>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-950 tracking-tight">{result.name}</h1>
                </div>
                <p className="mt-5 text-[15px] md:text-lg leading-relaxed text-slate-600 max-w-2xl">{result.description}</p>

                {previousResult && previousResult.skill_rating !== result.level && (
                    <p className="mt-3 text-sm text-slate-500">
                        Last time you rated {previousResult.skill_rating}.{improved ? ' Nice improvement.' : ''}
                    </p>
                )}

                {result.recommendations && result.recommendations.length > 0 && (
                    <div className="mt-6 md:mt-8 max-w-2xl">
                        <p className="text-sm font-semibold text-slate-950">What to work on next</p>
                        <ol className="mt-2 space-y-1.5 list-decimal pl-5 marker:text-slate-400 marker:font-semibold text-[15px] md:text-base text-slate-700">
                            {result.recommendations.map((rec, idx) => <li key={idx} className="pl-1">{rec}</li>)}
                        </ol>
                    </div>
                )}
            </GuideScreen>
        );
    }

    if (!started) {
        return (
            <GuideScreen
                isLoggedIn={isLoggedIn}
                footer={
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-slate-500 min-w-0">
                            {isLoggedIn ? 'Your result is saved to your profile.' : `Guests can answer the first ${FREE_QUESTIONS} questions.`}
                        </p>
                        <button type="button" onClick={handleStart} disabled={questions.length === 0} className={`${primaryButton} shrink-0`}>
                            Start
                            <ArrowRight size={16} />
                        </button>
                    </div>
                }
            >
                <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter leading-[0.95]">
                    What's your skill rating?
                </h1>
                <p className="mt-5 text-[15px] md:text-lg leading-relaxed text-slate-600 max-w-xl">
                    {questions.length || 10} questions about your experience, serve, shots, positioning and strategy.
                    You'll get an estimate on the 1.0 to 5.0+ scale used to match partners, clinics and tournament divisions.
                </p>
                <p className="mt-4 text-[15px] md:text-lg leading-relaxed text-slate-600 max-w-xl">
                    There are no wrong answers. If two options fit, pick the one that describes you most of the time.
                </p>
                <p className="mt-6 text-sm text-slate-500">About 5 minutes</p>
                {previousResult && (
                    <p className="mt-1 text-sm text-slate-500">Your last rating: <span className="font-semibold text-slate-950">{previousResult.skill_rating}</span></p>
                )}
            </GuideScreen>
        );
    }

    const question = questions[currentQuestion];
    const isLastQuestion = currentQuestion === questions.length - 1;

    return (
        <GuideScreen
            isLoggedIn={isLoggedIn}
            counter={`${currentQuestion + 1} / ${questions.length}`}
            progress={
                <SegmentedProgress
                    count={questions.length}
                    current={currentQuestion}
                    isLocked={(i) => !isLoggedIn && i >= FREE_QUESTIONS}
                />
            }
            footer={
                <div className="flex items-center justify-between gap-4">
                    <button type="button" onClick={handleBack} className={`${quietButton} ${currentQuestion === 0 ? 'invisible' : ''}`}>
                        <ArrowLeft size={16} />
                        Back
                    </button>
                    <button type="button" onClick={handleNext} disabled={!selectedOption} className={primaryButton}>
                        {isLastQuestion ? 'See my rating' : 'Next'}
                        <ArrowRight size={16} />
                    </button>
                </div>
            }
        >
            <fieldset key={question.id} className="animate-fade-in">
                <legend className="text-2xl md:text-4xl font-black text-slate-950 tracking-tight leading-tight max-w-2xl">
                    {question.question_text}
                </legend>

                <div className="mt-6 md:mt-8 space-y-2 max-w-2xl">
                    {question.options.map((option) => {
                        const selected = selectedOption === option.value;
                        return (
                            <label
                                key={option.value}
                                className={`flex items-center gap-3 rounded-xl border px-4 py-3 md:py-3.5 cursor-pointer transition-colors ${selected ? 'border-slate-950 bg-slate-50' : 'border-slate-200 hover:border-slate-400'}`}
                            >
                                <input
                                    type="radio"
                                    name={question.id}
                                    value={option.value}
                                    checked={selected}
                                    onChange={() => setSelectedOption(option.value)}
                                    className="sr-only peer"
                                />
                                <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2 ${selected ? 'border-slate-950' : 'border-slate-300'}`}>
                                    {selected && <span className="w-2 h-2 rounded-full bg-lime-500" />}
                                </span>
                                <span className={`text-[15px] md:text-base ${selected ? 'font-semibold text-slate-950' : 'text-slate-700'}`}>{option.text}</span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>
        </GuideScreen>
    );
};

export default SkillRatingQuiz;
