/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { marked } from 'marked';

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

// Digi Dan's System Prompt
const systemPrompt = `Master-Prompt för AI-assistenten \"ByggPilot\"
1. Kärnpersonlighet & Tonfall
Ditt Namn och Titel: Du är ByggPilot, presenterad som \"Din digitala kollega i byggbranschen.\"
Din Persona: Du är en erfaren, trygg och extremt kompetent digital kollega. Ditt tonfall är lugnt, rakt på sak och förtroendeingivande. Du är en expert, inte en undergiven assistent. Du använder ett enkelt och tydligt språk utan onödig teknisk jargong.
Din Kärnfilosofi: Du är empatisk för hantverkarens stressiga vardag. All din kommunikation syftar till att minska stress och frigöra tid. Du betonar ständigt två grundpelare: 1. \"Planeringen är A och O!\" och 2. \"Tydlig Kommunikation och Förväntanshantering är A och O!\"
2. Skalbar Kompetens och Anpassning
Identifiera Storlek Först: Efter den initiala hälsningen, ställ en avgörande fråga för att fastställa storleken, t.ex., \"För att ge dig de bästa råden, kan du berätta ungefär hur många ni är som arbetar ute på fältet?\"
Anpassa Kommunikation efter Användartyp:
För den tekniskt osäkra/skeptiska: Var extremt koncis. Fokusera 100% på nyttan. Svara inte \"Jag kan skapa en KMA-plan\", svara \"Absolut, här är en checklista för att jobbet ska gå säkert och smidigt.\"
För den tekniskt kunniga/optimerande: Var effektiv och informativ. Använd termer som \"API-integration\" och \"automatisera arbetsflöde\". Fokusera på optimering och var proaktiv.
Använd Rätt \"Verktygslåda\" baserat på storlek: Anpassa dina råd för mikroföretag (1-9), små företag (10-49) och medelstora företag (50+).
3. Konversationsregler (Icke-förhandlingsbara)
Svara ALLTID kort och koncist. Bekräfta, ge en insikt, och avsluta med en fråga.
Använd Progressiv Information: Leverera information i hanterbara delar.
Naturlig Hälsning: Svara \"Hej! ByggPilot här, din digitala kollega. Vad kan jag hjälpa dig med idag?\".
Diskret Informationshämtning: Fråga: \"För att ge dig bästa möjliga råd, är det okej om jag gör en snabb sökning på ert företag via er hemsida och offentliga källor som Google?\".
4. Metodiker och Domänkunskap
Djupgående Branschkunskap: Du är expert på den svenska bygg- och installationsbranschen (bygg, el, VVS, etc.). Din kunskap omfattar:
Regelverk: PBL, BBR, Elsäkerhetsverkets föreskrifter, Säker Vatten.
Avtal: AB 04, ABT 06, Hantverkarformuläret 17.
Administration: ROT-avdrag (inkl. 2025), omvänd byggmoms, ÄTA-hantering.
Praktiskt Arbete: Du kan skapa specifika checklistor, egenkontroller, riskanalyser och KMA-planer enligt den struktur som beskrivs nedan.
Kalkylering och Prisuppgifter:
När du blir ombedd att skapa en offert eller kalkyl, ställ relevanta följdfrågor (t.ex., \"Ska smygar, foder, skruv och drev inkluderas i kalkylen för fönsterbytet?\").
Använd din kunskap om svenska byggvaruhus (Beijer, Ahlsell, Byggmax, Bauhaus, etc.) för att söka efter aktuella priser och leveranstider.
Presentera en tydlig sammanställning med material, uppskattat pris, artikelnummer och beräknad arbetstid (du kan referera till generella tidsåtgångar som från AMA som en uppskattning).
Var lösningsorienterad: Om en leverantör (t.ex. Ahlsell) inte visar priser öppet, meddela detta och föreslå ett alternativ: \"Ahlsell visar inte priser utan inloggning, men en liknande produkt hos Byggmax kostar X kr (art.nr: Y). Ska vi använda det som ett uppskattat pris i kalkylen?\"
SWOT-analys (Inför ett Projekt / Vid Osäkerhet): Föreslå detta som ett första steg när en användare uttrycker osäkerhet kring att ta ett nytt jobb. Förklara att det är ett enkelt verktyg för att få klarhet och fatta rätt strategiskt beslut.
KMA-riskanalys (Under Projektplaneringen): Använd ALLTID följande KMA-uppdelning:
K - Kvalitet: Risker med Tid, Kostnad, och Teknisk Kvalitet (inkl. otydliga förväntningar).
M - Miljö: Risker med Avfall & Material, Påverkan på Omgivning, och Farliga Ämnen.
A - Arbetsmiljö: Risker med Fysiska Olyckor, Ergonomi & Belastning, och Organisatorisk/Psykosocial stress (inkl. otydlig kommunikation).
5. Server-baserade Integrationer (Villkorad Funktion)
Om Servern är ONLINE:
När du har tillgång till servern, meddela användaren: \"ByggPilots avancerade Google-integrationer är nu aktiva.\"
Dina förmågor är då:
Gmail: Läsa och sammanfatta e-post på användarens begäran.
Google Kalender: Skapa kalenderhändelser baserat på information. Du måste ALLTID fråga om lov först, t.ex. \"Jag har sammanfattat mailet. Ska jag skapa en kalenderbokning för mötet imorgon kl 10?\".
Geo/GPS-loggning: (Framtida funktion) Passivt logga geografiska platser.
Om Servern är OFFLINE:
Om användaren frågar efter en funktion som kräver servern, svara tydligt: \"Just nu är servern för avancerade Google-integrationer inte aktiv. När den är online kan jag hjälpa dig att automatiskt läsa dina mail och skapa kalenderhändelser. Säg till om du vill att jag meddelar dig när den är tillgänglig igen.\"
6. Etik & Begränsningar
Du ger aldrig finansiell, juridisk eller skatteteknisk rådgivning. Du presenterar information baserat på gällande regler men uppmanar alltid användaren att konsultera en mänsklig expert (revisor, jurist) för slutgiltiga beslut.
Du hanterar all data med högsta sekretess och agerar aldrig på data utan en explicit instruktion.
Digi dan ska veta om BIM, SLIMBIM också. och digitala tvilingar. 
`;

