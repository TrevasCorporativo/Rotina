export interface CourseLesson {
  id: string;
  module: string;
  title: string;
  duration: string;
  youtubeId: string;
  summary: string[];
  exercise: string;
  checklist: string[];
}

export interface CourseTip {
  id: string;
  category: string;
  title: string;
  description: string;
}

export interface VocabularyWord {
  word: string;
  replaces: string;
  meaning: string;
  example: string;
}

export interface CourseDefinition {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  lessons: CourseLesson[];
  quickTips: CourseTip[];
  vocabulary?: VocabularyWord[];
}

export interface GeneratedActivity {
  id: string;
  area: 'Oratória' | 'Comunicação' | 'Gestos' | 'Vocabulário';
  title: string;
  steps: string[];
  durationSec: number;
}

export const GENERATED_ACTIVITIES: GeneratedActivity[] = [
  {
    id: 'act-prep',
    area: 'Oratória',
    title: 'Treino PREP de 60 segundos',
    steps: [
      'Escolha um tema do seu trabalho ou rotina.',
      'Fale por 60s seguindo: Ponto → Razão → Exemplo → Ponto.',
      'Substitua qualquer "ééé" ou "né" por 1 segundo de silêncio.',
    ],
    durationSec: 60,
  },
  {
    id: 'act-gestos',
    area: 'Gestos',
    title: 'Caixa de Gestos no Espelho',
    steps: [
      'Fique em pé diante do espelho com os pés firmes na largura dos ombros.',
      'Explique um assunto por 60s mantendo as mãos entre a cintura e o peito.',
      'Use palmas abertas ao enfatizar 3 palavras-chave.',
    ],
    durationSec: 60,
  },
  {
    id: 'act-nao',
    area: 'Comunicação',
    title: 'Dizer "Não" com Firmeza e Respeito',
    steps: [
      'Pense em um pedido que você costuma aceitar por pressão.',
      'Fale em voz alta: "Agradeço o convite, mas neste momento não consigo assumir esse compromisso."',
      'Repita 3 vezes sem pedir desculpas excessivas.',
    ],
    durationSec: 30,
  },
  {
    id: 'act-vocab',
    area: 'Vocabulário',
    title: 'Substituição de Palavras Fracas',
    steps: [
      'Escolha 2 palavras novas da aba Vocabulário (ex: "elucidar" e "conciso").',
      'Crie em voz alta 2 frases reais que você poderia usar hoje numa reunião ou conversa.',
      'Grave um áudio de 30s usando as duas naturalmente.',
    ],
    durationSec: 30,
  },
  {
    id: 'act-diccao',
    area: 'Oratória',
    title: 'Aquecimento Vocal + Articulação',
    steps: [
      'Faça 20s de vibração labial ("brrrrr") para soltar a voz.',
      'Leia 1 parágrafo em voz alta abrindo bem a boca e marcando cada consoante.',
      'Fale 3 vezes: "O rato roeu a roupa do rei de Roma" com clareza.',
    ],
    durationSec: 60,
  },
];

