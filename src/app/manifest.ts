import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Modo Sobrevivência — Gestão da vida adulta',
    short_name: 'Sobrevivência',
    description: 'Organize tarefas, compromissos e sua rotina pessoal com privacidade e lembretes.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f6f8',
    theme_color: '#268675',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