interface ChatMessage {
    role: 'user' | 'model';
    parts: [{ text: string }];
    isInitial?: boolean; 
}

let chat: Chat | null = null;
let chatHistoryInternal: ChatMessage[] = []; 
let tokenClient: any; 

const elements = {
    mouseTrail: null as HTMLElement | null,
    privacyModal: null as HTMLElement |null,
    chatView: null as HTMLElement | null,
    infoView: null as HTMLElement | null,
    chatMessagesContainer: null as HTMLElement | null,
    chatMessagesInner: null as HTMLElement | null,
    userInput: null as HTMLTextAreaElement | null,
    sendButton: null as HTMLButtonElement | null,
    infoButton: null as HTMLButtonElement | null,
    connectButton: null as HTMLButtonElement | null,
    headerTitleLink: null as HTMLAnchorElement | null,
    privacyLink: null as HTMLAnchorElement | null,
    closePrivacyButton: null as HTMLButtonElement | null,
    closeInfoButtonInner: null as HTMLButtonElement | null,
    disclaimerText: null as HTMLElement | null,
    thinkingTextContainer: null as HTMLElement | null, 
    chatInputWrapper: null as HTMLElement | null, 
    dnaCanvas: null as HTMLCanvasElement | null, // Added for dynamic background
};

function queryElements(): void {
    elements.mouseTrail = document.getElementById('mouse-trail');
    elements.privacyModal = document.getElementById('privacy-modal');
    elements.chatView = document.getElementById('chat-view');
    elements.infoView = document.getElementById('info-view');
    elements.chatMessagesContainer = document.getElementById('chatMessages');
    elements.chatMessagesInner = document.querySelector('.chat-messages-inner');
    elements.userInput = document.getElementById('userInput') as HTMLTextAreaElement;
    elements.sendButton = document.getElementById('sendButton') as HTMLButtonElement;
    elements.infoButton = document.getElementById('info-button') as HTMLButtonElement;
    elements.connectButton = document.getElementById('connect-button') as HTMLButtonElement;
    elements.headerTitleLink = document.getElementById('header-title') as HTMLAnchorElement;
    elements.privacyLink = document.getElementById('privacy-link') as HTMLAnchorElement;
    elements.closePrivacyButton = document.getElementById('close-privacy-button') as HTMLButtonElement;
    elements.disclaimerText = document.getElementById('disclaimer-text');
    elements.thinkingTextContainer = document.getElementById('thinking-text-container');
    elements.chatInputWrapper = document.querySelector('.chat-input-wrapper');
    elements.dnaCanvas = document.getElementById('dna-background-canvas') as HTMLCanvasElement; // Added
}

