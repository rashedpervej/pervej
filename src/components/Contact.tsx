import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, MessageSquare, Linkedin, Award, ExternalLink, CheckCircle } from "lucide-react";
import { portfolioData } from "../data";

export default function Contact() {
  const info = portfolioData.personalInfo;
  
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormState({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
      
      // Auto-reset success message after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    }, 1500);
  };

  return (
    <section id="contact" className="py-24 bg-[#030303] relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-950/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Title */}
        <div className="flex flex-col items-start mb-16 text-left">
          <span className="font-mono text-xs uppercase tracking-widest text-purple-400 mb-2">
            07 // Inquiries
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Let's Collaborate on <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              Your Next Brand Story
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Side: Personal Contacts & Socials */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            <div className="space-y-6 text-left">
              <h3 className="font-display font-semibold text-xl text-zinc-100">
                Direct Contact & Credentials
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-sm">
                Have an upcoming branding, video, or packaging project? Send a brief message, shoot an email, or message Rashed directly on WhatsApp.
              </p>
              
              <div className="space-y-4 pt-4">
                {/* Email link */}
                <a
                  href={`mailto:${info.email}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.03] transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/10">
                    <Mail className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Email Address
                    </p>
                    <p className="text-sm font-sans text-zinc-200 font-medium group-hover:text-purple-300">
                      {info.email}
                    </p>
                  </div>
                </a>

                {/* Phone link */}
                <a
                  href={`tel:${info.phone}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.03] transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/10">
                    <Phone className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Phone & WhatsApp
                    </p>
                    <p className="text-sm font-sans text-zinc-200 font-medium group-hover:text-purple-300">
                      {info.phone}
                    </p>
                  </div>
                </a>

                {/* Location */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/10">
                    <MapPin className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Primary Location
                    </p>
                    <p className="text-sm font-sans text-zinc-200 font-medium">
                      {info.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Social Shortcuts */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/20 to-black/40 border border-purple-500/10 text-left">
              <h4 className="font-display font-medium text-sm text-zinc-100 flex items-center gap-2">
                <Linkedin className="w-4.5 h-4.5 text-purple-400" />
                Social Connections
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Connect with Rashed on Behance and LinkedIn to see complete design case-studies and industry collaborations.
              </p>

              <div className="flex gap-3 mt-4">
                <a
                  href={`https://${info.behance}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2 border border-white/10 transition-all"
                >
                  Behance Portfolio
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://${info.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all"
                >
                  LinkedIn
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Side: Interactive Contact Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0c0c12]/40 border border-white/5 text-left h-full flex flex-col justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg sm:text-xl text-white mb-2">
                  Send a Direct Message
                </h3>
                <p className="text-zinc-500 text-xs sm:text-sm mb-6 leading-relaxed">
                  Have a custom requirement? Fill out the brief form below and Rashed will respond within 24 hours.
                </p>

                {isSuccess && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm flex items-center gap-3 animate-pulse">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold">Message sent successfully!</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Thank you for reaching out. Rashed will be in touch soon.</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 rounded-lg text-xs sm:text-sm text-white glass-input font-sans"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full px-4 py-3 rounded-lg text-xs sm:text-sm text-white glass-input font-sans"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.subject}
                      onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                      placeholder="Branding & Packaging Project Inquiry"
                      className="w-full px-4 py-3 rounded-lg text-xs sm:text-sm text-white glass-input font-sans"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                      Brief Description of Project
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      placeholder="Tell Rashed about your company, timelines, or design needs..."
                      className="w-full px-4 py-3 rounded-lg text-xs sm:text-sm text-white glass-input font-sans resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
