import React, { useState } from "react";

interface Props {
  settings?: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
  };
}

const AffiliateQuiz: React.FC<Props> = ({ settings }) => {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const title = settings?.title || "Find Your Perfect Beard Trimmer in 60 Seconds";
  const subtitle = settings?.subtitle || "Answer 5 quick questions and get 3 tailored picks based on your grooming style.";
  const ctaText = settings?.ctaText || "Start Quiz";

  const questions = [
    { q: "What beard length do you keep most often?", opts: ["Stubble (0-3mm)", "Short beard (3-10mm)", "Medium/Long (10mm+)"] },
    { q: "What's your primary use?", opts: ["Beard only", "Beard + hair", "Full grooming kit"] },
    { q: "What's your budget?", opts: ["Under $30", "$30-$60", "$60+"] },
    { q: "Must-have features", opts: ["Waterproof", "Cordless", "Precision head", "Long battery"] },
    { q: "How sensitive is your skin?", opts: ["Not sensitive", "Somewhat sensitive", "Very sensitive"] },
  ];

  if (!started) {
    return (
      <section id="quiz" className="w-full bg-[#f8f8f8] py-10">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-[1100px] rounded-xl border border-[#e8e8e8] bg-white p-6 text-center md:p-10">
            <div className="mx-auto max-w-2xl">
              <span className="inline-flex rounded-full bg-[#19212B] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Interactive Tool</span>
              <h2 className="mt-4 text-2xl font-extrabold text-[#1a1a1a] md:text-3xl">🧔 {title}</h2>
              <p className="mt-3 text-sm text-[#666]">{subtitle}</p>
              <button
                onClick={() => setStarted(true)}
                className="mt-6 inline-flex rounded bg-[#19212B] px-8 py-3 text-sm font-bold text-white hover:bg-[#2d3a4a]"
              >
                {ctaText}
              </button>
              <p className="mt-3 text-xs text-[#888]">By Jake Morrison • 5 questions • 60 seconds</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const current = questions[step - 1];

  return (
    <section className="w-full bg-[#f8f8f8] py-10">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[640px] rounded-xl border border-[#e8e8e8] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-[#666]">
              Question {step} of {questions.length}
            </span>
            <span className="text-xs text-[#888]">{Math.round((step / questions.length) * 100)}%</span>
          </div>
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
            <div className="h-full bg-[#19212B] transition-all" style={{ width: `${(step / questions.length) * 100}%` }} />
          </div>
          {step <= questions.length ? (
            <>
              <h3 className="text-lg font-bold text-[#1a1a1a]">{current?.q}</h3>
              <div className="mt-4 grid gap-2">
                {current?.opts.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => (step < questions.length ? setStep(step + 1) : setStep(questions.length + 1))}
                    className="rounded-lg border border-[#e8e8e8] bg-white px-4 py-3 text-left text-sm font-medium text-[#1a1a1a] hover:border-[#19212B] hover:bg-[#f8f8f8]"
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(Math.max(1, step - 1))} className="text-sm font-bold text-[#666] hover:text-[#19212B]">
                  Back
                </button>
                <button onClick={() => setStarted(false)} className="text-xs text-[#888] hover:text-[#19212B]">
                  Retake Quiz
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <h3 className="text-lg font-bold text-[#1a1a1a]">Your Top Beard Trimmer Matches</h3>
              <p className="mt-2 text-sm text-[#666]">Ranked by how closely they match your answers.</p>
              <div className="mt-6 space-y-3 text-left">
                <div className="rounded-lg border border-[#e8e8e8] p-4">
                  <span className="rounded bg-[#19212B] px-2 py-0.5 text-xs font-bold text-white">Best Overall</span>
                  <p className="mt-2 text-sm font-bold">Ufree Professional Beard Trimmer — $35.99</p>
                  <a href="https://www.amazon.com/dp/B0BMKLJW22?tag=mensgroomingpro-20" target="_blank" rel="nofollow noopener sponsored" className="mt-2 inline-flex rounded bg-[#19212B] px-4 py-2 text-xs font-bold text-white">
                    Check Price
                  </a>
                </div>
              </div>
              <button onClick={() => { setStarted(false); setStep(1); }} className="mt-6 text-sm font-bold text-[#19212B]">
                Retake Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AffiliateQuiz;