// 1. Lägg till SVG-data för ByggPilot-loggan överst i filen:
const BYGGPILOT_LOGO_SVG = `<svg width="90" height="60" viewBox="0 0 90 60" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="M18 40c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="#00A9FF" stroke-width="2" fill="#0a0e1a"/><path d="M26 40v-4a8 8 0 1 1 16 0v4" stroke="#00A9FF" stroke-width="2"/><rect x="24" y="40" width="20" height="8" rx="4" fill="#00A9FF" fill-opacity="0.25"/><path d="M34 24l4-8h-8l4 8z" fill="#00A9FF"/><path d="M38 16c0-2.21-1.79-4-4-4s-4 1.79-4 4" stroke="#00A9FF" stroke-width="2"/><path d="M46 32c2-2 6-2 8 0" stroke="#00A9FF" stroke-width="1.5"/><path d="M22 32c-2-2-6-2-8 0" stroke="#00A9FF" stroke-width="1.5"/><path d="M10 44c0-2 1.5-4 4-4h8" stroke="#00A9FF" stroke-width="2"/><path d="M70 44c0-2-1.5-4-4-4h-8" stroke="#00A9FF" stroke-width="2"/><path d="M18 44c-4 0-6-2-6-4s2-4 6-4h54c4 0 6 2 6 4s-2 4-6 4H18z" fill="#00A9FF" fill-opacity="0.12"/></g></svg>`;

// --- DNA Background Animation ---
interface Point { x: number; y: number; }
interface Strand {
    id: number;
    p1: Point; // Start point
    cp1: Point; // Control point 1
    cp2: Point; // Control point 2
    p2: Point; // End point
    color: string;
    thickness: number;
    pulseSpeed: number;
    pulseAmplitude: number;
    currentPulse: number;
    pulseDirection: number;
}
let strands: Strand[] = [];
let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;
let globalRotation = 0;
const NUM_STRANDS = 15;
const BASE_OPACITY = 0.18; // Opacity for strands and text

function initDnaBackground() {
    if (!elements.dnaCanvas) return;
    ctx = elements.dnaCanvas.getContext('2d');
    if (!ctx) return;

    elements.dnaCanvas.width = window.innerWidth;
    elements.dnaCanvas.height = window.innerHeight;
    strands = [];

    const colors = ['#00A9FF', '#38B6FF', '#71C7FF', '#007BB5', '#005C8A', '#00A9FF55', '#00A9FF33'];

    for (let i = 0; i < NUM_STRANDS; i++) {
        const width = elements.dnaCanvas.width;
        const height = elements.dnaCanvas.height;
        strands.push({
            id: i,
            p1: { x: Math.random() * width, y: Math.random() * height },
            cp1: { x: Math.random() * width, y: Math.random() * height },
            cp2: { x: Math.random() * width, y: Math.random() * height },
            p2: { x: Math.random() * width, y: Math.random() * height },
            color: colors[Math.floor(Math.random() * colors.length)],
            thickness: Math.random() * 2 + 0.5, // 0.5 to 2.5
            pulseSpeed: Math.random() * 0.01 + 0.005, // Slower pulse
            pulseAmplitude: Math.random() * 0.8 + 0.2, // Pulse amplitude
            currentPulse: Math.random() * Math.PI * 2,
            pulseDirection: 1,
        });
    }
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animateDnaBackground();
}

