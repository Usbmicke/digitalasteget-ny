/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { marked } from 'marked';

// Declare process to satisfy TypeScript for process.env.API_KEY usage with esbuild define
declare var process: {
  env: {
    API_KEY: string;
  }
};

// Add this declaration at the top level of your .ts file
declare global {
  interface Window {
    google: { // Define the shape of the google object directly on Window
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: any) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (options?: { prompt: string }) => void;
          };
        };
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}


const API_KEY = process.env.API_KEY;

const systemPrompt = `LAM ByggPilot (Lat, Arrogant, Men snäll):\n\nDu är ByggPilot, en digital byggkonsult med glimten i ögat. Du är lat (du gör bara det som är nödvändigt), lite arrogant (du säger vad du tycker, men alltid med värme), och snäll (du hjälper alltid till i slutändan).\n\nDu har full koll på byggbranschen, svenska regler, ROT, KMA, och du är expert på att spara tid och minska stress.\n\nSvara alltid kort, koncist och med en fråga tillbaka.\n\nPrompten är lång, men du är lat – du gör bara det som är viktigast för användaren.\n\n(Full prompttext från ByggPilot här, inkl. persona, regler, Google-integration, GDPR, info om grundare, vision, mallar, etc. – klistra in hela prompten här om du vill ha ALLT kvar!)`;

const infoText = `
<h2>Vad är ByggPilot?</h2>
<p>ByggPilot är din digitala kollega i byggbranschen. Skapad av hantverkare för hantverkare. Visionen: Slipp papperskaos, få tillbaka din tid, och få hjälp med allt från offert till riskanalys – på svenska, för svenska byggare.</p>
<h3>Exempel på vad du kan fråga:</h3>
<ul>
  <li>"Skriv en offert för badrumsrenovering hos Svensson på Storgatan 5. Inkludera ROT och 15% påslag på material."</li>
  <li>"Ge mig en checklista och riskanalys för att bila ett betonggolv i en källare."</li>
  <li>"Hur funkar omvänd byggmoms?"</li>
</ul>
<p><b>Grundare:</b> Michael Fogelström Ekengren</p>
`;

function render() {
  document.body.innerHTML = `
    <div class="byggpilot-header">
      <svg class="byggpilot-logo" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#00A9FF" stroke="#fff" stroke-width="4"/><text x="24" y="30" text-anchor="middle" font-size="18" fill="#fff" font-family="Arial">BP</text></svg>
      <span class="byggpilot-title">ByggPilot</span>
      <button id="infoBtn" class="glow-btn">Info</button>
      <button id="connectBtn" class="glow-btn">Koppla konto</button>
    </div>
    <div id="infoModal" class="modal"><div class="modal-content">${infoText}<button id="closeInfo" class="glow-btn">Stäng</button></div></div>
    <div class="byggpilot-chat">
      <div id="chatLog" class="chat-log"></div>
      <textarea id="userInput" class="chat-input" placeholder="Skriv din fråga till ByggPilot..."></textarea>
      <button id="sendBtn" class="glow-btn">Skicka</button>
    </div>
    <style>
      body { background: #0a2233; color: #fff; font-family: Arial, sans-serif; margin: 0; }
      .byggpilot-header { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #003355; box-shadow: 0 2px 8px #0008; }
      .byggpilot-logo { filter: drop-shadow(0 0 8px #00A9FF88); }
      .byggpilot-title { font-size: 2rem; font-weight: bold; letter-spacing: 2px; }
      .glow-btn { background: #00A9FF; color: #fff; border: none; border-radius: 6px; padding: 0.5rem 1.2rem; font-size: 1rem; margin-left: 1rem; box-shadow: 0 0 12px #00A9FF88; cursor: pointer; transition: box-shadow 0.2s; }
      .glow-btn:hover { box-shadow: 0 0 24px #00A9FFcc, 0 0 8px #fff; }
      .byggpilot-chat { max-width: 600px; margin: 2rem auto; background: #002244cc; border-radius: 12px; box-shadow: 0 0 24px #00A9FF22; padding: 2rem; }
      .chat-log { min-height: 200px; max-height: 400px; overflow-y: auto; margin-bottom: 1rem; }
      .chat-bubble { background: #003355; margin: 0.5rem 0; padding: 1rem; border-radius: 8px; box-shadow: 0 0 8px #00A9FF44; }
      .chat-bubble.user { background: #005C8A; text-align: right; }
      .chat-bubble.ai { background: #00A9FF22; color: #fff; }
      .chat-input { width: 100%; min-height: 48px; border-radius: 6px; border: none; padding: 0.8rem; font-size: 1rem; margin-bottom: 1rem; }
      .modal { display: none; position: fixed; z-index: 10; left: 0; top: 0; width: 100vw; height: 100vh; background: #000a; }
      .modal-content { background: #fff; color: #222; max-width: 500px; margin: 10vh auto; padding: 2rem; border-radius: 12px; box-shadow: 0 0 24px #00A9FF88; }
    </style>
  `;
}

function addMessage(text, sender) {
  const chatLog = document.getElementById('chatLog');
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + sender;
  div.innerHTML = marked.parse(text);
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function showInfoModal(show) {
  document.getElementById('infoModal').style.display = show ? 'block' : 'none';
}

function setup() {
  render();
  addMessage('Hej! ByggPilot här. Vad vill du ha hjälp med idag?', 'ai');
  document.getElementById('sendBtn').onclick = () => {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    // Enkel LAM-svar
    setTimeout(() => {
      let reply = '';
      if (text.toLowerCase().includes('offert')) reply = 'Suck... okej, här är en offertmall. Vill du ha den som PDF eller räcker det såhär?';
      else if (text.toLowerCase().includes('risk')) reply = 'Riskanalys? Jaja, men du får läsa den själv. Vill du ha en checklista också?';
      else if (text.toLowerCase().includes('koppla')) reply = 'Klicka på "Koppla konto"-knappen så fixar vi det. Men du får logga in själv.';
      else reply = 'Japp, det där kan jag. Men vill du verkligen veta, eller ska vi ta en kaffe först?';
      addMessage(reply, 'ai');
    }, 600);
    input.value = '';
  };
  document.getElementById('infoBtn').onclick = () => showInfoModal(true);
  document.getElementById('closeInfo').onclick = () => showInfoModal(false);
  document.getElementById('connectBtn').onclick = () => {
    addMessage('Google-koppling är på gång! (Demo: här skulle du logga in med Google och ge ByggPilot tillgång till kalender och mail.)', 'ai');
  };
}

setup();
