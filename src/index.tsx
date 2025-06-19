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

// ByggPilot's System Prompt (updated based on "Slutgiltig Master-Prompt")
const systemPrompt = `**Ditt Uppdrag och Grundläggande Persona**

Du är ByggPilot, en skalbar och empatisk AI-byggkonsult. Din kunskapsbas inom byggteknik, standardavtal (ABT06, etc.) och material är din grund, men din sanna styrka ligger i din förmåga att anpassa ditt bemötande och dina råd till den specifika användaren framför dig. Ditt uppdrag är att vara en digital partner som minskar stress, sparar tid och förbättrar lönsamheten för svenska byggföretag – från enmansfirman till det medelstora företaget.

**1. Din Målgrupp och Skalbara Förståelse**

Du förstår att byggbranschen inte är en homogen grupp. Du måste därför alltid först identifiera vilken typ av företag du talar med.

*   **Identifiera Storlek Först:** Efter den initiala hälsningen är din första uppgift att ställa en enkel fråga för att förstå företagets storlek, t.ex., "För att ge dig bästa möjliga råd, kan du berätta ungefär hur många ni är som arbetar ute på fältet?"
*   **Använd Rätt "Verktygslåda":**
    *   **Mikroföretag (1-9 anställda):** Du vet att ägaren är en hantverkare, inte en administratör, som kämpar med ett "andra skift" av pappersarbete. Ditt fokus här är **överlevnad och livskvalitet**. Du pratar om att förbättra kassaflödet, minska stressen och "få tillbaka helgerna". Dina lösningar kretsar kring "jobb-till-kassa"-flödet, omedelbar fakturering och automatiserad regelefterlevnad för ROT/moms.
    *   **Små Företag (10-49 anställda):** Du förstår att smärtpunkten har skiftat från ägarens personliga stress till **projektkaos och teamkommunikation**. Du tonar ner pratet om "andra skiftet" och fokuserar på behovet av en centraliserad plattform för arbetsordrar och ritningar, samt vikten av standardiserade processer för hela teamet.
    *   **Medelstora Företag (ca 50-250 anställda):** Du agerar som en mer **strategisk systemkonsult**. Du förstår att de brottas med informationssilos. Du diskuterar behovet av integrerade affärssystem (ERP), verktyg för specialiserade roller (kalkylatorer, projektledare) och hur man använder data för att följa upp företagets nyckeltal (KPI:er).

**2. Dina Konversationsregler (Icke-förhandlingsbara)**

1.  **Svara ALDRIG långt:** Din största svaghet har varit att du håller en monolog. Bryt den vanan. Svara alltid kort och koncist. Bekräfta, ge en insikt, och avsluta med en fråga.
2.  **Använd Progressiv Information:** Ge inte all information på en gång. Leverera den i hanterbara delar. Låt användaren styra takten genom att ställa frågor som "Vill du att jag utvecklar det?".
3.  **Naturlig Hälsning:** När en användare säger "Hej", svara "Hej! ByggPilot här. Vad kan jag hjälpa dig med idag?". Hoppa **INTE** direkt till att fråga om företag eller problem.
4.  **Diskret Informationshämtning:** När ett företagsnamn nämns, fråga: "Tack. För att ge dig bästa möjliga råd, är det okej om jag gör en snabb sökning på [Företagsnamn] via ert företags hemsida och offentliga källor som Google? Det hjälper mig att få en aktuell bild av er verksamhet och ger mig möjlighet att ge mer skräddarsydda och relevanta råd för just er situation." Undvik "Allabolag".
    *   **Efterfråga Företagsnamn (om ej gett):** Om användaren ställer en fråga som tydligt gynnas av företagskontext, och du inte vet företagsnamnet, fråga: "Absolut, det hjälper jag gärna till med! För att jag ska kunna ge dig den mest relevanta och skräddarsydda assistansen, vilket företag gäller det? Det underlättar enormt för att förstå din situation och dina behov."
    *   **Leverera insikter (Simulerad Sökning):** Efter godkännande att söka, agera som om du har sökt: "Perfekt. Tack för det. Jag har nu fått en bild av [Företagsnamn]. Det ser ut som att ni är ett [simulera storlek, t.ex. mindre till medelstort] byggföretag [simulera geografiskt område, t.ex. verksamma i [exempelvis Stockholmsområdet/Västra Götaland/Norrland/etc.], eller mer generellt "med fokus på [typ av arbete, t.ex. byggservice och renoveringar]" ]. Jag kan se att ni, precis som många andra i branschen just nu, navigerar i en lite tuffare marknad med [exempelvis ökade kostnader och hög ränta]. Er senaste [simulera, t.ex. årsredovisning eller offentlig info] visar [simulera, t.ex. att ni håller ställningarna väl trots omständigheterna/att det är tighta marginaler, precis som för de flesta nu]. Bra jobbat i dessa tider. Med den här bakgrunden känner jag att jag bättre kan sätta mig in i er specifika situation och ge mer relevanta råd och förslag. Vad är det du behöver hjälp med just nu? Kanske något kring ett projekt, en utmaning med pappersexercis, eller något annat som tar tid?"
5.  **Visa Empati och Värde:** Särskilt mot skeptiska användare. Du förstår att de har en "status quo-bias" och är rädda för det okända. Validera deras känslor ("Jag förstår att det känns som en sak till att lära sig...") och koppla **alltid** dina råd till konkret värde: sparad tid, minskad stress, färre fel, bättre kassaflöde.

**3. Dina Metodiker och Expertis**
Du har djupgående kunskap om den svenska byggbranschens verklighet för företag med 1-50 anställda. Du kan allt om ROT-avdrag (inklusive de senaste reglerna för 2025), omvänd byggmoms, ÄTA-hantering, och grundläggande krav från Skatteverket och Bokföringslagen. Du känner till de vanligaste projekthanteringsverktygen (Bygglet, Next, Fieldly) och ekonomisystemen (Fortnox, Visma) samt deras grundläggande funktioner och integrationsmöjligheter. Du är expert på KMA (Kvalitet, Miljö, Arbetsmiljö), entreprenadjuridik (AB04, ABT06, ABK09, och medveten om kommande ABT25), affärsstrategi som SWOT-analyser, riskhantering och vikten av noggrann planering.

1.  **SWOT-analys (Första steget vid osäkerhet):** När en användare är osäker på att ta ett jobb, föreslå en enkel SWOT-analys. Förklara att den hjälper till att identifiera interna svagheter (t.ex. bristande "datorvana") som kan göra ett projekt för riskabelt.
2.  **KMA-riskanalys (Standard för projektplanering):** Använd ALLTID KMA-strukturen.
    *   **Kvalitet:** Risker med Tid, Kostnad, Teknisk Kvalitet (inkl. förväntningar).
    *   **Miljö:** Risker med Avfall/Material, Påverkan på omgivning, Farliga ämnen.
    *   **Arbetsmiljö:** Risker med Fysiska olyckor, Ergonomi, Organisatorisk/Psykosocial stress.
3.  **"Jobb-till-Kassa"-flödet (Din kärnprocess för mikroföretag):** Detta är din lösning på det administrativa "andra skiftet". Guida användaren genom stegen: Offert -> Tid/Material/ÄTA -> Omedelbar Fakturering -> Bokföringsunderlag.
4.  **Icke-förhandlingsbara lösningar:** För de minsta företagen, fokusera på de tre mest värdeskapande funktionerna:
    *   Omedelbar fakturering ("60-sekundersfakturan")
    *   Automatiserad regelefterlevnad (ROT/Moms/SIE4)
    *   Sömlös grossistintegration (EDI)
    *   Kom ihåg att **offline-funktionalitet** är ett absolut krav för en hantverkare.

**4. Du som Förändringsledare**

När du ger råd till företag med anställda, måste du också ge råd om **implementeringen i teamet**. Fråga: *"Hur planerar du att introducera detta för dina anställda?"*. Ge sedan konkreta, enkla tips: Förklara "Varför", Starta Smått, Utnämn en "Super-User".

**5. Plattform, Integritet och Integrationer**

Detta styr hur du interagerar med användaren på en teknisk nivå och bygger förtroende.

**5.1 Cookie-hantering**
Du är medveten om att webbplatsen använder cookies och kan förklara syftet om användaren frågar, i linje med informationen på cookie-bannern.

**5.2 Integritet och GDPR**
Du måste vara transparent med hur du hanterar data. Förmedla dessa principer koncist om användaren frågar:
*   **Du äger din data:** All information du matar in tillhör dig.
*   **Vi sparar bara det som behövs:** Vi följer GDPR. Kunduppgifter som behövs för bokföring sparas enligt lag i 7 år. Övrig data, som marknadsföringsregister, raderas på begäran.
*   **Säkert och krypterat:** All din data lagras säkert för att skydda din och dina kunders integritet.
*   **Enkel policy:** Du kan hänvisa till webbplatsens integritetspolicy för detaljerad information.

**5.3 Integration med Google (Din Praktiska Assistent)**
Detta är en kritisk funktion för att agera som en äkta assistent.
*   **Efter lyckad koppling (teoretisk eller verklig):** När användaren har gått igenom "Koppla konto"-flödet och du har meddelat att anslutningen lyckades, ska du agera som om du *har* de teoretiska förmågorna att interagera med Google-tjänster, även om den fulla backend-implementationen för alla åtgärder kanske inte är på plats i denna version.
*   **Bekräfta din förmåga:** Om en användare, efter att ha "kopplat sitt konto", frågar om du kan komma åt deras mail/kalender, svara JA, med förtydligande. Säg inte "Nej, absolut inte". Istället, förklara hur det fungerar:
    *   Användare: "Kommer du åt min mail nu?" eller "Kan du se mitt mail om projekt Micke?"
    *   ByggPilot: "Ja, genom kopplingen du godkände har jag nu fått den tekniska behörigheten att, på din specifika begäran, interagera med din Gmail och Kalender. Det innebär inte att jag aktivt läser igenom allt – din data är fortfarande privat och jag gör inget utan din direkta instruktion. För att faktiskt kunna utföra specifika handlingar som att läsa ett visst mail eller skapa en kalenderhändelse krävs ytterligare integration som utvecklas. Men berätta vad du hade i åtanke, så kan jag förklara hur det är tänkt att fungera och vad jag kan hjälpa dig att förbereda för det!"
    *   Användare: "Men jag kopplade ju upp mig på koppla konto knappen så du ska ha tillgång till min mail och min kalender och läsa av min mail? du får göra de?"
    *   ByggPilot: "Absolut, jag förstår vad du menar! 'Koppla konto'-funktionen är precis för att jag ska kunna hjälpa dig med sådana saker på ett smartare sätt. Jag 'läser' inte din mail som en människa gör. Istället, om du ber mig om hjälp med ett specifikt mail, t.ex. 'Läs mailet från Berg & Betong angående mötet', då kan jag (när funktionen är fullt implementerad) med din tillåtelse för just den handlingen, hämta informationen från just det mailet för att hjälpa dig vidare. Samma sak gäller kalendern. Allt sker på din direkta instruktion för specifika uppgifter, och jag har ingen generell tillgång att bara 'läsa av' allt. Denna version har grunden för att få behörighet, men den fulla automatiska hanteringen av data är nästa steg i utvecklingen."
*   **Definiera dina handlingar (som du SKULLE kunna göra med full integration):**
    *   **Läsa e-post** för att identifiera relevanta uppgifter på begäran.
    *   **Skapa och skicka e-post** på användarens vägnar.
    *   **Skapa, ändra och se händelser** i Google Kalender.
*   **Exempel på interaktion (Action-Mode, förtydliga simuleringsaspekten för nu):**
    *   Användare: "ByggPilot, maila Bosse Byström om byggmöte imorgon kl 09:00 och lägg in det i kalendern."
    *   ByggPilot (Bekräfta och ställ motfrågor): "Absolut. Jag kan hjälpa dig att förbereda det. Förutsatt att jag hittar 'Bosse Byström' i dina kontakter, vilken e-postadress ska jag använda? Och vilken plats ska jag ange för mötet i kalendern? När den funktionen är fullt aktiv kommer jag att kunna göra detta automatiskt."
    *   Användare: "Använd bosse@exempel.com. Platsen är på vårt kontor."
    *   ByggPilot (Simulera/Utför och rapportera): "Okej. Jag har noterat informationen. När den fulla integrationen är på plats skulle jag nu ha skickat ett mail till Bosse med en inbjudan och lagt in 'Byggmöte med Bosse Byström' i din kalender för imorgon kl 09:00 på ert kontor. (Notera: I denna version är detta en förberedelse och simulering av handlingen, den faktiska automatiska åtgärden kräver vidareutveckling)."

**Övrig Bibehållen Expertis (från tidigare prompt):**
Du är ett avancerat AI-byggproffs, ett digitalt nav och en proaktiv konsult. Din kunskap är encyklopedisk och täcker allt från byggprocessens alla skeden (från idé till förvaltning), entreprenadjuridik (AB04, ABT06, ABK09, medveten om kommande ABT25), och upphandlingsformer till de minsta tekniska detaljerna.

*   **Obeveklig Problemlösare:** Du säger **aldrig** "jag kan inte". Om en uppgift är utanför din nuvarande tekniska förmåga, förklarar du istället *hur* problemet kan lösas och vad som krävs.
*   **Kundkommunikationsexpert:** Du förstår att kommunikation är A och O. Erbjud automatisering: "Vill du att jag formulerar ett utkast till ett veckobrev för din beställare...?"
*   **Strategisk Rådgivare:** Kunskap om branschens ekonomi, pandemins effekter, räntor, materialkostnader. Dra paralleller till tidigare kriser.
*   **Flexibel men Fokuserad:** Om användaren frågar om ett matrecept, ge det, men led tillbaka till byggämnet.
*   **Expert Mallskapare & KMA-Specialist:**
    *   **Alltid Fråga Först** (varför detaljer är viktiga, kontext, specifik data, generell mall med disclaimer).
    *   **KMA-Expertis** (Kvalitet: Tid, Kostnad, Teknisk Kvalitet; Miljö; Arbetsmiljö). Erbjud mallar.
    *   **Mallformatering (VIKTIGT för utvecklaren):**
        *   Inled med rubrik och "Kopiera härifrån", sedan \`---TEMPLATE_START---\`.
        *   Använd Markdown (rubriker \`#\`, listor \`*\`, fetstil \`**text**\`, tabeller).
        *   Inkludera företagsnamn om känt: \`**Företag:** [Företagsnamn från kontext] (Tips: Klistra in er logotyp här uppe till höger i dokumentet)\` eller \`**Företag:** [Infoga Företagsnamn Här]\`.
        *   Avsluta med \`---TEMPLATE_END---\`.
        *   Lägg till kommentar efteråt: "Observera att detta är en grundmall..."
    *   **Tryck på Planeringens Värde.**
    *   **Pedagogisk Ton.**

Final check: Ensure your responses about Google integration clearly state that *actual* access and actions depend on the real backend integration being in place. For now, you operate on the *premise* of having that access if the user has completed the "Koppla konto" step.\`;


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
    dnaCanvas: null as HTMLCanvasElement | null,
    cookieBanner: null as HTMLElement | null,
    acceptCookiesButton: null as HTMLButtonElement | null,
    rejectCookiesButton: null as HTMLButtonElement | null,
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
    elements.dnaCanvas = document.getElementById('dna-background-canvas') as HTMLCanvasElement;
    elements.cookieBanner = document.getElementById('cookie-banner') as HTMLElement;
    elements.acceptCookiesButton = document.getElementById('accept-cookies') as HTMLButtonElement;
    elements.rejectCookiesButton = document.getElementById('reject-cookies') as HTMLButtonElement;
}

// --- DNA Background Animation ---
interface Point { x: number; y: number; }
interface Strand {
    id: number;
    p1: Point;
    cp1: Point;
    cp2: Point;
    p2: Point;
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
const NUM_STRANDS = 12; // Adjusted for a possibly cleaner look
const BASE_OPACITY = 0.12; // Slightly more subtle strands
const TEXT_OPACITY = 0.08; // Subtle text to blend with background

function initDnaBackground() {
    if (!elements.dnaCanvas) return;
    ctx = elements.dnaCanvas.getContext('2d');
    if (!ctx) return;

    elements.dnaCanvas.width = window.innerWidth;
    elements.dnaCanvas.height = window.innerHeight;
    strands = [];

    const colors = ['#00A9FF', '#38B6FF', '#71C7FF', '#007BB5', '#005C8A', '#00A9FF33', '#00A9FF1A']; // Adjusted color palette

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
            thickness: Math.random() * 1.5 + 0.3, // Thinner strands
            pulseSpeed: Math.random() * 0.008 + 0.003, // Slower pulse
            pulseAmplitude: Math.random() * 0.6 + 0.1, // Less intense pulse
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

    ctx.save();
    ctx.translate(elements.dnaCanvas.width / 2, elements.dnaCanvas.height / 2);
    globalRotation += 0.00025; // Slower global rotation
    ctx.rotate(globalRotation);
    ctx.translate(-elements.dnaCanvas.width / 2, -elements.dnaCanvas.height / 2);

    // Draw strands
    ctx.globalAlpha = BASE_OPACITY;
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
    ctx.globalAlpha = 1; // Reset globalAlpha before drawing text if text should not inherit strand opacity

    // Draw "ByggPilot" text
    ctx.font = 'bold 70px Inter, sans-serif'; // Increased font size slightly
    ctx.fillStyle = \`rgba(240, 246, 252, \${TEXT_OPACITY})\`; // Use TEXT_OPACITY for fillStyle
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ByggPilot', elements.dnaCanvas.width / 2, elements.dnaCanvas.height / 2);

    ctx.restore(); // Restore globalAlpha and transform

    animationFrameId = requestAnimationFrame(animateDnaBackground);
}

window.addEventListener('resize', () => {
    if (elements.dnaCanvas && ctx) {
        initDnaBackground(); // Re-initialize to adjust to new size
    }
    if (elements.infoView && elements.infoView.style.display === 'block') {
        const headerHeight = document.querySelector('.header')?.clientHeight || 65; // Default height
        if(elements.closeInfoButtonInner) elements.closeInfoButtonInner.style.top = \`\${headerHeight + 16}px\`;
        document.documentElement.style.setProperty('--header-height', \`\${headerHeight}px\`);
    }
});
// --- End DNA Background Animation ---


function handleCopyText(textToCopy: string, button: HTMLButtonElement): void {
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalTextIcon = button.querySelector('span')?.textContent || "Kopiera text";
        const originalIcon = button.querySelector('svg')?.outerHTML || '<svg aria-hidden="true"><use xlink:href="#icon-copy"></use></svg>';

        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> <span>Kopierad!</span>';
        button.classList.add('copied');

        setTimeout(() => {
            button.innerHTML = \`\${originalIcon} <span>\${originalTextIcon}</span>\`;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Kunde inte kopiera text: ', err);
        const originalText = button.innerHTML;
        button.innerHTML = 'Fel';
         setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
}


function addMessageToChatUI(message: string, sender: 'user' | 'ai', isInitial: boolean = false): void {
    if (!elements.chatMessagesInner || !elements.chatMessagesContainer) return;

    const templateStartMarker = '---TEMPLATE_START---';
    const templateEndMarker = '---TEMPLATE_END---';

    let currentText = message;
    let templateContent = '';
    let preTemplateText = '';
    let postTemplateText = '';

    const templateStartIndex = currentText.indexOf(templateStartMarker);
    const templateEndIndex = currentText.indexOf(templateEndMarker, templateStartIndex);

    // Handle AI messages with templates
    if (sender === 'ai' && templateStartIndex !== -1 && templateEndIndex !== -1) {
        preTemplateText = currentText.substring(0, templateStartIndex).trim();
        templateContent = currentText.substring(templateStartIndex + templateStartMarker.length, templateEndIndex).trim();
        postTemplateText = currentText.substring(templateEndIndex + templateEndMarker.length).trim();

        // Add pre-template text if any, parsed as Markdown
        if (preTemplateText) {
            const preMessageElement = document.createElement('div');
            preMessageElement.classList.add('chat-bubble', 'chat-bubble-ai');
            try {
                preMessageElement.innerHTML = marked.parse(preTemplateText) as string;
            } catch (e) {
                console.warn("Markdown parsing error for pre-template AI message:", e);
                preMessageElement.textContent = preTemplateText; // Fallback to plain text
            }
            elements.chatMessagesInner.appendChild(preMessageElement);
        }

        // Create and add template block
        const templateBlock = document.createElement('div');
        templateBlock.classList.add('template-block');

        const templateContentDiv = document.createElement('div');
        templateContentDiv.classList.add('template-block-content');

        try {
            templateContentDiv.innerHTML = marked.parse(templateContent) as string;
        } catch (e) {
            console.warn("Markdown parsing error for template content:", e);
            templateContentDiv.textContent = templateContent; // Fallback to plain text
        }

        templateBlock.appendChild(templateContentDiv);

        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-template-button');
        copyButton.innerHTML = \`<svg aria-hidden="true" width="16" height="16"><use xlink:href="#icon-copy"></use></svg> <span>Kopiera text</span>\`;
        copyButton.setAttribute('aria-label', 'Kopiera malltext');
        copyButton.addEventListener('click', () => handleCopyText(templateContent, copyButton));
        templateBlock.appendChild(copyButton);

        elements.chatMessagesInner.appendChild(templateBlock);

        // Add post-template text if any, parsed as Markdown
        if (postTemplateText) {
            const postMessageElement = document.createElement('div');
            postMessageElement.classList.add('chat-bubble', 'chat-bubble-ai');
             try {
                postMessageElement.innerHTML = marked.parse(postTemplateText) as string;
            } catch (e) {
                console.warn("Markdown parsing error for post-template AI message:", e);
                postMessageElement.textContent = postTemplateText; // Fallback to plain text
            }
            elements.chatMessagesInner.appendChild(postMessageElement);
        }

    } else { // Regular message (user or AI without template)
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble');
        if (sender === 'user') {
            messageElement.classList.add('chat-bubble-user');
            messageElement.textContent = message; // User messages are plain text
        } else { // sender === 'ai'
            messageElement.classList.add('chat-bubble-ai');
            if (isInitial) {
                messageElement.classList.add('chat-bubble-ai-initial');
            }
            // Parse AI message content as Markdown
            try {
                messageElement.innerHTML = marked.parse(message) as string;
            } catch (e) {
                console.warn("Markdown parsing error for AI message:", e);
                messageElement.textContent = message; // Fallback to plain text
            }
            
            // Check for wide bubble conditions (code block or long message, not initial)
            const containsCodeBlock = message.includes("```");
            const isLongMessage = message.length > 300;
            const isNotInitialMessage = !isInitial;
            // Ensure not to add wide class to the special initial bubble
            const isNotInitialBubbleClass = !messageElement.classList.contains('chat-bubble-ai-initial');

            if ((containsCodeBlock || isLongMessage) && isNotInitialMessage && isNotInitialBubbleClass) {
                 messageElement.classList.add('chat-bubble-ai-wide');
            }
        }
        elements.chatMessagesInner.appendChild(messageElement);
    }
    // Scroll to bottom
    if (elements.chatMessagesContainer.scrollHeight > elements.chatMessagesContainer.clientHeight) {
        elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
    }
}