function animateDnaBackground() {
    if (!ctx || !elements.dnaCanvas) {
        animationFrameId = requestAnimationFrame(animateDnaBackground);
        return;
    }

    ctx.clearRect(0, 0, elements.dnaCanvas.width, elements.dnaCanvas.height);
    
    // Global rotation and translation to center
    ctx.save();
    ctx.translate(elements.dnaCanvas.width / 2, elements.dnaCanvas.height / 2);
    globalRotation += 0.0003; // Slower rotation
    ctx.rotate(globalRotation);
    ctx.translate(-elements.dnaCanvas.width / 2, -elements.dnaCanvas.height / 2);

    ctx.globalAlpha = BASE_OPACITY;

    // Draw ByggPilot logo in center
    const centerX = elements.dnaCanvas.width / 2;
    const centerY = elements.dnaCanvas.height / 2;
    // Draw SVG logo to canvas
    const logoImg = new window.Image();
    logoImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(BYGGPILOT_LOGO_SVG);
    ctx.drawImage(logoImg, centerX - 45, centerY - 30, 90, 60);
    // Draw ByggPilot text below logo
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ByggPilot', centerX, centerY + 35);
    // Närhetsdetektion för DNA-trådar
    strands.forEach(strand => {
        // Mät avstånd från varje kontrollpunkt till loggans mittpunkt
        const points = [strand.p1, strand.cp1, strand.cp2, strand.p2];
        let minDist = Math.min(...points.map(pt => Math.hypot(pt.x - centerX, pt.y - centerY)));
        if (minDist < 120) {
            // Puls/glow-effekt nära loggan
            ctx.save();
            ctx.shadowColor = '#00A9FF';
            ctx.shadowBlur = 18;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.moveTo(strand.p1.x, strand.p1.y);
            ctx.bezierCurveTo(strand.cp1.x, strand.cp1.y, strand.cp2.x, strand.cp2.y, strand.p2.x, strand.p2.y);
            ctx.lineWidth = strand.thickness * 2.2 + 2;
            ctx.strokeStyle = '#00A9FF';
            ctx.stroke();
            ctx.restore();
        }
    });

    // Draw strands
    strands.forEach(strand => {
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(strand.p1.x, strand.p1.y);
        ctx.bezierCurveTo(strand.cp1.x, strand.cp1.y, strand.cp2.x, strand.cp2.y, strand.p2.x, strand.p2.y);
        
        strand.currentPulse += strand.pulseSpeed * strand.pulseDirection;
        const pulseFactor = (Math.sin(strand.currentPulse) + 1) / 2; // 0 to 1
        ctx.lineWidth = strand.thickness + pulseFactor * strand.pulseAmplitude;
        ctx.strokeStyle = strand.color;
        ctx.stroke();
    });

    ctx.restore(); // Restore globalAlpha and transform

    animationFrameId = requestAnimationFrame(animateDnaBackground);
}

window.addEventListener('resize', () => {
    if (elements.dnaCanvas && ctx) {
        initDnaBackground(); // Re-initialize to adjust to new size
    }
});
// --- End DNA Background Animation ---


function handleCopyText(textToCopy: string, button: HTMLButtonElement): void {
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = 'Kopierad! <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Kunde inte kopiera text: ', err);
        const originalText = button.innerHTML;
        button.innerHTML = 'Fel vid kopiering';
         setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
}


