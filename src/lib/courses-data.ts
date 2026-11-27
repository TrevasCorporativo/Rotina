export interface CourseLesson {
  id: string;
  module: string;
  title: string;
  duration: string;
  youtubeId: string;
  summary: string[];
  exercise: string;
}

export interface CourseTip {
  id: string;
  category: 'Voz & Dicção' | 'Presença' | 'Estrutura' | 'Anti-Vícios';
  title: string;
  description: string;
}

export interface CourseDefinition {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  lessons: CourseLesson[];
  quickTips: CourseTip[];
}

export const COURSES: CourseDefinition[] = [
  {
    id: 'oratoria-comunicacao',
    title: 'Oratória & Comunicação de Impacto',
    subtitle: 'Domine a voz, elimine vícios de linguagem, vença o nervosismo e fale com autoridade.',
    level: 'Completo · Vídeo + Prática',
    lessons: [
      {
        id: 'aula-1-presenca',
        module: 'Módulo 1 · Base e Presença',
        title: '1. Postura, respiração e domínio do nervosismo',
        duration: 'Vídeo-aula + prática',
        youtubeId: 'RgXZ9ZPLZrc',
        summary: [
          'Antes de falar, firme os dois pés no chão, alinhe os ombros e faça 3 respirações diafragmáticas (expandindo a barriga, não o peito).',
          'O nervosismo não é sinal de incompetência; é adrenalina. Use a pausa de 2 segundos antes da primeira frase para assumir o controle.',
          'Olhe nos olhos das pessoas (ou alterne 3 pontos da sala) — quem evita o olhar transmite insegurança mesmo dominando o assunto.',
        ],
        exercise:
          'Antes da sua próxima conversa importante hoje, respire fundo por 4 segundos, solte em 6 segundos e só então comece a falar.',
      },
      {
        id: 'aula-2-clube',
        module: 'Módulo 1 · Base e Presença',
        title: '2. Segurança, clareza e linguagem corporal',
        duration: 'Vídeo-aula + prática',
        youtubeId: 'eQ4w2Zx_QN4',
        summary: [
          'Gesticule na "caixa de força" (entre a cintura e os ombros) com palmas abertas — mãos escondidas no bolso ou braços cruzados criam barreira.',
          'Fale com frases curtas e diretas: uma ideia por frase evita que você se perca no meio do raciocínio.',
          'Sorriso leve e expressão facial coerente com o assunto conectam muito mais do que tentar parecer "robô sério".',
        ],
        exercise:
          'Grave um áudio ou vídeo de 60 segundos no celular explicando o que você faz no trabalho, cuidando da postura e das mãos.',
      },
      {
        id: 'aula-3-voz-diccao',
        module: 'Módulo 2 · Voz, Dicção e Vícios',
        title: '3. Técnica de voz, dicção e corte de vícios ("ééé", "né", "tipo")',
        duration: 'Vídeo-aula + prática',
        youtubeId: 's35UNYkqgZQ',
        summary: [
          'Articule bem as consoantes e abra a boca ao falar: quem fala "para dentro" passa insegurança.',
          'Substitua muletas sonoras ("ééé", "tipo assim", "né?", "então") por silêncio de 1 segundo. Pausa transmite autoridade.',
          'Varie o volume e o ritmo nas palavras-chave para não soar monótono.',
        ],
        exercise:
          'Leia 1 página de um livro em voz alta articulando cada sílaba de forma exagerada (ou com uma caneta limpa entre os dentes por 1 minuto) para destravar a dicção.',
      },
      {
        id: 'aula-4-estrutura',
        module: 'Módulo 3 · Estrutura e Storytelling',
        title: '4. Como estruturar qualquer fala e prender a atenção',
        duration: 'Vídeo-aula + prática',
        youtubeId: 'e4DRG58M05g',
        summary: [
          'Use a fórmula PREP para responder qualquer pergunta com clareza: Ponto (sua ideia central) → Razão (por quê) → Exemplo (caso real) → Ponto (conclusão).',
          'Comece com um gancho (uma pergunta, um dado forte ou uma situação real) em vez de começar pedindo desculpas.',
          'Termine com uma frase firme e clara — nunca termine com "é isso aí, galera...".',
        ],
        exercise:
          'Escolha um tema do seu dia e fale por 1 minuto usando PREP (Ponto, Razão, Exemplo, Ponto) no cronômetro aqui da Escola.',
      },
      {
        id: 'aula-5-persuasao',
        module: 'Módulo 4 · Comunicação no Dia a Dia',
        title: '5. Comunicação persuasiva, reuniões e conversas difíceis',
        duration: 'Vídeo-aula + prática',
        youtubeId: 'iDOsZ7EKBJY',
        summary: [
          'Ouvir ativamente antes de responder dobra a força do seu argumento: valide o ponto da outra pessoa antes de apresentar o seu.',
          'Em reuniões ou negociações, vá direto ao impacto prático antes de entrar nos detalhes técnicos.',
          'Firmeza não é agressividade: tom calmo, ritmo constante e olhar firme convencem muito mais que falar alto.',
        ],
        exercise:
          'Na próxima reunião ou conversa, faça 1 pausa de 2 segundos antes de responder e use frases curtas sem "acho que" ou "desculpa".',
      },
    ],
    quickTips: [
      {
        id: 'tip-aquecimento',
        category: 'Voz & Dicção',
        title: 'Aquecimento vocal de 60 segundos',
        description:
          'Faça vibração labial ("brrrrr") por 20s, boceje para relaxar a garganta e fale 3 trava-línguas antes de gravar ou apresentar.',
      },
      {
        id: 'tip-silencio',
        category: 'Anti-Vícios',
        title: 'Troque o "né" e "tipo" pelo silêncio',
        description:
          'Quando sentir que vai falar "ééé" ou "né", feche a boca por 1 segundo. Para quem ouve, parece confiança e domínio.',
      },
      {
        id: 'tip-prep',
        category: 'Estrutura',
        title: 'Fórmula PREP para improviso',
        description:
          '1) Diga sua posição direta · 2) Explique o porquê · 3) Dê 1 exemplo prático · 4) Feche repetindo a ideia central.',
      },
      {
        id: 'tip-olhar',
        category: 'Presença',
        title: 'Regra dos primeiros 10 segundos',
        description:
          'Não comece falando enquanto anda ou se ajeita. Pare, respire, olhe para as pessoas e só então diga a primeira palavra.',
      },
    ],
  },
];