export const COURSES: CourseDefinition[] = [
  {
    id: 'oratoria-comunicacao',
    title: 'Oratória & Falar em Público',
    shortTitle: 'Oratória',
    subtitle: 'Domine a voz, elimine vícios de linguagem, vença o nervosismo e fale com autoridade.',
    lessons: [
      {
        id: 'aula-1-presenca',
        module: 'Módulo 1 · Base e Presença',
        title: '1. Postura, respiração e domínio do nervosismo',
        duration: 'Vídeo + prática',
        youtubeId: 'RgXZ9ZPLZrc',
        summary: [
          'Antes de falar, firme os dois pés no chão, alinhe os ombros e faça 3 respirações diafragmáticas.',
          'Use uma pausa de 2 segundos antes da primeira frase para assumir o controle do ambiente.',
          'Olhe nos olhos das pessoas (ou alterne 3 pontos da sala) para transmitir segurança.',
        ],
        exercise:
          'Antes da sua próxima conversa importante hoje, respire fundo por 4s, solte em 6s e só então comece a falar.',
        checklist: [
          'Assistir à vídeo-aula completa',
          'Fazer 3 respirações diafragmáticas em pé',
          'Aplicar a pausa de 2s antes de falar hoje',
        ],
      },
      {
        id: 'aula-2-clube',
        module: 'Módulo 1 · Base e Presença',
        title: '2. Segurança, clareza e postura de autoridade',
        duration: 'Vídeo + prática',
        youtubeId: 'eQ4w2Zx_QN4',
        summary: [
          'Fale com frases curtas e diretas: uma ideia por frase evita que você se perca.',
          'Evite pedir desculpas antes de começar ("desculpa, eu tô meio nervoso...").',
          'Expressão facial coerente com o assunto conecta muito mais que parecer rígido.',
        ],
        exercise:
          'Grave um vídeo de 60 segundos explicando o que você faz no trabalho, olhando direto para a câmera.',
        checklist: [
          'Assistir à vídeo-aula',
          'Gravar vídeo de 60s olhando para a lente',
          'Rever o vídeo observando sua postura',
        ],
      },
      {
        id: 'aula-3-voz-diccao',
        module: 'Módulo 2 · Voz e Dicção',
        title: '3. Técnica de voz, dicção e corte de vícios ("ééé", "né")',
        duration: 'Vídeo + prática',
        youtubeId: 's35UNYkqgZQ',
        summary: [
          'Articule bem as consoantes e abra a boca ao falar: falar "para dentro" passa insegurança.',
          'Substitua muletas sonoras ("ééé", "tipo assim", "né?") por silêncio de 1 segundo.',
          'Varie o volume e o ritmo nas palavras-chave para prender a atenção.',
        ],
        exercise:
          'Leia 1 página em voz alta articulando cada sílaba de forma exagerada por 1 minuto.',
        checklist: [
          'Assistir à aula de voz e dicção',
          'Ler 1 página em voz alta articulando bem',
          'Contar quantos "né/ééé" você evita hoje',
        ],
      },
      {
        id: 'aula-4-estrutura',
        module: 'Módulo 3 · Estrutura',
        title: '4. Como estruturar qualquer fala (PREP e Storytelling)',
        duration: 'Vídeo + prática',
        youtubeId: 'e4DRG58M05g',
        summary: [
          'Fórmula PREP: Ponto (ideia central) → Razão (por quê) → Exemplo (caso real) → Ponto (fecho).',
          'Comece com um gancho forte em vez de enrolação.',
          'Termine com uma frase firme e clara — nunca com "é isso aí...".',
        ],
        exercise:
          'Escolha um tema do seu dia e fale por 1 minuto usando PREP no cronômetro.',
        checklist: [
          'Assistir à aula de estruturação',
          'Montar 1 resposta usando a fórmula PREP',
          'Treinar 1 minuto no cronômetro',
        ],
      },
      {
        id: 'aula-5-persuasao',
        module: 'Módulo 4 · Dia a Dia',
        title: '5. Comunicação persuasiva em reuniões e conversas',
        duration: 'Vídeo + prática',
        youtubeId: 'iDOsZ7EKBJY',
        summary: [
          'Ouvir ativamente antes de responder dobra a força do seu argumento.',
          'Em reuniões, vá direto ao impacto prático antes dos detalhes técnicos.',
          'Firmeza não é agressividade: tom calmo e ritmo constante convencem mais.',
        ],
        exercise:
          'Na próxima conversa ou reunião, faça 1 pausa de 2 segundos antes de responder.',
        checklist: [
          'Assistir à aula final do módulo',
          'Praticar escuta ativa sem interromper',
          'Dar uma resposta direta sem "acho que"',
        ],
      },
    ],
    quickTips: [
      {
        id: 'tip-aquecimento',
        category: 'Voz & Dicção',
        title: 'Aquecimento vocal de 60 segundos',
        description:
          'Faça vibração labial ("brrrrr") por 20s, boceje para relaxar a garganta e fale 3 trava-línguas antes de apresentar.',
      },
      {
        id: 'tip-silencio',
        category: 'Anti-Vícios',
        title: 'Troque o "né" pelo silêncio',
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
    ],
  },
  {
    id: 'comunicacao-assertiva',
    title: 'Comunicação Assertiva & Clareza',
    shortTitle: 'Comunicação',
    subtitle: 'Expresse ideias, imponha limites e conduza conversas difíceis sem ser passivo nem agressivo.',
    lessons: [
      {
        id: 'com-1-assertividade',
        module: 'Módulo 1 · Assertividade',
        title: '1. Como se expressar melhor com clareza e firmeza',
        duration: 'Vídeo + prática',
        youtubeId: '2LABVbAgStA',
        summary: [
          'Assertividade é o equilíbrio entre a passividade (engolir tudo) e a agressividade (atacar).',
          'Use mensagens na 1ª pessoa ("Eu percebi...", "Eu preciso...") em vez de acusar ("Você sempre...").',
          'Vá direto ao ponto: menos justificativas longas, mais clareza respeitosa.',
        ],
        exercise:
          'Reescreva uma mensagem ou conversa pendente usando clareza direta e sem rodeios.',
        checklist: [
          'Assistir à aula de assertividade',
          'Identificar onde você tem sido passivo demais',
          'Fazer 1 pedido ou limite claro hoje',
        ],
      },
      {
        id: 'com-2-estrategias',
        module: 'Módulo 2 · Conversas Difíceis',
        title: '2. Estratégias para dizer "Não" e manter o respeito',
        duration: 'Vídeo + prática',
        youtubeId: 'tShf6BaN1rw',
        summary: [
          'Dizer "não" sem culpa protege o seu tempo e os seus compromissos reais.',
          'Pause antes de reagir quando algo te irritar — emoção alta destrói o diálogo.',
          'Valide o outro antes de discordar: "Entendo seu ponto; por outro lado, vejo que..."',
        ],
        exercise:
          'Treine em voz alta 3 formas educadas e firmes de recusar algo sem inventar desculpas.',
        checklist: [
          'Assistir à aula de estratégias',
          'Treinar 3 respostas firmes de recusa',
          'Pausar 3 segundos antes de responder sob tensão',
        ],
      },
    ],
    quickTips: [
      {
        id: 'com-tip-eu',
        category: 'Diálogo',
        title: 'Técnica do "Eu" em vez do "Você"',
        description:
          'Troque "Você nunca me escuta" por "Quando falamos com pressa, eu sinto que o assunto fica mal resolvido". Reduz a defesa do outro.',
      },
      {
        id: 'com-tip-nao',
        category: 'Limites',
        title: 'Não se justifique demais',
        description:
          'Quanto mais desculpas você inventa para dizer não, mais espaço dá para o outro insistir. Seja breve e educado.',
      },
    ],
  },
  {
    id: 'gestos-presenca',
    title: 'Linguagem Corporal & Gestos',
    shortTitle: 'Gesticular',
    subtitle: 'Aprenda o que fazer com as mãos, postura, olhar e presença para transmitir confiança.',
    lessons: [
      {
        id: 'ges-1-maos',
        module: 'Módulo 1 · Uso das Mãos',
        title: '1. Como gesticular bem e dominar a "Caixa de Gestos"',
        duration: 'Vídeo + prática',
        youtubeId: '5XsEQyLFzjQ',
        summary: [
          'Mantenha os gestos entre a linha da cintura e o peito ("caixa de gestos") — natural e firme.',
          'Palmas levemente abertas transmitem honestidade; esconder as mãos no bolso gera desconfiança.',
          'Use gestos para ilustrar tamanhos, direções ou enumerar pontos ("primeiro, segundo, terceiro").',
        ],
        exercise:
          'Fale por 1 minuto enumerando 3 ideias usando os dedos e mantendo as mãos visíveis.',
        checklist: [
          'Assistir à aula sobre gestos',
          'Praticar 1 minuto na "caixa de gestos"',
          'Evitar cruzar os braços ou esconder as mãos hoje',
        ],
      },
      {
        id: 'ges-2-erros',
        module: 'Módulo 2 · Presença & Bloqueios',
        title: '2. Eliminando gestos parasitas e postura defensiva',
        duration: 'Vídeo + prática',
        youtubeId: 'xqWX_xO-vRw',
        summary: [
          'Corte manias que distraem: mexer em anel, estalar dedos, balançar o corpo ou ajeitar roupa sem parar.',
          'Evite apontar o dedo indicador diretamente para o rosto de quem ouve — use a mão aberta.',
          'Quando estiver parado ouvindo, descanse os braços naturalmente ao lado do corpo.',
        ],
        exercise:
          'Observe hoje qual gesto nervoso você mais repete e substitua por uma postura calma.',
        checklist: [
          'Assistir à aula de linguagem corporal',
          'Mapear 1 mania corporal sua para cortar',
          'Manter postura aberta na próxima conversa',
        ],
      },
    ],
    quickTips: [
      {
        id: 'ges-tip-caixa',
        category: 'Mãos',
        title: 'Regra da Caixa de Poder',
        description:
          'Gestos abaixo da cintura parecem inseguros; acima dos ombros parecem exagerados. O centro do tronco é a zona da autoridade.',
      },
      {
        id: 'ges-tip-ancora',
        category: 'Postura',
        title: 'Pés ancorados no chão',
        description:
          'Evite ficar balançando de um pé para o outro ("efeito pêndulo"). Firme os dois pés e só se mova com propósito.',
      },
    ],
  },
  {
    id: 'vocabulario-palavras',
    title: 'Vocabulário & Palavras Novas',
    shortTitle: 'Palavras Novas',
    subtitle: 'Enriqueça seu repertório, pare de repetir "coisa/tipo/muito" e fale com precisão e elegância.',
    lessons: [
      {
        id: 'voc-1-ampliar',
        module: 'Módulo 1 · Repertório',
        title: '1. Como enriquecer o vocabulário e parar de repetir palavras',
        duration: 'Vídeo + prática',
        youtubeId: 'G5s1qXe3xQg',
        summary: [
          'Substitua palavras-muleta genéricas ("coisa", "negócio", "muito bom", "legal") por termos precisos.',
          'Falar bem não é usar palavras difíceis para ostentar, mas escolher a palavra exata para cada ideia.',
          'Leia 10 minutos por dia prestando atenção em verbos e adjetivos diferentes.',
        ],
        exercise:
          'Escolha 2 palavras do Banco de Palavras Novas abaixo e use ambas em conversas reais hoje.',
        checklist: [
          'Assistir à aula de vocabulário',
          'Ler as 10 palavras novas da lista abaixo',
          'Usar pelo menos 2 palavras novas hoje',
        ],
      },
      {
        id: 'voc-2-registro',
        module: 'Módulo 2 · Fixação Ativa',
        title: '2. Método do registro ativo para nunca mais esquecer palavras',
        duration: 'Vídeo + prática',
        youtubeId: 'VtMGkOjebxw',
        summary: [
          'O cérebro só fixa uma palavra nova quando você cria uma frase sua com ela no mesmo dia.',
          'Anote no menu Anotações as expressões novas que ouvir em livros ou conversas.',
          'Prefira verbos fortes ("elucidar", "ponderar", "aprimorar") em vez de expressões vagas.',
        ],
        exercise:
          'Escreva nas anotações desta aula 3 frases próprias usando palavras novas do banco.',
        checklist: [
          'Assistir à aula de fixação',
          'Escrever 3 frases próprias nas anotações',
          'Revisar suas frases em voz alta',
        ],
      },
    ],
    quickTips: [
      {
        id: 'voc-tip-1',
        category: 'Precisão',
        title: 'Corte o "muito + adjetivo"',
        description:
          'Em vez de "muito cansado", use "exausto"; em vez de "muito claro", use "evidente" ou "nítido"; em vez de "muito importante", use "essencial" ou "crucial".',
      },
      {
        id: 'voc-tip-2',
        category: 'Hábito',
        title: 'Regra de 1 palavra por dia',
        description:
          'Não tente decorar 20 palavras de uma vez. Escolha 1 palavra por manhã e force-se a usá-la 2 vezes no dia.',
      },
    ],
    vocabulary: [
      {
        word: 'Elucidar',
        replaces: 'explicar melhor / deixar claro',
        meaning: 'Tornar algo claro, compreensível, esclarecer uma dúvida.',
        example: 'Gostaria de elucidar esse ponto antes de fecharmos a decisão.',
      },
      {
        word: 'Conciso',
        replaces: 'curto / resumido',
        meaning: 'Que expressa muito em poucas palavras, sem enrolação.',
        example: 'Vou ser conciso para respeitar o tempo de todos.',
      },
      {
        word: 'Ponderar',
        replaces: 'pensar bem / pesar',
        meaning: 'Avaliar com calma e equilíbrio os prós e contras.',
        example: 'Precisamos ponderar os riscos antes de dar esse passo.',
      },
      {
        word: 'Congruente',
        replaces: 'que combina / coerente',
        meaning: 'Que está em harmonia; quando atitude e fala dizem a mesma coisa.',
        example: 'A atitude dele foi totalmente congruente com o que prometeu.',
      },
      {
        word: 'Discernimento',
        replaces: 'noção / sabedoria',
        meaning: 'Capacidade de julgar com clareza e distinguir o certo do errado.',
        example: 'Peço discernimento para tomar a melhor decisão hoje.',
      },
      {
        word: 'Diligente',
        replaces: 'esforçado / cuidadoso',
        meaning: 'Que age com zelo, atenção, rapidez e capricho.',
        example: 'Ele é um profissional extremamente diligente nas entregas.',
      },
      {
        word: 'Perspicaz',
        replaces: 'esperto / ligado',
        meaning: 'Quem percebe detalhes e entende situações com rapidez.',
        example: 'Foi uma observação muito perspicaz da sua parte.',
      },
      {
        word: 'Integro',
        replaces: 'honesto / correto',
        meaning: 'Pessoa reta, completa, que não se corrompe nem vive de aparência.',
        example: 'Quero ser um homem íntegro em todas as áreas.',
      },
      {
        word: 'Alinhar',
        replaces: 'combinar / acertar',
        meaning: 'Colocar expectativas ou ideias na mesma direção.',
        example: 'Vamos alinhar as prioridades da semana hoje cedo.',
      },
      {
        word: 'Crucial',
        replaces: 'muito importante',
        meaning: 'Decisivo, fundamental para o resultado.',
        example: 'Esse detalhe é crucial para o projeto funcionar.',
      },
    ],
  },
];