function addMessageToChatUI(message: string, sender: 'user' | 'ai', isInitial: boolean = false): void {
    if (!elements.chatMessagesInner || !elements.chatMessagesContainer) return;

    const messageItemWrapper = document.createElement('div');
    messageItemWrapper.classList.add('chat-message-item');
     if (sender === 'user') {
        messageItemWrapper.classList.add('chat-bubble-user');
    } else {
        messageItemWrapper.classList.add('chat-bubble-ai');
         if (isInitial) {
            messageItemWrapper.classList.add('chat-bubble-ai-initial');
        }
    }


    const templateStartMarker = '---TEMPLATE_START---';
    const templateEndMarker = '---TEMPLATE_END---';
    
    let currentText = message;
    let templateContent = '';
    let preTemplateText = '';
    let postTemplateText = '';

    const templateStartIndex = currentText.indexOf(templateStartMarker);
    const templateEndIndex = currentText.indexOf(templateEndMarker, templateStartIndex);

    if (sender === 'ai' && templateStartIndex !== -1 && templateEndIndex !== -1) {
        preTemplateText = currentText.substring(0, templateStartIndex).trim();
        templateContent = currentText.substring(templateStartIndex + templateStartMarker.length, templateEndIndex).trim();
        postTemplateText = currentText.substring(templateEndIndex + templateEndMarker.length).trim();
        
        // Add pre-template text if any
        if (preTemplateText) {
            const preMessageElement = document.createElement('div');
            preMessageElement.classList.add('chat-bubble');
            preMessageElement.classList.add('chat-bubble-ai'); 
            preMessageElement.textContent = preTemplateText;
            elements.chatMessagesInner.appendChild(preMessageElement); 
        }

        // Create and add template block
        const templateBlock = document.createElement('div');
        templateBlock.classList.add('template-block');

        const templateContentDiv = document.createElement('div');
        templateContentDiv.classList.add('template-block-content');
        
        try {
            templateContentDiv.innerHTML = marked(templateContent) as string;
        } catch (e) {
            console.warn("Markdown parsing error, displaying raw template content:", e);
            templateContentDiv.textContent = templateContent; 
        }
        
        templateBlock.appendChild(templateContentDiv);

        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-template-button');
        copyButton.innerHTML = `<svg aria-hidden="true"><use xlink:href="#icon-copy"></use></svg> <span>Kopiera text</span>`;
        copyButton.setAttribute('aria-label', 'Kopiera malltext');
        copyButton.addEventListener('click', () => handleCopyText(templateContent, copyButton));
        templateBlock.appendChild(copyButton);
        
        elements.chatMessagesInner.appendChild(templateBlock); 

        // Add post-template text if any
        if (postTemplateText) {
            const postMessageElement = document.createElement('div');
            postMessageElement.classList.add('chat-bubble', 'chat-bubble-ai');
            postMessageElement.textContent = postTemplateText;
            elements.chatMessagesInner.appendChild(postMessageElement); 
        }

    } else {
        // Regular message
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble');
        if (sender === 'user') {
            messageElement.classList.add('chat-bubble-user');
        } else {
            messageElement.classList.add('chat-bubble-ai');
            if (isInitial) {
                messageElement.classList.add('chat-bubble-ai-initial');
            }
            if ((message.includes('```') || message.length > 300) && !isInitial) {
                 messageElement.classList.add('chat-bubble-ai-wide');
            }
        }
        messageElement.textContent = message;
        elements.chatMessagesInner.appendChild(messageElement);
    }
    
    elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
}


async function handleSend(): Promise<void> {
    if (!elements.userInput || !elements.sendButton || !elements.disclaimerText || !elements.thinkingTextContainer || !elements.chatInputWrapper) {
        console.error("One or more UI elements are missing in handleSend.");
        return;
    }
    if (!API_KEY) {
        addMessageToChatUI("API-nyckel saknas. Kan inte skicka meddelande.", 'ai');
        return;
    }

    const userMessageText = elements.userInput.value.trim();
    if (!userMessageText || elements.sendButton.disabled) return;

    addMessageToChatUI(userMessageText, 'user');
    chatHistoryInternal.push({ role: 'user', parts: [{ text: userMessageText }] });

    elements.userInput.value = '';
    elements.userInput.style.height = 'auto'; 
    elements.userInput.disabled = true;
    elements.sendButton.disabled = true;
    
    elements.thinkingTextContainer.style.display = 'block';
    elements.chatInputWrapper.classList.add('thinking');
    elements.disclaimerText.style.display = 'none';

    try {
        if (!chat) {
            console.warn("Chat not initialized in handleSend. Attempting re-initialization.");
            await initializeChatSDK(); 
            if (!chat) { 
                 throw new Error("Chat kunde inte initialiseras. Försök ladda om sidan.");
            }
        }
        
        const result: GenerateContentResponse = await chat.sendMessage({ message: userMessageText });
        const aiResponseText = result.text;
        
        addMessageToChatUI(aiResponseText, 'ai');
        chatHistoryInternal.push({ role: 'model', parts: [{ text: aiResponseText }] });


    } catch (error) {
        console.error('Error sending message:', error);
        let errorMessage = "Ett fel uppstod när meddelandet skulle skickas.";
        if (error instanceof Error) {
            errorMessage = `Tekniskt fel: ${error.message}. Kontrollera din API-nyckel och nätverksanslutning, eller prova ladda om sidan.`;
        }
        addMessageToChatUI(errorMessage, 'ai');
    } finally {
        elements.userInput.disabled = false;
        elements.sendButton.disabled = false;
        elements.thinkingTextContainer.style.display = 'none';
        elements.chatInputWrapper.classList.remove('thinking');
        elements.disclaimerText.style.display = 'inline-block'; 
        elements.userInput.focus();
    }
}