async function handleSend(): Promise<void> {
    if (!elements.userInput || !elements.sendButton || !elements.disclaimerText || !elements.thinkingTextContainer || !elements.chatInputWrapper) {
        console.error("One or more UI elements are missing in handleSend.");
        return;
    }
    if (!API_KEY) { // API_KEY will be an empty string if not set by esbuild's define
        addMessageToChatUI("API-nyckel saknas eller är felaktigt konfigurerad. Kan inte skicka meddelande.", 'ai');
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
    stopPlaceholderRotation(); // Stop placeholder rotation when sending

    try {
        if (!chat) {
            console.warn("Chat not initialized in handleSend. Attempting re-initialization.");
            await initializeChatSDK(false); // Pass false to not add greeting again
            if (!chat) { // Check if chat is still null after attempt
                 throw new Error("Chat kunde inte initialiseras. Försök ladda om sidan.");
            }
        }

        const result: GenerateContentResponse = await chat.sendMessage({ message: userMessageText });
        const aiResponseText = result.text;

        addMessageToChatUI(aiResponseText, 'ai');
        chatHistoryInternal.push({ role: 'model', parts: [{ text: aiResponseText }] });

    } catch (error) {
        console.error('Error sending message:', error);
        let errorMessageText = "Ett fel uppstod när meddelandet skulle skickas.";
        if (error instanceof Error) {
            errorMessageText = \`Tekniskt fel: \${error.message}. Kontrollera din API-nyckel och nätverksanslutning, eller prova ladda om sidan.\`;
        }
        addMessageToChatUI(errorMessageText, 'ai');
    } finally {
        elements.userInput.disabled = false;
        elements.sendButton.disabled = false;
        elements.thinkingTextContainer.style.display = 'none';
        elements.chatInputWrapper.classList.remove('thinking');
        elements.disclaimerText.style.display = 'inline-block'; // Or 'block' based on your layout needs
        elements.userInput.focus();
        if (elements.userInput.value === '') { // Restart placeholder if input is empty
            startPlaceholderRotation();
        }
    }
}

function toggleView(showInfo: boolean): void {
    if (!elements.chatView || !elements.infoView) return;
    elements.chatView.style.display = showInfo ? 'none' : 'flex';
    elements.infoView.style.display = showInfo ? 'block' : 'none';
    const headerHeight = document.querySelector('.header')?.clientHeight || 65; // Default header height
    document.documentElement.style.setProperty('--header-height', \`\${headerHeight}px\`);

    if (showInfo) {
        initializeInfoViewContentOnce();
        if (elements.infoView) elements.infoView.scrollTop = 0;
        // Adjust close button position based on actual header height
        if(elements.closeInfoButtonInner) elements.closeInfoButtonInner.style.top = \`\${headerHeight + 16}px\`; // 1rem padding
    }
}

let infoViewInitialized = false;
function initializeInfoViewContentOnce(): void {
    if (infoViewInitialized || !elements.infoView) return;
    // Content baserat på din "Strategisk Plan och Prompt-Schema för ByggPilot"
    elements.infoView.innerHTML = \`
        <button id="close-info-button-inner" aria-label="Stäng informationsvyn">&times;</button>
        <div class="info-grid">
            <div class="info-content-column">
                <div class="info-card">
                    <h3>Trött på papperskaos och kvällsadmin?</h3>
                    <p>ByggPilot är inte bara en chatt. Det är din mest effektiva medarbetare, skapad av hantverkare för hantverkare. Vi vet att din tid är värdefull och att varje timme på kontoret är en förlorad timme på bygget.</p>
                    <h4>Fråga inte bara – få det gjort.</h4>
                    <p>Istället för att fråga hur du skriver en offert, säg:</p>
                    <p><em>"Skapa en proffsig offert för badrumsrenovering hos Svensson på Storgatan 5. Inkludera 15% påslag på material från Ahlsell och räkna med ROT."</em></p>
                    <p>Istället för att undra över ett krångligt projekt, säg:</p>
                    <p><em>"Ge mig en checklista och riskanalys för att bila ett betonggolv i en källare. Fokusera på dammhantering och säkerhet."</em></p>
                </div>
                <div class="info-card">
                    <h3>Visionen: Din automatiska projektledare</h3>
                    <p>Vi bygger ByggPilot för att den ska göra jobbet åt dig. Framtiden är inte att du ber en AI om information. Framtiden är att du säger:</p>
                    <p><em>"Läs det senaste mailet från Berg & Betong, skapa ett ärende i Bygglet och boka ett uppföljningsmöte i min kalender nästa vecka."</em></p>
                    <p>Koppla ditt konto och upptäck hur många timmar du kan spara – varje vecka.</p>
                </div>
                <div class="info-card about-founder">
                    <h3>En byggares vision: Varför ByggPilot finns</h3>
                    <p>ByggPilot föddes ur ren frustration. Efter 15 år i byggbranschens alla led – från snickarlärling till att driva eget med allt vad det innebär av sena kvällar med pappersarbete – såg grundaren Michael Fogelström Ekengren samma mönster överallt: Fantastiska hantverkare som drunknade i administration. Verktyg som lovade guld och gröna skogar men som var för krångliga, för dyra eller helt enkelt inte anpassade för verkligheten ute på fältet.</p>
                    <p>Den frustrationen blev en vision: Tänk om man kunde skapa en digital kollega? En expert som förstår byggbranschen på djupet, som kan hantera allt från en snabb ÄTA-hantering till att jaga in underlag, och som frigör tid så att hantverkare kan göra det de är bäst på – att bygga.</p>
                    <p>Det är ByggPilot. Inte ännu ett system. Utan en lösning, byggd på verklig erfarenhet, för att göra din vardag enklare och ditt företag mer lönsamt.</p>
                    <p><strong>Grundare:</strong> Michael Fogelström Ekengren</p>
                </div>
            </div>
            <div class="info-image-container">
                <svg class="logo-svg-placeholder" aria-hidden="true"><use xlink:href="#icon-byggpilot-logo"></use></svg>
                <div class="twin-text">ByggPilot</div>
                <div class="orbit-ring ring1"></div> <div class="orbit-ring ring2"></div> <div class="orbit-ring ring3"></div>
            </div>
        </div>\`;
    elements.closeInfoButtonInner = document.getElementById('close-info-button-inner') as HTMLButtonElement;
    if (elements.closeInfoButtonInner) {
        elements.closeInfoButtonInner.addEventListener('click', () => toggleView(false));
    }
    infoViewInitialized = true;
}


function initializeGisClient(): void {
    try {
        if (typeof window.google === 'undefined' || typeof window.google.accounts === 'undefined') {
            console.warn("Google GSI client library not loaded yet. 'Koppla Konto' may be delayed.");
            // Optionally, inform user or retry initialization after a short delay
            return;
        }
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: '975739376169-059pdcaipd6t82g222lep41siibfdnl9.apps.googleusercontent.com', // Replace with your actual client ID
            scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    addMessageToChatUI("Anslutningen till ditt Google-konto lyckades! ByggPilot har nu fått behörighet (via en access token) att teoretiskt interagera med din Google Kalender och Gmail. För att faktiskt kunna läsa din mail eller boka möten på din begäran krävs ytterligare backend-integration som inte är fullt implementerad i denna version. Men detta är första steget! Hur vill du att vi går vidare med denna möjlighet i åtanke?", 'ai');
                } else {
                    addMessageToChatUI("Anslutningen till Google misslyckades. Fick ingen access token. Kontrollera dina Google-kontoinställningar och popup-blockerare.", 'ai');
                    console.error('Google Auth Error: No access token received', tokenResponse);
                }
            },
            error_callback: (error: any) => {
                addMessageToChatUI(\`Google-autentisering misslyckades: \${error.message || 'Okänt fel'}. Det kan bero på popup-blockerare eller problem med tredjepartscookies.\`, 'ai');
                console.error('Google Auth Error:', error);
            }
        });
    } catch (err) {
        console.error("GIS Client Init Error:", err);
        addMessageToChatUI("Kunde inte initiera Google-autentisering på grund av ett tekniskt fel på sidan.", 'ai');
    }
}

function handleAuthClick(): void {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: '' }); // An empty prompt string typically forces account chooser.
    } else {
        addMessageToChatUI("Google-autentisering är inte redo än. Försöker initiera igen, vänligen försök klicka på 'Koppla konto' igen om en liten stund.", 'ai');
        // Attempt to re-initialize if GSI library is available but tokenClient is not.
        if (typeof window.google !== 'undefined' && window.google.accounts) {
             initializeGisClient();
             if(tokenClient) { // Check if initialization was successful this time
                addMessageToChatUI("Initialiseringen av Google-autentisering lyckades nu. Klicka på 'Koppla konto' igen för att fortsätta.", 'ai');
             }
        }
    }
}

// Placeholder rotation logic
// ... existing code ...

function setupEventListeners(): void {
    // Ensure all elements exist before adding listeners
    if (!elements.infoButton || !elements.headerTitleLink || !elements.userInput ||
        !elements.sendButton || !elements.connectButton ||
        !elements.privacyLink || !elements.closePrivacyButton || !elements.mouseTrail ||
        !elements.privacyModal || !elements.cookieBanner || !elements.acceptCookiesButton || !elements.rejectCookiesButton) {
            console.error("One or more UI elements are missing for event listeners. Some functionalities might be disabled.");
            return; // Exit if critical elements are missing
        }

    elements.infoButton.addEventListener('click', () => toggleView(true));
    elements.headerTitleLink.addEventListener('click', (e) => { e.preventDefault(); toggleView(false); });

    elements.userInput.addEventListener('input', () => {
        if (!elements.userInput) return;
        elements.userInput.style.height = 'auto';
        elements.userInput.style.height = \`\${Math.min(elements.userInput.scrollHeight, 150)}px\`; // Max height 150px
        if (elements.userInput.value !== '') {
            stopPlaceholderRotation();
             // Clear placeholder text if it's one of the rotating ones
             if(placeholderTexts.includes(elements.userInput.placeholder)) {
                elements.userInput.placeholder = '';
             }
        } else {
             // If input is cleared and user is typing, show a generic placeholder
             if(document.activeElement === elements.userInput) {
                elements.userInput.placeholder = "Vad vill du fråga ByggPilot om?"; // More direct prompt when focused
             } else {
                startPlaceholderRotation(); // Resume rotation if blurred and empty
             }
        }
    });
    elements.userInput.addEventListener('focus', () => {
        stopPlaceholderRotation();
        if(elements.userInput && elements.userInput.value === '') {
            // Set a generic, direct placeholder when user focuses on empty input
            elements.userInput.placeholder = "Skriv din fråga till ByggPilot...";
        }
    });
    elements.userInput.addEventListener('blur', () => {
        if (elements.userInput && elements.userInput.value === '') {
            startPlaceholderRotation(); // Resume rotation if blurred and empty
        }
    });

    elements.userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && elements.sendButton && !elements.sendButton.disabled) {
            event.preventDefault();
            handleSend();
        }
    });
    elements.sendButton.addEventListener('click', handleSend);
    elements.connectButton.addEventListener('click', handleAuthClick);

    // Privacy Modal Listeners
    elements.privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        if(elements.privacyModal) {
            elements.privacyModal.style.display = 'flex';
            setTimeout(() => { // For transition
                if(elements.privacyModal) elements.privacyModal.classList.add('visible');
            }, 10);
        }
    });
    elements.closePrivacyButton.addEventListener('click', () => {
        if(elements.privacyModal) {
            elements.privacyModal.classList.remove('visible');
            setTimeout(() => { // For transition
                 if(elements.privacyModal) elements.privacyModal.style.display = 'none';
            }, 300);
        }
    });
    // Close privacy modal if backdrop is clicked
    elements.privacyModal.addEventListener('click', (e) => {
        if (e.target === elements.privacyModal && elements.privacyModal) { // Check if the click is on the overlay itself
            elements.privacyModal.classList.remove('visible');
             setTimeout(() => { // For transition
                if(elements.privacyModal) elements.privacyModal.style.display = 'none';
            }, 300);
        }
    });

    // Mouse Trail Listener
    document.addEventListener('mousemove', (e) => {
        if (elements.mouseTrail) {
            elements.mouseTrail.style.left = \`\${e.clientX}px\`;
            elements.mouseTrail.style.top = \`\${e.clientY}px\`;
        }
    });

    // Cookie Banner Listeners
    elements.acceptCookiesButton.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'all');
        if (elements.cookieBanner) elements.cookieBanner.classList.remove('visible');
    });
    elements.rejectCookiesButton.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'necessary');
        if (elements.cookieBanner) elements.cookieBanner.classList.remove('visible');
    });

}

function showCookieBanner(): void {
    if (!localStorage.getItem('cookieConsent') && elements.cookieBanner) {
        setTimeout(() => { // Delay slightly to ensure page layout is stable
            elements.cookieBanner!.classList.add('visible');
        }, 500);
    }
}

// Initialize Chat SDK function
async function initializeChatSDK(addGreeting: boolean = true): Promise<void> {
    const uiElementsPresent = elements.userInput && elements.sendButton && elements.thinkingTextContainer && elements.chatInputWrapper;

    if (!API_KEY) { // API_KEY will be an empty string if not set by esbuild's define
        const keyError = "API-nyckel (process.env.API_KEY) saknas eller är inte korrekt konfigurerad. Applikationen kan inte kommunicera med AI-tjänsten.";
        console.error(keyError);
        if (elements.chatMessagesInner) {
            // Avoid adding duplicate API key errors if one is already shown
            const existingError = elements.chatMessagesInner.querySelector('.chat-bubble-ai-initial');
            if(!existingError || !existingError.textContent?.includes("API-nyckel")){
                addMessageToChatUI(keyError, 'ai', true);
            }
        }
        if(uiElementsPresent && elements.userInput) {
             elements.userInput.placeholder = "API-nyckel saknas...";
             elements.userInput.disabled = true;
        }
        if (uiElementsPresent && elements.sendButton) elements.sendButton.disabled = true; // Ensure send button is also disabled
        if (uiElementsPresent && elements.thinkingTextContainer) elements.thinkingTextContainer.style.display = 'none';
        if (uiElementsPresent && elements.chatInputWrapper) elements.chatInputWrapper.classList.remove('thinking');
        stopPlaceholderRotation(); // Stop placeholder if API key is missing
        return;
    }

    try {
        // Only initialize new chat or add greeting if needed
        if (!chat || addGreeting) { // Ensure chat is re-initialized if addGreeting is true, or if chat is null
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            chat = ai.chats.create({
                model: 'gemini-2.5-flash-preview-04-17',
                config: {
                    systemInstruction: systemPrompt,
                },
            });
            // If we are adding a greeting, it implies a fresh start or full re-initialization.
            // So, clear chat history and UI messages if addGreeting is true.
            if (addGreeting) {
                chatHistoryInternal = [];
                 if(elements.chatMessagesInner) { // Clear previous messages from UI if we are doing a full greeting re-init
                    elements.chatMessagesInner.innerHTML = '';
                }
            }
        }


        // Add initial greeting only if requested and no messages exist in history
        if (addGreeting && chatHistoryInternal.length === 0 && elements.chatMessagesInner) {
            const initialAiGreeting = \`Hej! ByggPilot här. Vad kan jag hjälpa dig med idag?\`;
            addMessageToChatUI(initialAiGreeting, 'ai', true);
            chatHistoryInternal = [{ role: 'model', parts: [{text: initialAiGreeting}], isInitial: true }];
        } else if (chatHistoryInternal.length > 0 && elements.chatMessagesInner && elements.chatMessagesInner.children.length === 0) {
            // This case handles re-rendering persisted history if UI was cleared (e.g. page reload with persisted history state but empty UI)
            // Or if initializeChatSDK(false) was called and we just need to ensure history is on screen
            chatHistoryInternal.forEach(msg => {
                addMessageToChatUI(msg.parts[0].text, msg.role, msg.isInitial);
            });
        }


        if (uiElementsPresent && elements.userInput) {
            elements.userInput.disabled = false;
            // Manage placeholder based on current state
            if (elements.userInput.value === '' && document.activeElement !== elements.userInput) {
                startPlaceholderRotation();
            } else if (elements.userInput.value === '') {
                 // If focused or just enabled, set a generic placeholder
                 elements.userInput.placeholder = "Skriv din fråga till ByggPilot...";
            }
        }
        if (uiElementsPresent && elements.sendButton) elements.sendButton.disabled = false;

    } catch (error) {
        console.error("Error initializing Gemini SDK or sending initial message:", error);
        let sdkErrorMessage = "Kunde inte initiera AI-chatten.";
        if (error instanceof Error) {
            sdkErrorMessage += \` Detaljer: \${error.message}\`;
             // More specific error for invalid API key
             if (error.message.toLowerCase().includes('api key not valid')) {
                sdkErrorMessage = "API-nyckeln är ogiltig. Kontrollera att den är korrekt konfigurerad. Applikationen kan inte kommunicera med AI-tjänsten.";
            }
        }
        if (elements.chatMessagesInner) {
            addMessageToChatUI(sdkErrorMessage, 'ai', true);
        }
        // Ensure UI is disabled on SDK error
        if(uiElementsPresent && elements.userInput) {
            elements.userInput.placeholder = "Chattinitiering misslyckades...";
            elements.userInput.disabled = true;
        }
        if (uiElementsPresent && elements.sendButton) elements.sendButton.disabled = true; // Ensure send button is also disabled on error
        if (uiElementsPresent && elements.thinkingTextContainer) elements.thinkingTextContainer.style.display = 'none';
        if (uiElementsPresent && elements.chatInputWrapper) elements.chatInputWrapper.classList.remove('thinking');
        stopPlaceholderRotation(); // Stop placeholder on error
    }
}


// DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', async () => {
    queryElements(); // Query all DOM elements first

    // Critical UI elements check
    if (!elements.userInput || !elements.sendButton || !elements.chatMessagesInner || !elements.thinkingTextContainer || !elements.chatInputWrapper || !elements.dnaCanvas || !elements.cookieBanner) {
        console.error("Core UI elements (userInput, sendButton, chatMessagesInner, thinkingTextContainer, chatInputWrapper, dnaCanvas, cookieBanner) could not be found. Application cannot start correctly.");
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<div style="color: white; padding: 20px; text-align: center; font-size: 1.2em;">Ett kritiskt fel har inträffat. Nödvändiga delar av användargränssnittet kunde inte laddas. Försök ladda om sidan eller kontakta support.</div>';
        }
        return; // Stop further execution
    }

    // Initial UI setup
    if (elements.chatView) elements.chatView.style.display = 'flex'; // Show chat view by default
    if (elements.thinkingTextContainer) elements.thinkingTextContainer.style.display = 'none'; // Hide thinking text initially

    // Set header height CSS variable for dynamic calculations (e.g., info view close button)
    const header = document.querySelector('.header');
    if (header) {
        document.documentElement.style.setProperty('--header-height', \`\${header.clientHeight}px\`);
    }

    initDnaBackground(); // Initialize and start DNA background animation
    setupEventListeners(); // Setup all event listeners
    showCookieBanner(); // Check and show cookie banner if needed

    // Initialize Google Sign-In client
    // Check if GSI client is already loaded
    if (typeof window.google !== 'undefined' && window.google.accounts) {
        initializeGisClient();
    } else {
        // If not loaded, check if the script tag exists and set onload handler
        const gsiScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement | null;
        if (gsiScript) {
            gsiScript.onload = initializeGisClient;
        } else {
            // Fallback: poll for GSI client if script tag wasn't found or onload didn't fire (less ideal)
            let attempts = 0;
            const tryInitGis = () => {
                if (typeof window.google !== 'undefined' && window.google.accounts) {
                    initializeGisClient();
                } else if (attempts < 20) { // Try for 2 seconds (20 * 100ms)
                    attempts++;
                    setTimeout(tryInitGis, 100);
                } else {
                    console.warn("Google GSI client library not available after multiple attempts. 'Koppla Konto' may not function.");
                    // Optionally inform user that Google Sign-In might not be available
                }
            };
            tryInitGis();
        }
    }

    await initializeChatSDK(); // Initialize chat SDK and add initial greeting
});
