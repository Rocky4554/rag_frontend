import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create Account — RAG Learning Platform",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-accent items-center justify-center p-12">
        {/* Mesh overlay blobs */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg text-center text-white">
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Start Your Learning Journey
          </h2>
          <p className="text-lg text-white/80 mb-10">
            Join a community of learners using AI to master any subject faster.
            Your personalized study companion awaits.
          </p>

          {/* Mockup placeholder */}
          <div className="mx-auto w-full max-w-sm aspect-[4/3] rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white/50 text-sm font-medium">
              App Preview
            </span>
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 bg-bg-card">
        <SignupForm />
      </div>
    </div>
  );
}
