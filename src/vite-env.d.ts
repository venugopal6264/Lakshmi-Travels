/// <reference types="vite/client" />

// Extend Vite env typing with our custom variables
interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
