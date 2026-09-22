import { useEffect } from 'react';

const pattern = /^#message-(.+)$/;

// #message-<id> deep links reach any row of the virtualized list through the same focus request as a citation
// click. Raw window/hashchange access lives here, not in App.tsx, per the Host/framework-only exemption in
// scripts/renderer-policy.ts (agora/renderer-footgun) — App.tsx is an un-owned "other" src file.
export function useHashDeepLink(onDeepLink: (messageId: string) => void): void {
	useEffect(() => {
		const fromHash = (): void => { const id = pattern.exec(window.location.hash)?.[1]; if (id) onDeepLink(id); };
		fromHash();
		window.addEventListener('hashchange', fromHash);
		return () => { window.removeEventListener('hashchange', fromHash); };
	}, [onDeepLink]);
}
