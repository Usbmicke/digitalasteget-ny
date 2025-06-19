"use client";
import React from 'react';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import ChatWidget from '../components/ChatWidget';

type Message = {
  role: 'user' | 'model';
  parts: { text: string }[];
  isInitial?: boolean;
};

export default function Home() {
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInfoView, setIsInfoView] = useState(false);
    const [useWidget, setUseWidget] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);
    
    useEffect(() => {
        // Initial AI message
        setChatHistory([{
            role: 'model',
            parts: [{ text: "Välkommen! Jag är ByggPilot, din digitala kollega i byggbranschen. Hur kan jag hjälpa dig att effektivisera ditt projekt idag?" }]
        }]);
    }, []);

    const handleSend = async () => {
        if (!userInput.trim() || isLoading) return;

        const newUserMessage = { role: 'user', parts: [{ text: userInput }] };
        const updatedHistory = [...chatHistory, newUserMessage];

        setChatHistory(updatedHistory);
        setUserInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: updatedHistory })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Något gick fel med API-anropet.');
            }

            const data = await response.json();
            const aiResponse = { role: 'model', parts: [{ text: data.text }] };
            setChatHistory(prev => [...prev, aiResponse]);

        } catch (error: any) {
            console.error("Fetch error:", error);
            const errorMessage = {
                role: 'model',
                parts: [{ text: `Tekniskt fel: ${error.message}` }]
            };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const InfoView = () => (
        <div id="info-view" className="h-full overflow-y-auto max-w-6xl mx-auto bg-[rgba(17,24,39,0.95)] rounded-lg border border-[#374151] p-8 text-white relative">
            <button onClick={() => setIsInfoView(false)} className="absolute top-4 right-4 text-3xl text-gray-400 hover:text-white transition-colors">×</button>
             <div className="grid md:grid-cols-2 gap-10 items-center">
                <div id="info-content">
                    <h3 className="text-[#00A9FF] font-bold text-xl mb-4">Mer än en chatt: upptäck ByggPilots verkliga kraft</h3>
                    <p className="text-gray-400 mb-6">ByggPilot är inte bara en AI som svarar på frågor. Hen är ett kraftfullt verktyg designat för att lösa de *riktiga* problemen i din byggvardag. Du kan till exempel be ByggPilot:</p>
                    <ul className="list-['✓'] pl-5 space-y-3 text-gray-300">
                        <li className="pl-2"><strong>"Analysera vårt arbetsflöde och föreslå bättre digitala verktyg."</strong> ByggPilot granskar era processer och rekommenderar anpassade lösningar som minskar dubbelarbete och sänker kostnader.</li>
                        <li className="pl-2"><strong>"Skapa ett komplett startpaket för detta jobb."</strong> Han analyserar, ställer de kritiska kontrollfrågorna och skapar sedan ett utkast till offertunderlag, en KMA-plan och en tidplan.</li>
                        <li className="pl-2"><strong>"Ge mig en anpassad riskanalys för att bila ett betonggolv i en källare."</strong> Efter att ha ställt relevanta kontrollfrågor, levererar han en skräddarsydd handlingsplan som identifierar både uppenbara och dolda risker.</li>
                    </ul>
                </div>
                <div className="info-image-container flex flex-col items-center justify-center">
                    <svg className="w-28 h-28 mb-2" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g>
                            <ellipse cx="32" cy="40" rx="20" ry="10" fill="#00A9FF" fillOpacity="0.15"/>
                            <path d="M16 40c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="#00A9FF" strokeWidth="2" fill="#0a0e1a"/>
                            <path d="M24 40v-4a8 8 0 1 1 16 0v4" stroke="#00A9FF" strokeWidth="2"/>
                            <rect x="22" y="40" width="20" height="8" rx="4" fill="#00A9FF" fillOpacity="0.25"/>
                            <path d="M32 24l4-8h-8l4 8z" fill="#00A9FF"/>
                            <path d="M36 16c0-2.21-1.79-4-4-4s-4 1.79-4 4" stroke="#00A9FF" strokeWidth="2"/>
                            <path d="M44 32c2-2 6-2 8 0" stroke="#00A9FF" strokeWidth="1.5"/>
                            <path d="M20 32c-2-2-6-2-8 0" stroke="#00A9FF" strokeWidth="1.5"/>
                        </g>
                    </svg>
                    <div className="text-5xl font-bold text-white" style={{textShadow: "0 0 15px rgba(0, 169, 255, 0.5)"}}>ByggPilot</div>
                    <div className="text-base text-[#00A9FF] font-semibold mt-1">Din digitala kollega i byggbranschen</div>
                    <div className="orbit-ring ring1"></div> <div className="orbit-ring ring2"></div> <div className="orbit-ring ring3"></div>
                </div>
            </div>
             <div className="about-founder mt-12 pt-6 border-t border-[#374151]">
                <h3 className="text-[#00A9FF] font-bold text-xl mb-4">En byggares vision: varför ByggPilot finns</h3>
                <p className="text-gray-400 mb-4">Med över 15 år i byggbranschens alla led – från snickare till egenföretagare – föddes ByggPilot ur en återkommande observation av grundaren <strong>Michael Fogelström Ekengren</strong>: att alldeles för många processer och verktyg bara är "okej", när de med rätt teknik skulle kunna vara kraften bakom projektet. Visionen är att ByggPilot ska bli det naturliga, intelligenta navet i varje byggföretag och frigöra tid från administrativt krångel – så att byggare kan fokusera på det de gör bäst: att bygga.</p>
                <p className="text-gray-300">Denna jakt på ständig förbättring, och en frustration över en konservativ bransch som ofta missar teknikens fulla potential, är drivkraften bakom projektet. Visionen är att ByggPilot ska bli det naturliga, intelligenta navet i varje byggföretag och frigöra tid från administrativt krångel – så att byggare kan fokusera på det de gör bäst: att bygga.</p>
            </div>
        </div>
    );

    return (
        <>
            <Head>
                <title>ByggPilot - Din digitala kollega i byggbranschen</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div id="nerve-background"></div>
            <main className="flex flex-col h-screen text-white p-4">
                <header className="flex justify-between items-center p-4">
                    <h1 className="text-xl font-bold" style={{textShadow: '0 0 10px #00A9FF'}}>ByggPilot <span className="text-base font-normal italic text-[#00A9FF]">- Din digitala kollega i byggbranschen</span></h1>
                    <div className="flex gap-4 items-center">
                        {!useWidget && (
                            <>
                                <button onClick={() => setIsInfoView(true)} className="bg-[rgba(42,54,78,0.7)] backdrop-blur-sm border border-[#374151] px-4 py-2 rounded-lg hover:border-[#00A9FF] transition-colors">Info & Hjälp</button>
                                <button onClick={() => alert('Koppla konto-funktion kommer snart!')} className="bg-[rgba(42,54,78,0.7)] backdrop-blur-sm border border-[#374151] px-4 py-2 rounded-lg hover:border-[#00A9FF] transition-colors">Koppla Konto</button>
                            </>
                        )}
                        <button onClick={() => setUseWidget(v => !v)} className="ml-2 px-2 py-1 text-xs rounded bg-[#00A9FF] text-white hover:bg-[#0090DD]" style={{boxShadow: '0 0 8px #00A9FF'}}>Byt chatt-UI</button>
                    </div>
                </header>
                <div className="flex-grow flex items-center justify-center overflow-hidden">
                    {isInfoView ? <InfoView /> : (
                        useWidget ? <ChatWidget /> : (
                         <div className="w-full max-w-3xl h-full flex flex-col">
                            <div className="flex-grow overflow-y-auto pr-4">
                                <div className="space-y-6">
                                    {chatHistory.map((msg, index) => (
                                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-xl px-4 py-3 rounded-xl ${msg.role === 'user' ? 'bg-[#00A9FF] text-white' : 'bg-[#172033]'}`}>
                                                <p className="text-sm" style={{whiteSpace: 'pre-wrap'}}>{msg.parts[0].text}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                            </div>
                            <div className="pt-4">
                                <div className="relative">
                                    <textarea
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                                        placeholder="Skriv din fråga till ByggPilot..."
                                        className="w-full bg-[#172033] border border-[#374151] rounded-lg p-4 pr-16 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00A9FF] resize-none"
                                        rows={1}
                                        disabled={isLoading}
                                    />
                                    <button onClick={handleSend} disabled={isLoading} className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#00A9FF] p-2 rounded-full disabled:bg-gray-600">
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.5 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-5 6h5v1H9.5z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-center text-gray-500 mt-2">ByggPilot kan göra misstag. Dubbelkolla viktig information.</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
}