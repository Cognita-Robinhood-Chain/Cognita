/** Link akun X (Twitter) resmi Cognita. Isi NEXT_PUBLIC_X_URL di .env.local,
 *  mis. https://x.com/<handle-final> -- sampai diisi (handle final belum dikonfirmasi; fallback = akun lama), tombol di header membuka x.com. */
export const X_URL = process.env.NEXT_PUBLIC_X_URL || 'https://x.com/wageholdX';
