import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orocash · Control de Inventario POP',
  description: 'Dashboard interno de control de inventario POP, eventos y solicitudes — Orocash'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