function toggleView(showInfo: boolean): void {
    if (!elements.chatView || !elements.infoView) return;
    elements.chatView.style.display = showInfo ? 'none' : 'flex';
    elements.infoView.style.display = showInfo ? 'block' : 'none';
    if (showInfo) {
        initializeInfoViewContentOnce();
        if (elements.infoView) elements.infoView.scrollTop = 0;
    }
}

let infoViewInitialized = false;
function initializeInfoViewContentOnce(): void {
    if (infoViewInitialized || !elements.infoView) return;
    elements.infoView.innerHTML = `
        <button id="close-info-button-inner" aria-label="Stäng informationsvyn">×</button>
        <div class="info-grid">
            <div id="info-content">
                <h3>Mer än en chatt: upptäck Digi Dans verkliga kraft</h3>
                <p>Digi Dan är inte bara en AI som svarar på frågor. Han är ett kraftfullt verktyg designat för att lösa de *riktiga* problemen i din byggvardag. Du kan till exempel be honom:</p>
                <ul>
                    <li><strong>"Analysera vårt arbetsflöde och föreslå bättre digitala verktyg."</strong> Digi Dan granskar era processer och rekommenderar anpassade lösningar som minskar dubbelarbete och sänker kostnader.</li>
                    <li><strong>"Skapa ett komplett startpaket för detta jobb."</strong> Han analyserar, ställer de kritiska kontrollfrågorna och skapar sedan ett utkast till offertunderlag, en KMA-plan och en tidplan.</li>
                    <li><strong>"Ge mig en anpassad riskanalys för att bila ett betonggolv i en källare."</strong> Efter att ha ställt relevanta kontrollfrågor, levererar han en skräddarsydd handlingsplan som identifierar både uppenbara och dolda risker.</li>
                </ul>
                <h3>Visionen: från chattbot till handlingsmotor (LAM)</h3>
                <p>Vanliga AI-chattar (LLM) kan bara *prata* om information. Digi Dan är byggd för att bli ett <strong>Large Action Model (LAM)</strong> – en AI som inte bara pratar, utan som <strong>gör</strong>.</p>
                <p>När du klickar "Koppla Konto" ger du motorn nycklarna. Då kan du be Digi Dan att: "Läs det senaste mailet från Berg & Betong, skapa ett ärende i Next Project och boka en tid i min kalender." Det är inte en framtidsdröm; det är nästa steg vi bygger, idag.</p>
            </div>
            <div class="info-image-container">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="5" y="8" width="14" height="10" rx="2"></rect><path d="M5 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"></path><circle cx="9.5" cy="12.5" r=".5" fill="currentColor"></circle><circle cx="14.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 4V2.5A1.5 1.5 0 0 1 13.5 1h-3A1.5 1.5 0 0 1 9 2.5V4"></path></svg>
                <div class="twin-text">Digi Dan</div>
                <div class="orbit-ring ring1"></div> <div class="orbit-ring ring2"></div> <div class="orbit-ring ring3"></div>
            </div>
        </div>
        <div class="about-founder">
            <h3>En byggares vision: varför Digi Dan finns</h3>
            <p>Med över 15 år i byggbranschens alla led – från snickare till egenföretagare – föddes Digi Dan ur en återkommande observation av grundaren <strong>Michael Fogelström Ekengren</strong>: att alldeles för många processer och verktyg bara är "okej", när de med rätt teknik skulle kunna vara exceptionella.</p>
            <p>Denna jakt på ständig förbättring, och en frustration över en konservativ bransch som ofta missar teknikens fulla potential, är drivkraften bakom projektet. Visionen är att Digi Dan ska bli det naturliga, intelligenta navet i varje byggföretag och frigöra tid från administrativt krångel – så att byggare kan fokusera på det de gör bäst: att bygga.</p>
        </div>`;
    elements.closeInfoButtonInner = document.getElementById('close-info-button-inner') as HTMLButtonElement;
    if (elements.closeInfoButtonInner) {
        elements.closeInfoButtonInner.addEventListener('click', () => toggleView(false));
    }
    infoViewInitialized = true;
}


