import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Zap, 
  Clock, 
  Database, 
  HelpCircle, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Building2,
  Phone,
  QrCode
} from 'lucide-react';
import { aiApi } from '../services/api';

export const AIAssistantPage = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '👋 Hello! I am your **RAIS Agencies Executive AI Business Co-Pilot**.\n\nI have live semantic connectivity to your Rayachoty depot database. You can ask me anything about wholesale pricing, customer ledger balances, overdue receivables, inventory stock levels, or billing formulas.',
      intent: 'GREETING',
      latency: 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    { label: 'Total Outstanding Balance', prompt: 'What is our total outstanding balance and overdue amount?', icon: DollarSign },
    { label: 'French Fries & Momos Pricing', prompt: 'What is the wholesale price of French Fries and Momos?', icon: Package },
    { label: 'Top Selling Products', prompt: 'Show me top selling products and revenue this month', icon: TrendingUp },
    { label: 'Billing & Cash Rules', prompt: 'Explain the billing calculation formula and cash settlement terms', icon: HelpCircle },
    { label: 'Customer Due Accounts', prompt: 'What is the customer status for registered accounts?', icon: Users }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg = {
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const response = await aiApi.query(q);
      const assistantMsg = {
        role: 'assistant',
        text: response.answer,
        intent: response.intent,
        tool: response.tool_executed,
        latency: response.latency_ms,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: '❌ Encountered a connection issue with the RAIS semantic engine. Please check backend connectivity and retry.',
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        text: 'Chat history reset. How can I assist you with RAIS Agencies operations today?',
        intent: 'GREETING',
        latency: 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2 font-sans">
      
      {/* ─── TOP ACTION & HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                RAIS AI Assistant & Semantic Knowledge Co-Pilot
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-mono">
                Live DB Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Natural Language Semantic Inquiries & Live Telemetry Intelligence
            </p>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* ─── 2-COLUMN MAIN CANVAS (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT COLUMN: CONVERSATIONAL CHAT ENGINE (65% Width = 8 cols) ─── */}
        <div className="lg:col-span-8 bg-slate-900/95 rounded-2xl border border-slate-800 p-3 shadow-xl flex flex-col overflow-hidden">
          
          {/* Scrollable Chat Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={idx}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs space-y-2 shadow-md ${
                    isUser 
                      ? 'bg-amber-500 text-slate-950 font-medium' 
                      : msg.isError
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                      : 'bg-slate-950/90 border border-slate-800 text-slate-200'
                  }`}>
                    {/* Header meta for assistant */}
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80 text-[10px]">
                        <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>RAIS Semantic Engine</span>
                        </span>
                        <div className="flex items-center gap-2 text-slate-500 font-mono">
                          {msg.latency > 0 && <span>{msg.latency}ms</span>}
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>

                    {/* Telemetry Tool Card */}
                    {!isUser && msg.tool && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Tool: {msg.tool}</span>
                        </span>
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                          Intent: {msg.intent}
                        </span>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Querying Rayachoty database lineage engine...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="pt-2 pb-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickPrompts.map((qp, i) => {
              const Icon = qp.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleSend(qp.prompt)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-amber-400 transition-all shrink-0 select-none"
                >
                  <Icon className="w-3 h-3 text-amber-500" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Box */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="pt-2 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about wholesale pricing, customer dues, stock, or sales..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* ─── RIGHT COLUMN: DOMAIN KNOWLEDGE & SPECIFICATIONS (35% Width = 4 cols) ─── */}
        <div className="lg:col-span-4 bg-slate-900/95 rounded-2xl border border-slate-800 p-3.5 shadow-xl flex flex-col space-y-3 overflow-y-auto">
          
          {/* Card 1: Depot Operating Profile */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>Rayachoty Depot Profile</span>
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              <p><strong className="text-slate-400">Business:</strong> RAIS Agencies</p>
              <p><strong className="text-slate-400">Hub:</strong> Reddies Colony, Rayachoty (516269)</p>
              <p><strong className="text-slate-400">Support:</strong> 9347453135, 9573261696</p>
              <p><strong className="text-slate-400">UPI ID:</strong> <span className="font-mono text-amber-400 font-bold">9347453135@ybl</span></p>
            </div>
          </div>

          {/* Card 2: 0% GST Wholesale Cash Model */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>0% GST Wholesale Cash Model</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed font-mono text-[11px]">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Calculation Formula:</span>
                <span className="text-amber-300 font-bold">Line Total = (Qty × Rate) - Discount</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Settlement Terms:</span>
                <span className="text-white font-bold">Cash on Delivery (Due Date = Invoice Date)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Semantic Tool Capabilities */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 flex-1">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Database className="w-4 h-4 text-cyan-500" />
              <span>Semantic Capabilities</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Wholesale SKU Pricing Matrix</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Customer Ledger & Aging Balances</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Fast-Moving Product Velocity</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Cold Storage Warehouse Units</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
