interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: any[]) => void;
}

interface ImportMetaEnv {
    readonly PROD: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