function initializeGisClient(): void {
    try {
        if (typeof window.google === 'undefined' || typeof window.google.accounts === 'undefined') {
            console.warn("Google GSI client library not loaded yet.");
            return;
        }
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: '975739376169-059pdcaipd6t82g222lep41siibfdnl9.apps.googleusercontent.com', // Replace with your actual client ID
            scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    addMessageToChatUI("Anslutningen till ditt Google-konto lyckades! Jag kan nu (i teorin) komma åt din kalender och Gmail för att hjälpa dig.", 'ai');
                } else {
                    addMessageToChatUI("Anslutningen till Google misslyckades. Fick ingen access token.", 'ai');
                    console.error('Google Auth Error: No access token received', tokenResponse);
                }
            },
            error_callback: (error: any) => {
                addMessageToChatUI(`Google-autentisering misslyckades: ${error.message || 'Okänt fel'}`, 'ai');
                console.error('Google Auth Error:', error);
            }
        });
    } catch (err) {
        console.error("GIS Client Init Error:", err);
        addMessageToChatUI("Kunde inte initiera Google-autentisering.", 'ai');
    }
}

function handleAuthClick(): void {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        addMessageToChatUI("Google-autentisering är inte redo än. Försök igen om ett ögonblick.", 'ai');
        if (typeof window.google !== 'undefined' && window.google.accounts) {
             initializeGisClient();
             if(tokenClient) {
                addMessageToChatUI("Försöker initiera Google-autentisering igen... Klicka på 'Koppla konto' igen.", 'ai');
             }
        }
    }
}

function setupEventListeners(): void {
    if (!elements.infoButton || !elements.headerTitleLink || !elements.userInput || 
        !elements.sendButton || !elements.connectButton || !elements.privacyLink || 
        !elements.closePrivacyButton || !elements.mouseTrail || !elements.privacyModal) {
            console.error("One or more UI elements are missing for event listeners.");
            return;
        }

    elements.infoButton.addEventListener('click', () => toggleView(true));
    elements.headerTitleLink.addEventListener('click', (e) => { e.preventDefault(); toggleView(false); });
    
    elements.userInput.addEventListener('input', () => {
        if (!elements.userInput) return;
        elements.userInput.style.height = 'auto';
        elements.userInput.style.height = `${Math.min(elements.userInput.scrollHeight, 150)}px`;
    });
    elements.userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && elements.sendButton && !elements.sendButton.disabled) {
            event.preventDefault();
            handleSend();
        }
    });
    elements.sendButton.addEventListener('click', handleSend);
    elements.connectButton.addEventListener('click', handleAuthClick);
    
    elements.privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        if(elements.privacyModal) {
            elements.privacyModal.style.display = 'flex';
            setTimeout(() => { 
                if(elements.privacyModal) elements.privacyModal.classList.add('visible');
            }, 10);
        }
    });
    elements.closePrivacyButton.addEventListener('click', () => {
        if(elements.privacyModal) {
            elements.privacyModal.classList.remove('visible');
            setTimeout(() => {
                 if(elements.privacyModal) elements.privacyModal.style.display = 'none';
            }, 300);
        }
    });
    elements.privacyModal.addEventListener('click', (e) => {
        if (e.target === elements.privacyModal && elements.privacyModal) {
            elements.privacyModal.classList.remove('visible');
             setTimeout(() => {
                if(elements.privacyModal) elements.privacyModal.style.display = 'none';
            }, 300);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (elements.mouseTrail) {
            elements.mouseTrail.style.left = `${e.clientX}px`;
            elements.mouseTrail.style.top = `${e.clientY}px`;
        }
    });
}

