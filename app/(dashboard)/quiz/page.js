"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, XCircle, Loader2, AlertCircle, RotateCcw, Trophy } from "lucide-react";
import { quizAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { getUserFriendlyError } from "@/lib/utils";

export default function QuizPage() {
  const { activeSession } = useSession();
  const sessionId = activeSession?.sessionId;

  // Setup state
  const [topic, setTopic] = useState("general");
  const [numQuestions, setNumQuestions] = useState(5);

  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  // Loading
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const generateQuiz = async () => {
    if (!sessionId) return;
    setGenerating(true);
    setError("");
    try {
      const { data } = await quizAPI.generate(sessionId, topic, numQuestions);
      // Backend returns { quiz: [...] } with correctAnswer as index and prefixed options
      const normalized = (data.quiz || data.questions || []).map((q) => {
        // Strip "A) ", "B) " etc. prefixes from options if present
        const cleanOptions = q.options.map((opt) =>
          opt.replace(/^[A-D]\)\s*/, "")
        );
        return {
          ...q,
          options: cleanOptions,
          // Convert index-based correctAnswer to the actual text
          correctAnswer:
            typeof q.correctAnswer === "number"
              ? cleanOptions[q.correctAnswer]
              : q.correctAnswer,
        };
      });
      setQuestions(normalized);
      setCurrentIndex(0);
      setSelected(null);
      setShowAnswer(false);
      setScore(0);
      setQuizDone(false);
    } catch (err) {
      setError(getUserFriendlyError(err, "Failed to generate the quiz. Please try again."));
    } finally {
      setGenerating(false);
    }
  };

  const handleSelect = (optionText) => {
    if (showAnswer) return;
    setSelected(optionText);
  };

  const handleSubmitAnswer = () => {
    if (!selected) return;
    setShowAnswer(true);
    const currentQ = questions[currentIndex];
    if (selected === currentQ.correctAnswer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setQuizDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setShowAnswer(false);
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setSelected(null);
    setShowAnswer(false);
    setScore(0);
    setQuizDone(false);
  };

  // No session
  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F59E0B]/10 to-[#0EA5E9]/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-[#F59E0B]" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">No Document Loaded</h2>
        <p className="text-sm text-text-muted mb-4">Upload a PDF first to generate quizzes.</p>
        <a href="/upload" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Upload Document
        </a>
      </div>
    );
  }

  // Quiz done - show results
  if (quizDone) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center mb-6">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Quiz Complete!</h2>
          <p className="text-text-muted mb-6">Here are your results</p>

          <div className="bg-bg-card border border-border rounded-2xl p-8 mb-6">
            <div className="text-5xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] bg-clip-text text-transparent mb-2">
              {pct}%
            </div>
            <p className="text-text-secondary">
              {score} out of {questions.length} correct
            </p>

            <div className="mt-6 h-3 rounded-full bg-bg-elevated overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9]"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={resetQuiz}
              className="px-6 py-3 rounded-xl border border-border text-text-primary font-medium hover:bg-bg-elevated transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              New Quiz
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Setup screen (no questions yet)
  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Smart Quiz</h1>
          <p className="text-text-muted mb-8">Generate AI-powered quiz from your document</p>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">Topic (optional)</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., machine learning, chapter 3, key concepts"
                className="w-full rounded-lg border border-border bg-bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">Number of Questions</label>
              <div className="flex gap-2">
                {[3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumQuestions(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      numQuestions === n
                        ? "bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white"
                        : "bg-bg-elevated text-text-secondary hover:bg-border"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateQuiz}
              disabled={generating}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                "Generate Quiz"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active quiz
  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const options = question.options.map((opt, i) => ({
    id: String.fromCharCode(65 + i), // A, B, C, D
    text: opt,
  }));

  return (
    <div className="max-w-2xl mx-auto py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-secondary">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-sm text-text-muted">
                Score: {score}/{currentIndex + (showAnswer ? 1 : 0)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9]"
              />
            </div>
          </div>

          {/* Question card */}
          <div className="bg-bg-card border border-border rounded-2xl p-8 mb-6">
            <h2 className="text-lg font-semibold text-text-primary leading-relaxed">
              {question.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {options.map((option) => {
              const isSelected = selected === option.text;
              const isCorrect = showAnswer && option.text === question.correctAnswer;
              const isWrong = showAnswer && isSelected && option.text !== question.correctAnswer;

              let borderClass = "border-border bg-bg-card hover:border-border-subtle";
              if (isCorrect) borderClass = "border-[#22C55E] bg-[#22C55E]/5";
              else if (isWrong) borderClass = "border-[#EF4444] bg-[#EF4444]/5";
              else if (isSelected && !showAnswer) borderClass = "border-[#7C3AED] bg-gradient-to-r from-[#7C3AED]/5 to-[#0EA5E9]/5";

              return (
                <motion.button
                  key={option.id}
                  whileTap={!showAnswer ? { scale: 0.98 } : {}}
                  onClick={() => handleSelect(option.text)}
                  disabled={showAnswer}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${borderClass} disabled:cursor-default`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 ${
                      isCorrect
                        ? "bg-[#22C55E] text-white"
                        : isWrong
                        ? "bg-[#EF4444] text-white"
                        : isSelected
                        ? "bg-[#7C3AED] text-white"
                        : "bg-bg-elevated text-text-secondary"
                    }`}
                  >
                    {option.id}
                  </span>
                  <span className={`text-sm font-medium flex-1 ${isSelected || isCorrect ? "text-text-primary" : "text-text-secondary"}`}>
                    {option.text}
                  </span>
                  {isCorrect && <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />}
                  {isWrong && <XCircle className="w-5 h-5 text-[#EF4444] shrink-0" />}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          {showAnswer && question.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-[#7C3AED]/5 border border-[#7C3AED]/20"
            >
              <p className="text-sm font-medium text-[#7C3AED] mb-1">Explanation</p>
              <p className="text-sm text-text-secondary">{question.explanation}</p>
            </motion.div>
          )}

          {/* Action button */}
          {!showAnswer ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selected}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              {currentIndex + 1 >= questions.length ? "See Results" : "Next Question"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
