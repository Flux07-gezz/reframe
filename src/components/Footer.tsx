// src/components/Footer.tsx
"use client";

import Link from "next/link";
import { Github, Mail, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[var(--border)] bg-gradient-to-b from-[var(--bg)] to-[var(--surface)] text-[var(--text)] px-6 py-12 mt-12 transition-colors duration-300">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">

        {/* Left Section: Brand & Description */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[var(--text)] to-[var(--text)]/70 bg-clip-text text-transparent">
            Reframe
          </h2>
          <p className="text-sm opacity-70 leading-relaxed max-w-sm">
            A modern open-source video editing experience built for creators. Runs entirely inside your browser.
          </p>
        </div>

        {/* Middle Section: Semantic Navigation Links */}
        <nav className="flex flex-col gap-2.5 text-sm" aria-label="Footer Navigation">
          <h3 className="font-semibold opacity-90 mb-1 tracking-wider uppercase text-xs">Links</h3>

          <a
            href="https://github.com/magic-peach/reframe"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit opacity-70 hover:opacity-100 hover:text-blue-500 hover:translate-x-1 transition-all duration-200 focus:outline-none focus:underline"
          >
            GitHub
          </a>

          <Link
            href="/contact"
            className="w-fit opacity-70 hover:opacity-100 hover:text-blue-500 hover:translate-x-1 transition-all duration-200 focus:outline-none focus:underline"
          >
            Contact
          </Link>

          <Link
            href="/privacy"
            className="w-fit opacity-70 hover:opacity-100 hover:text-blue-500 hover:translate-x-1 transition-all duration-200 focus:outline-none focus:underline"
          >
            Privacy Policy
          </Link>
        </nav>

        {/* Right Section: Interactive Newsletter & Socials */}
        <div className="flex flex-col gap-4 md:items-end">
          <div className="w-full max-w-xs md:text-right">
            <h3 className="font-semibold opacity-90 mb-2 tracking-wider uppercase text-xs">Stay Updated</h3>
            
            {/* Form submission works perfectly here now */}
            <form 
              onSubmit={(e) => e.preventDefault()} 
              className="flex items-center gap-2 border border-[var(--border)] bg-[var(--bg)] rounded-xl p-1 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all duration-200"
            >
              <div className="pl-2 opacity-50">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-transparent text-sm px-1 py-1.5 focus:outline-none placeholder:opacity-50"
                required
              />
              <button 
                type="submit"
                aria-label="Subscribe"
                className="p-2 rounded-lg bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-all active:scale-95"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Social Icons Layout */}
          <div className="flex flex-col gap-2 md:items-end w-full max-w-xs mt-2">
            <span className="text-xs opacity-50 font-medium">Community</span>
            <div className="flex gap-3">
              <a
                href="https://github.com/magic-peach/reframe"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text)]/70 hover:text-[var(--text)] hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                aria-label="Reframe GitHub Repository"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Bar: Clean Layout and Dynamic Date */}
      <div className="mt-12 pt-6 border-t border-[var(--border)] max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs opacity-50">
        <div>
          © {new Date().getFullYear()} Reframe · Open Source under MIT License
        </div>
        <div className="text-[11px] font-mono tracking-tight">
          Built with Next.js & Tailwind
        </div>
      </div>
    </footer>
  );
}