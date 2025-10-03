import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Trophy, Infinity, BookOpen, GraduationCap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Quantum Leap
            </h1>
          </div>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-primary/10 rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Mastery Learning</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              Master Any Subject with Infinite Practice
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The revolutionary SaaS platform that generates unlimited, unique assessments tailored to your learning goals. Fail fast, retry instantly, and achieve true mastery.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow">
                <BookOpen className="w-5 h-5 mr-2" />
                Start Learning Free
              </Button>
              <Button size="lg" variant="outline">
                <GraduationCap className="w-5 h-5 mr-2" />
                See How It Works
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Why Quantum Leap?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-lg shadow-card-custom">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Infinity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Infinite Assessments</h3>
              <p className="text-muted-foreground">
                AI generates unlimited unique quizzes and assignments. Never run out of practice material.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-card-custom">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Retry</h3>
              <p className="text-muted-foreground">
                Like a video game for learning - failed an assessment? Retry immediately with new questions.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-card-custom">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-3">True Mastery</h3>
              <p className="text-muted-foreground">
                Achieve deep understanding through endless practice. Track progress and earn certificates.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center bg-gradient-primary p-12 rounded-2xl shadow-glow">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-primary-foreground/90 mb-8 text-lg">
              Join thousands of learners achieving mastery at their own pace
            </p>
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}>
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started Now
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Quantum Leap AI Education Academy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
