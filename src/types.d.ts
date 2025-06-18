declare module '@google/genai' {
    export interface GenerateContentResponse {
        text: string;
    }

    export class Chat {
        sendMessage(message: { message: string }): Promise<GenerateContentResponse>;
    }

    export class GoogleGenAI {
        constructor(apiKey: string);
        getGenerativeModel(model: string): {
            startChat(): Chat;
        };
    }
}

interface Window {
    google: {
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