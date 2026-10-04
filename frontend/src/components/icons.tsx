import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const SearchIcon = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const CartIcon = (p: P) => (<svg {...base} {...p}><path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2L20 8H6.2" /><circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" /></svg>);
export const TruckIcon = (p: P) => (<svg {...base} {...p}><path d="M2 6h11v10H2zM13 10h4.5L21 13v3h-8" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>);
export const CashIcon = (p: P) => (<svg {...base} {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v.01M18 14.5v.01" /></svg>);
export const ShieldIcon = (p: P) => (<svg {...base} {...p}><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>);
export const PhoneIcon = (p: P) => (<svg {...base} {...p}><path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19.9 14.5V18a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 5.3 2 2 0 0 1 5 4z" /></svg>);
export const PinIcon = (p: P) => (<svg {...base} {...p}><path d="M12 21s7-6 7-11.2A7 7 0 0 0 5 9.8C5 15 12 21 12 21z" /><circle cx="12" cy="10" r="2.5" /></svg>);
export const CheckIcon = (p: P) => (<svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const BellIcon = (p: P) => (<svg {...base} {...p}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></svg>);
export const MenuIcon = (p: P) => (<svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const TrashIcon = (p: P) => (<svg {...base} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9 7V4.5h6V7" /></svg>);
export const PlusIcon = (p: P) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const EditIcon = (p: P) => (<svg {...base} {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z" /></svg>);
export const ImageIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5.5-5 4 3.5 3-2.5L21 17" /></svg>);
export const GridIcon = (p: P) => (<svg {...base} {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>);
export const InstagramIcon = (p: P) => (<svg {...base} {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.8" /><path d="M17 7v.01" /></svg>);
export const FacebookIcon = (p: P) => (<svg {...base} {...p}><path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5L17 11h-3V9a.5.5 0 0 1 .5-.5z" /></svg>);
export const WhatsappIcon = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.3 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.900zm4.4-5.900c-.2-.1-1.400-.7-1.600-.8-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1a6.500 6.500 0 0 1-3.200-2.800c-.2-.4.2-.4.600-1.200.1-.2 0-.3 0-.5l-.7-1.700c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.200c0 1.300.9 2.600 1 2.800.1.200 1.800 2.800 4.400 3.900 1.600.7 2.300.7 3.100.6.500-.1 1.400-.6 1.600-1.100.2-.6.2-1 .1-1.100l-.5-.3z" /></svg>);
export const BoxIcon = (p: P) => (<svg {...base} {...p}><path d="m3.5 7.5 8.5-4 8.5 4v9l-8.5 4-8.5-4z" /><path d="m3.5 7.5 8.5 4 8.5-4M12 11.500v9" /></svg>);
export const LogoutIcon = (p: P) => (<svg {...base} {...p}><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.500 1.500 0 0 0 1.500 1.500H14M10 12h10m-3-3.500L20.500 12 17 15.500" /></svg>);

/** Decorative cookware line-art for the hero when no banner image exists. */
export const PotArt = (p: P) => (
  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M44 92h112v34a38 38 0 0 1-38 38H82a38 38 0 0 1-38-38z" />
    <path d="M44 104H26a6 6 0 0 0 0 12h18M156 104h18a6 6 0 0 1 0 12h-18" />
    <path d="M62 92c0-14 17-24 38-24s38 10 38 24" />
    <path d="M100 68V56m-6 0h12" />
    <path d="M80 40c-6-8 6-12 0-20M100 36c-6-8 6-12 0-20M120 40c-6-8 6-12 0-20" opacity=".7" />
    <path d="M70 130c4 12 14 20 30 20" opacity=".5" />
  </svg>
);
