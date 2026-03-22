import { Sparkles } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Pricing", "Changelog", "API"],
  Resources: ["Documentation", "Blog", "Community", "Support"],
  Company: ["About", "Careers", "Privacy", "Terms"],
};

export default function Footer() {
  return (
    <footer className="relative bg-bg-card">
      {/* Top gradient separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-5">
          {/* Logo + tagline */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <span className="text-sm font-bold text-white">R</span>
              </div>
              <span className="text-lg font-bold text-text-primary">
                RAG Learn
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-secondary">
              Transform your documents into interactive learning experiences
              powered by AI.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-sm font-semibold text-text-primary">
                {heading}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-text-muted transition-colors hover:text-text-primary"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-text-muted">
            &copy; {new Date().getFullYear()} RAG Learn. All rights reserved.
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-text-muted">
            <Sparkles className="h-3 w-3 text-primary" />
            Built with AI
          </div>
        </div>
      </div>
    </footer>
  );
}