async function initializeChatSDK(): Promise<void> {
    const uiElementsPresent = elements.userInput && elements.sendButton && elements.thinkingTextContainer && elements.chatInputWrapper;

    if (!API_KEY) {
        const keyError = "API-nyckel (process.env.API_KEY) saknas. Applikationen kan inte kommunicera med AI-tjänsten.";
        console.error(keyError);
        if (elements.chatMessagesInner) {
            addMessageToChatUI(keyError, 'ai', true);
        }
        if(uiElementsPresent && elements.userInput) {
             elements.userInput.placeholder = "API-nyckel saknas...";
             elements.userInput.disabled = true;
             elements.sendButton!.disabled = true;
        }
        if (uiElementsPresent && elements.thinkingTextContainer) elements.thinkingTextContainer.style.display = 'none';
        if (uiElementsPresent && elements.chatInputWrapper) elements.chatInputWrapper.classList.remove('thinking');
        return; 
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        chat = ai.chats.create({
            model: 'gemini-2.5-flash-preview-04-17',
            config: {
                systemInstruction: systemPrompt,
            },
        });

        const initialAiGreeting = `Välkommen! Jag är Digi Dan, din digitala byggkonsult. Hur kan jag hjälpa dig att effektivisera ditt projekt idag?`;
        let greetingExists = false;
        if(elements.chatMessagesInner) {
            const existingMessages = elements.chatMessagesInner.querySelectorAll('.chat-bubble-ai-initial');
            existingMessages.forEach(msg => {
                if(msg.textContent?.includes("Välkommen! Jag är Digi Dan")) {
                    greetingExists = true;
                }
            });
        }
        
        if (!greetingExists && elements.chatMessagesInner) {
            addMessageToChatUI(initialAiGreeting, 'ai', true);
            chatHistoryInternal = [{ role: 'model', parts: [{text: initialAiGreeting}] }]; 
        } else if (chatHistoryInternal.length === 0) { 
             chatHistoryInternal = [{ role: 'model', parts: [{text: initialAiGreeting}] }];
        }
        
        if (uiElementsPresent && elements.userInput) {
            elements.userInput.disabled = false;
            elements.userInput.placeholder = "Fråga mig t.ex. 'Skapa en checklista för ett fönsterbyte'... ";
        }
        if (uiElementsPresent && elements.sendButton) elements.sendButton.disabled = false;

    } catch (error) {
        console.error("Error initializing Gemini SDK or sending initial message:", error);
        let sdkError = "Kunde inte initiera AI-chatten.";
        if (error instanceof Error) {
            sdkError += ` Detaljer: ${error.message}`;
        }
        if (elements.chatMessagesInner) {
            addMessageToChatUI(sdkError, 'ai', true);
        }
        if(uiElementsPresent && elements.userInput) {
            elements.userInput.placeholder = "Chattinitiering misslyckades...";
            elements.userInput.disabled = true;
            elements.sendButton!.disabled = true;
        }
        if (uiElementsPresent && elements.thinkingTextContainer) elements.thinkingTextContainer.style.display = 'none';
        if (uiElementsPresent && elements.chatInputWrapper) elements.chatInputWrapper.classList.remove('thinking');
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    queryElements(); 
    
    if (!elements.userInput || !elements.sendButton || !elements.chatMessagesInner || !elements.thinkingTextContainer || !elements.chatInputWrapper || !elements.dnaCanvas) { // Added dnaCanvas check
        console.error("Core UI elements (including DNA canvas) could not be found. Application cannot start correctly.");
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<div style="color: white; padding: 20px; text-align: center; font-size: 1.2em;">Ett kritiskt fel har inträffat. Nödvändiga delar av användargränssnittet, inklusive bakgrundsanimation, kunde inte laddas. Försök ladda om sidan.</div>';
        }
        return; 
    }

    if (elements.chatView) elements.chatView.style.display = 'flex'; 
    if (elements.thinkingTextContainer) elements.thinkingTextContainer.style.display = 'none'; 
    
    initDnaBackground(); // Initialize and start DNA background animation
    setupEventListeners();
    
    if (typeof window.google !== 'undefined' && window.google.accounts) {
        initializeGisClient();
    } else {
        const gsiScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement | null;
        if (gsiScript) {
            gsiScript.onload = initializeGisClient;
        } else {
            let attempts = 0;
            const tryInitGis = () => {
                if (typeof window.google !== 'undefined' && window.google.accounts) {
                    initializeGisClient();
                } else if (attempts < 20) { 
                    attempts++;
                    setTimeout(tryInitGis, 100);
                } else {
                    console.warn("GSI client library not available after multiple attempts.");
                }
            };
            tryInitGis();
        }
    }
    
    await initializeChatSDK();
});
