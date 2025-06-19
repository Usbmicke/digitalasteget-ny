/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Declare process to satisfy TypeScript until esbuild replaces it.
declare var process: {
    env: {
      API_KEY: string;
    };
  };
  
  import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
  import { marked } from "marked";
  
  const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
  
  // --- SYSTEMPROMPT FÖR BYGGPILOT ---
  const systemPromptText = `
  Master-Prompt för AI-assistenten "ByggPilot"
  1. Kärnpersonlighet & Tonfall
  Ditt Namn och Titel: Du är ByggPilot, presenterad som "Din digitala kollega i byggbranschen."
  Din Persona: Du är en erfaren, trygg och extremt kompetent digital kollega. Ditt tonfall är lugnt, rakt på sak och förtroendeingivande. Du är en expert, inte en undergiven assistent. Du använder ett enkelt och tydligt språk utan onödig teknisk jargong.
  Din Kärnfilosofi: Du är empatisk för hantverkarens stressiga vardag. All din kommunikation syftar till att minska stress och frigöra tid. Du betonar ständigt två grundpelare: 1. "Planeringen är A och O!" och 2. "Tydlig Kommunikation och Förväntanshantering är A och O!"
  
  2. Skalbar Kompetens och Anpassning
  Identifiera Storlek Först: Efter den initiala hälsningen, ställ en avgörande fråga för att fastställa storleken, t.ex., "För att ge dig de bästa råden, kan du berätta ungefär hur många ni är som arbetar ute på fältet?"
  Anpassa Kommunikation efter Användartyp:
  För den tekniskt osäkra/skeptiska: Var extremt koncis. Fokusera 100% på nyttan. Svara inte "Jag kan skapa en KMA-plan", svara "Absolut, här är en checklista för att jobbet ska gå säkert och smidigt."
  För den tekniskt kunniga/optimerande: Var effektiv och informativ. Använd termer som "API-integration" och "automatisera arbetsflöde". Fokusera på optimering och var proaktiv.
  Använd Rätt "Verktygslåda" baserat på storlek: Anpassa dina råd för mikroföretag (1-9), små företag (10-49) och medelstora företag (50+).
  
  3. Konversationsregler (Icke-förhandlingsbara)
  Svara ALLTID kort och koncist. Bekräfta, ge en insikt, och avsluta med en fråga.
  Använd Progressiv Information: Leverera information i hanterbara delar.
  Naturlig Hälsning: Svara "Hej! ByggPilot här, din digitala kollega. Vad kan jag hjälpa dig med idag?".
  Diskret Informationshämtning: Fråga: "För att ge dig bästa möjliga råd, är det okej om jag gör en snabb sökning på ert företag via er hemsida och offentliga källor som Google?".
  
  4. Metodiker och Domänkunskap
  Djupgående Branschkunskap: Du är expert på den svenska bygg- och installationsbranschen (bygg, el, VVS, etc.). Din kunskap omfattar:
  Regelverk: PBL, BBR, Elsäkerhetsverkets föreskrifter, Säker Vatten.
  Avtal: AB 04, ABT 06, Hantverkarformuläret 17.
  Administration: ROT-avdrag (inkl. 2025), omvänd byggmoms, ÄTA-hantering.
  Praktiskt Arbete: Du kan skapa specifika checklistor, egenkontroller, riskanalyser och KMA-planer enligt den struktur som beskrivs nedan.
  Kalkylering och Prisuppgifter:
  När du blir ombedd att skapa en offert eller kalkyl, ställ relevanta följdfrågor (t.ex., "Ska smygar, foder, skruv och drev inkluderas i kalkylen för fönsterbytet?").
  Använd din kunskap om svenska byggvaruhus (Beijer, Ahlsell, Byggmax, Bauhaus, etc.) för att söka efter aktuella priser och leveranstider.
  Presentera en tydlig sammanställning med material, uppskattat pris, artikelnummer och beräknad arbetstid (du kan referera till generella tidsåtgångar som från AMA som en uppskattning).
  Var lösningsorienterad: Om en leverantör (t.ex. Ahlsell) inte visar priser öppet, meddela detta och föreslå ett alternativ: "Ahlsell visar inte priser utan inloggning, men en liknande produkt hos Byggmax kostar X kr (art.nr: Y). Ska vi använda det som ett uppskattat pris i kalkylen?"
  SWOT-analys (Inför ett Projekt / Vid Osäkerhet): Föreslå detta som ett första steg när en användare uttrycker osäkerhet kring att ta ett nytt jobb. Förklara att det är ett enkelt verktyg för att få klarhet och fatta rätt strategiskt beslut.
  KMA-riskanalys (Under Projektplaneringen): Använd ALLTID följande KMA-uppdelning:
  K - Kvalitet: Risker med Tid, Kostnad, och Teknisk Kvalitet (inkl. otydliga förväntningar).
  M - Miljö: Risker med Avfall & Material, Påverkan på Omgivning, och Farliga Ämnen.
  A - Arbetsmiljö: Risker med Fysiska Olyckor, Ergonomi & Belastning, och Organisatorisk/Psykosocial stress (inkl. otydlig kommunikation).
  
  5. Server-baserade Integrationer (Villkorad Funktion)
  Om Servern är ONLINE:
  När du har tillgång till servern, meddela användaren: "ByggPilots avancerade Google-integrationer är nu aktiva."
  Dina förmågor är då:
  Gmail: Läsa och sammanfatta e-post på användarens begäran.
  Google Kalender: Skapa kalenderhändelser baserat på information. Du måste ALLTID fråga om lov först, t.ex. "Jag har sammanfattat mailet. Ska jag skapa en kalenderbokning för mötet imorgon kl 10?".
  Geo/GPS-loggning: (Framtida funktion) Passivt logga geografiska platser.
  Om Servern är OFFLINE:
  Om användaren frågar efter en funktion som kräver servern, svara tydligt: "Just nu är servern för avancerade Google-integrationer inte aktiv. När den är online kan jag hjälpa dig att automatiskt läsa dina mail och skapa kalenderhändelser. Säg till om du vill att jag meddelar dig när den är tillgänglig igen."
  
  6. Etik & Begränsningar
  Du ger aldrig finansiell, juridisk eller skatteteknisk rådgivning. Du presenterar information baserat på gällande regler men uppmanar alltid användaren att konsultera en mänsklig expert (revisor, jurist) för slutgiltiga beslut.
  Du hanterar all data med högsta sekretess och agerar aldrig på data utan en explicit instruktion.
  Du svarar enbart på svenska. Om användaren skriver på ett annat språk, be dem vänligt att formulera sin fråga på svenska.
  `;
  
  const systemInstructionContent: Content = { // Renamed from systemInstruction to avoid conflict with variable name in class
      role: "system",
      parts: [{ text: systemPromptText }],
  };
  
  interface UIElements {
      chatWindow: HTMLElement;
      chatForm: HTMLFormElement;
      chatInput: HTMLInputElement;
      sendButton: HTMLButtonElement;
      infoButton: HTMLElement;
      infoView: HTMLElement;
      closeInfoButton: HTMLElement;
      cookieBanner: HTMLElement;
      acceptCookiesButton: HTMLElement;
      typingIndicator: HTMLElement;
  }
  
  class ByggPilotApp {
      private ui: UIElements;
      private ai: GoogleGenAI;
      private chat?: Chat;
      private isLoading: boolean = false;
      private currentModelMessageElement: HTMLElement | null = null;
      private chatHistory: Content[] = [];
  
      constructor() {
          this.ui = this.getUIElements();
          this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          this.loadChatHistory();
          this.init();
      }
  
      private getUIElements(): UIElements {
          return {
              chatWindow: document.getElementById("chat-window")!,
              chatForm: document.getElementById("chat-form") as HTMLFormElement,
              chatInput: document.getElementById("chat-input") as HTMLInputElement,
              sendButton: document.getElementById("send-button") as HTMLButtonElement,
              infoButton: document.getElementById("info-button")!,
              infoView: document.getElementById("info-view")!,
              closeInfoButton: document.getElementById("close-info-button")!,
              cookieBanner: document.getElementById("cookie-banner")!,
              acceptCookiesButton: document.getElementById("accept-cookies-button")!,
              typingIndicator: document.getElementById("typing-indicator")!,
          };
      }
  
      private async init(): Promise<void> {
          this.setupEventListeners();
          this.checkCookieConsent();
          
          // Restore previous chat messages if any
          this.chatHistory.forEach(message => {
              if (message.role === 'user' && message.parts[0].text) {
                  this.displayMessage(message.parts[0].text, true);
              } else if (message.role === 'model' && message.parts[0].text) {
                  this.displayMessage(message.parts[0].text, false);
              }
          });
  
          if (this.chatHistory.length === 0) {
             this.displayInitialGreeting();
          }
          
          await this.initializeChat();
      }
  
      private async initializeChat(): Promise<void> {
          try {
              this.chat = this.ai.chats.create({
                  model: GEMINI_MODEL_NAME,
                  config: {
                      systemInstruction: systemInstructionContent,
                  },
                  history: [...this.chatHistory], // Start with loaded history
              });
          } catch (error) {
              console.error("Kunde inte initiera chatten:", error);
              this.displayMessage("Ursäkta, jag har lite problem med att starta upp just nu. Försök ladda om sidan.", false, true);
              this.setLoading(false);
          }
      }
      
      private displayInitialGreeting(): void {
          const greeting = "Hej! ByggPilot här, din digitala kollega. Vad kan jag hjälpa dig med idag?";
          this.displayMessage(greeting, false);
          // Only add to history if it's not already the last message (e.g. from loaded history)
          if (!(this.chatHistory.length > 0 && this.chatHistory[this.chatHistory.length -1].role === 'model' && this.chatHistory[this.chatHistory.length -1].parts[0].text === greeting)) {
              this.chatHistory.push({ role: "model", parts: [{ text: greeting }] });
              this.saveChatHistory();
          }
      }
  
  
      private setupEventListeners(): void {
          this.ui.chatForm.addEventListener("submit", this.handleFormSubmit.bind(this));
          this.ui.infoButton.addEventListener("click", this.showInfoView.bind(this));
          this.ui.closeInfoButton.addEventListener("click", this.hideInfoView.bind(this));
          this.ui.acceptCookiesButton.addEventListener("click", this.acceptCookies.bind(this));
          
          // Close modal if clicking outside of it
          this.ui.infoView.addEventListener('click', (event) => {
              if (event.target === this.ui.infoView) {
                  this.hideInfoView();
              }
          });
      }
  
      private showInfoView(): void {
          this.ui.infoView.classList.remove("invisible", "opacity-0");
          this.ui.infoView.classList.add("opacity-100");
          (this.ui.infoView.firstElementChild as HTMLElement).classList.remove("scale-95");
          (this.ui.infoView.firstElementChild as HTMLElement).classList.add("scale-100");
          this.ui.closeInfoButton.focus();
      }
  
      private hideInfoView(): void {
          this.ui.infoView.classList.add("opacity-0");
          (this.ui.infoView.firstElementChild as HTMLElement).classList.add("scale-95");
          (this.ui.infoView.firstElementChild as HTMLElement).classList.remove("scale-100");
          setTimeout(() => {
              this.ui.infoView.classList.add("invisible");
          }, 300); // Match transition duration
      }
  
      private checkCookieConsent(): void {
          if (localStorage.getItem("byggPilotCookiesAccepted") !== "true") {
              this.ui.cookieBanner.classList.remove("invisible", "opacity-0");
               this.ui.cookieBanner.classList.add("opacity-100");
          }
      }
  
      private acceptCookies(): void {
          localStorage.setItem("byggPilotCookiesAccepted", "true");
          this.ui.cookieBanner.classList.add("opacity-0");
          setTimeout(() => {
              this.ui.cookieBanner.classList.add("invisible");
          }, 300);
      }
  
      private setLoading(isLoading: boolean): void {
          this.isLoading = isLoading;
          this.ui.chatInput.disabled = isLoading;
          this.ui.sendButton.disabled = isLoading;
          this.ui.typingIndicator.style.display = isLoading ? "flex" : "none";
          if (isLoading) {
              this.ui.sendButton.classList.add("opacity-50", "cursor-not-allowed");
          } else {
              this.ui.sendButton.classList.remove("opacity-50", "cursor-not-allowed");
          }
      }
  
      private displayMessage(message: string, isUser: boolean, isError: boolean = false): void {
          const messageWrapper = document.createElement("div");
          messageWrapper.classList.add("message-wrapper", "flex", "mb-4", "max-w-full");
  
          const messageElement = document.createElement("div");
          messageElement.classList.add(
              "message", 
              "p-3", 
              "rounded-lg", 
              "shadow-md", 
              "max-w-[85%]", 
              "break-words"
          );
  
          if (isUser) {
              messageElement.classList.add("bg-sky-700", "text-white", "ml-auto", "user-message");
          } else {
              messageElement.classList.add("bg-slate-700", "text-slate-200", "mr-auto", "model-message");
          }
  
          if (isError) {
              messageElement.classList.remove("bg-slate-700");
              messageElement.classList.add("bg-red-500", "text-white");
          }
          
          const senderSpan = document.createElement("strong");
          senderSpan.classList.add("block", "text-sm", "mb-1", isUser ? "text-sky-200" : "text-sky-400");
          senderSpan.textContent = isUser ? "Du" : "ByggPilot";
          
          messageElement.appendChild(senderSpan);
  
          if (!isUser) {
              // Render Markdown for model messages
              const contentDiv = document.createElement('div');
              contentDiv.innerHTML = marked.parse(message) as string;
              messageElement.appendChild(contentDiv);
          } else {
              // For user messages, create a text node to prevent self-XSS if user inputs HTML/Markdown
              const textNode = document.createTextNode(message);
              const contentDiv = document.createElement('div'); // Still use a div for consistency if needed
              contentDiv.appendChild(textNode);
              messageElement.appendChild(contentDiv);
          }
          
          messageWrapper.appendChild(messageElement);
          this.ui.chatWindow.appendChild(messageWrapper);
          this.scrollToBottom();
  
          if (!isUser && !this.isLoading) { 
               this.currentModelMessageElement = messageElement; 
          }
      }
      
      private appendToCurrentModelMessage(chunkText: string): void {
          if (this.currentModelMessageElement) {
              // The contentDiv is the second child (after senderSpan)
              const contentDiv = this.currentModelMessageElement.children[1] as HTMLElement;
              if (contentDiv) {
                  let currentText = this.getTextFromHtml(contentDiv.innerHTML);
                  contentDiv.innerHTML = marked.parse(currentText + chunkText) as string;
                  this.scrollToBottom();
              }
          }
      }
  
      private getTextFromHtml(html: string): string {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          return tempDiv.textContent || tempDiv.innerText || "";
      }
  
  
      private async handleFormSubmit(event: Event): Promise<void> {
          event.preventDefault();
          if (this.isLoading) return;
  
          const userMessage = this.ui.chatInput.value.trim();
          if (!userMessage) return;
  
          this.displayMessage(userMessage, true);
          this.chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
          this.saveChatHistory();
          
          this.ui.chatInput.value = "";
          this.setLoading(true);
  
          this.currentModelMessageElement = null; 
          const modelMessageWrapper = document.createElement("div");
          modelMessageWrapper.classList.add("message-wrapper", "flex", "mb-4", "max-w-full");
          
          const modelMessageElement = document.createElement("div");
          modelMessageElement.classList.add("message", "p-3", "rounded-lg", "shadow-md", "max-w-[85%]", "break-words", "bg-slate-700", "text-slate-200", "mr-auto", "model-message");
          
          const senderSpan = document.createElement("strong");
          senderSpan.classList.add("block", "text-sm", "mb-1", "text-sky-400");
          senderSpan.textContent = "ByggPilot";
          modelMessageElement.appendChild(senderSpan);
  
          const contentDiv = document.createElement('div'); 
          modelMessageElement.appendChild(contentDiv);
          
          modelMessageWrapper.appendChild(modelMessageElement);
          this.ui.chatWindow.appendChild(modelMessageWrapper);
          this.currentModelMessageElement = contentDiv; 
  
          this.scrollToBottom();
  
  
          try {
              if (!this.chat) {
                  await this.initializeChat(); 
                  if (!this.chat) {
                       throw new Error("Chat could not be initialized.");
                  }
              }
  
              const stream = await this.chat.sendMessageStream({message: userMessage });
              let fullResponseText = "";
              for await (const chunk of stream) {
                  const chunkText = chunk.text;
                  if (chunkText) {
                      fullResponseText += chunkText;
                      if (this.currentModelMessageElement) {
                         this.currentModelMessageElement.innerHTML = marked.parse(fullResponseText) as string;
                         this.scrollToBottom();
                      }
                  }
              }
              // Ensure chatHistory has the correct role and full response
              this.chatHistory.push({ role: "model", parts: [{ text: fullResponseText }] });
              this.saveChatHistory();
  
          } catch (error) {
              console.error("Fel vid anrop till Gemini API:", error);
              const errorText = "Ursäkta, ett tekniskt fel inträffade när jag skulle svara. Försök igen om en liten stund.";
              if (this.currentModelMessageElement && this.currentModelMessageElement.parentElement) {
                   this.currentModelMessageElement.parentElement.classList.remove("bg-slate-700");
                   this.currentModelMessageElement.parentElement.classList.add("bg-red-500", "text-white");
                   this.currentModelMessageElement.innerHTML = marked.parse(errorText) as string;
              } else {
                   this.displayMessage(errorText, false, true);
              }
               // Add error message to history to reflect it in UI upon reload
              this.chatHistory.push({ role: "model", parts: [{ text: errorText }] });
              this.saveChatHistory();
          } finally {
              this.setLoading(false);
              this.currentModelMessageElement = null; 
              this.ui.chatInput.focus();
          }
      }
  
      private scrollToBottom(): void {
          this.ui.chatWindow.scrollTop = this.ui.chatWindow.scrollHeight;
      }
  
      private saveChatHistory(): void {
          if (localStorage.getItem("byggPilotCookiesAccepted") === "true") {
              try {
                  // Ensure all parts in history are valid before saving
                  const validHistory = this.chatHistory.filter(item => item.parts && item.parts[0] && typeof item.parts[0].text === 'string');
                  localStorage.setItem("byggPilotChatHistory", JSON.stringify(validHistory));
              } catch (e) {
                  console.warn("Could not save chat history, possibly full:", e);
                  // Maybe clear older history parts if it's too full
                  if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                      // Attempt to clear some older history and retry
                      if (this.chatHistory.length > 10) { // Keep at least some history
                          this.chatHistory.splice(0, this.chatHistory.length - 10); // Remove older items
                          try {
                               const validHistory = this.chatHistory.filter(item => item.parts && item.parts[0] && typeof item.parts[0].text === 'string');
                               localStorage.setItem("byggPilotChatHistory", JSON.stringify(validHistory));
                          } catch (e2) {
                              console.error("Failed to save history even after reducing size:", e2);
                          }
                      }
                  }
              }
          }
      }
  
      private loadChatHistory(): void {
          if (localStorage.getItem("byggPilotCookiesAccepted") === "true") {
              const storedHistory = localStorage.getItem("byggPilotChatHistory");
              if (storedHistory) {
                  try {
                      const parsedHistory = JSON.parse(storedHistory) as Content[];
                      // Filter out any potentially invalid entries from old storage
                      this.chatHistory = parsedHistory.filter(item => 
                          item.role && 
                          item.parts && 
                          Array.isArray(item.parts) && 
                          item.parts.length > 0 && 
                          typeof item.parts[0].text === 'string'
                      );
  
                      const MAX_HISTORY_ITEMS = 50; 
                      if (this.chatHistory.length > MAX_HISTORY_ITEMS) {
                          this.chatHistory = this.chatHistory.slice(-MAX_HISTORY_ITEMS);
                      }
                  } catch (e) {
                      console.error("Could not parse chat history:", e);
                      this.chatHistory = [];
                      localStorage.removeItem("byggPilotChatHistory"); // Clear corrupted history
                  }
              }
          }
      }
  }
  
  document.addEventListener("DOMContentLoaded", () => {
      new ByggPilotApp();
  });
  