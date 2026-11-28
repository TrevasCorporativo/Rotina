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

export type CourseCategory = 'Comunicação & Oratória' | 'Teologia' | 'Pregação';

export interface CourseDefinition {
  id: string;
  category: CourseCategory;
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
    category: 'Comunicação & Oratória',
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
    category: 'Comunicação & Oratória',
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
    category: 'Comunicação & Oratória',
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
    category: 'Comunicação & Oratória',
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
  {
    id: 'teologia-sistematica',
    category: 'Teologia',
    title: 'Teologia · Básico ao Avançado',
    shortTitle: 'Teologia',
    subtitle: 'O que estudar na Bíblia, Doutrina de Deus, Cristo, Salvação, Espírito Santo e Escatologia.',
    lessons: [
      {
        id: 'teo-1-bibliologia',
        module: 'Nível Básico · Bibliologia',
        title: '1. Como estudar a Bíblia e panorama das Escrituras',
        duration: 'Vídeo + estudo',
        youtubeId: '4q_yhkfp6MA',
        summary: [
          'A Bíblia é uma biblioteca de 66 livros (39 no AT, 27 no NT) com um único centro: Jesus Cristo.',
          'Nunca leia um versículo isolado: observe sempre o contexto histórico, literário e a quem foi escrito.',
          'Ordem recomendada para dominar a Bíblia: Evangelhos → Atos e Cartas → Pentateuco → Livros Históricos → Salmos/Provérbios → Profetas.',
        ],
        exercise:
          'Escolha 1 capítulo de João hoje e anote: 1) Quem fala? 2) Para quem? 3) O que ensina sobre Jesus?',
        checklist: [
          'Assistir à aula introdutória de teologia',
          'Entender a divisão dos 66 livros',
          'Aplicar a regra do contexto em 1 capítulo hoje',
        ],
      },
      {
        id: 'teo-2-soteriologia',
        module: 'Nível Intermediário · Deus, Cristo & Salvação',
        title: '2. Trindade, Pessoa de Cristo e Doutrina da Graça',
        duration: 'Vídeo + estudo',
        youtubeId: '3j0Q7WJ9M4U',
        summary: [
          'Teologia Própria: Deus é Santo, Soberano, Justo e Amor — um só Deus em três Pessoas (Pai, Filho e Espírito Santo).',
          'Cristologia: Jesus é 100% Deus e 100% homem; Sua cruz pagou nossa dívida e Sua ressurreição garantiu nossa nova vida.',
          'Soteriologia: somos salvos pela graça mediante a fé (Ef 2:8-9), para boas obras e santificação diária.',
        ],
        exercise:
          'Leia Romanos 5 e 8 anotando 3 benefícios reais da justificação pela fé.',
        checklist: [
          'Assistir à aula doutrinária',
          'Ler Romanos 5 e 8 com atenção',
          'Escrever um resumo com suas próprias palavras',
        ],
      },
      {
        id: 'teo-3-escatologia',
        module: 'Nível Avançado · Igreja & Escatologia',
        title: '3. Pneumatologia, Eclesiologia e Últimos Dias',
        duration: 'Vídeo + estudo',
        youtubeId: '4q_yhkfp6MA',
        summary: [
          'Espírito Santo: habita no crente, convence do pecado, produz o fruto do Espírito (Gl 5:22) e capacita para o serviço.',
          'Igreja: não é prédio, é o Corpo de Cristo chamado à comunhão, discipulado e missão.',
          'Escatologia: vigilância, fidelidade e esperança na volta visível de Cristo e nos novos céus e nova terra.',
        ],
        exercise:
          'Compare Gálatas 5:16-25 com a sua rotina atual e ore pedindo direção do Espírito.',
        checklist: [
          'Estudar o fruto do Espírito em Gálatas 5',
          'Anotar 1 área prática para alinhar com a Palavra',
          'Revisar os 3 níveis do curso',
        ],
      },
    ],
    quickTips: [
      {
        id: 'teo-tip-1',
        category: 'Hermenêutica',
        title: 'Texto sem contexto vira pretexto',
        description:
          'Sempre leia pelo menos 5 versículos antes e 5 depois do texto que você quer entender ou ensinar.',
      },
      {
        id: 'teo-tip-2',
        category: 'O que estudar',
        title: 'Comece pelos pilares antes das polêmicas',
        description:
          'Domine primeiro os Evangelhos, Romanos, Efésios e Salmos antes de gastar energia em debates secundários.',
      },
    ],
  },
  {
    id: 'pregacao-homiletica',
    category: 'Pregação',
    title: 'Formação de Pregadores · Homilética',
    shortTitle: 'Pregação',
    subtitle: 'Do básico ao avançado: exegese, estrutura de sermão, aplicação e entrega no púlpito.',
    lessons: [
      {
        id: 'preg-1-base',
        module: 'Nível Básico · Preparo & Exegese',
        title: '1. O chamado, vida no altar e escolha do texto bíblico',
        duration: 'Vídeo + prática',
        youtubeId: 'eHoXVfVaJgs',
        summary: [
          'O sermão começa no joelho: nunca pregue algo que ainda não confrontou o seu próprio coração.',
          'Exegese simples: pergunte ao texto "O que isso significou lá atrás?" antes de perguntar "O que significa hoje?".',
          'Defina a Ideia Central do Sermão em uma única frase clara e memorável.',
        ],
        exercise:
          'Escolha um texto curto (ex: Salmo 23 ou Marcos 4:35-41) e resuma a mensagem central em 1 frase.',
        checklist: [
          'Assistir à aula de preparo e homilética',
          'Escolher 1 texto bíblico curto',
          'Escrever a Ideia Central em 1 frase',
        ],
      },
      {
        id: 'preg-2-estrutura',
        module: 'Nível Intermediário · Construção do Sermão',
        title: '2. Introdução, tópicos lógicos, ilustrações e conclusão',
        duration: 'Vídeo + prática',
        youtubeId: '45gD-gb4cRs',
        summary: [
          'Introdução (10%): prenda a atenção com uma pergunta ou situação real e leia o texto com clareza.',
          'Desenvolvimento (80%): divida em 2 ou 3 tópicos claros extraídos diretamente do texto (Sermão Expositivo).',
          'Conclusão (10%): recapitule em 30 segundos, traga aplicação prática e faça um apelo claro ao arrependimento e fé.',
        ],
        exercise:
          'Monte um esboço completo em 3 tópicos usando o texto escolhido na Aula 1.',
        checklist: [
          'Assistir à aula de estruturação',
          'Escrever Introdução + 3 tópicos + Conclusão',
          'Adicionar 1 ilustração real do cotidiano',
        ],
      },
      {
        id: 'preg-3-pulpito',
        module: 'Nível Avançado · Púlpito & Aplicação',
        title: '3. Sermão expositivo, postura no púlpito e dependência do Espírito',
        duration: 'Vídeo + prática',
        youtubeId: 'eHoXVfVaJgs',
        summary: [
          'Pregador não é ator nem palestrante motivacional: fale a Palavra com autoridade, simplicidade e compaixão.',
          'Use pausas após ler o texto e antes da aplicação final — o silêncio deixa o Espírito trabalhar na consciência.',
          'Evite jargões vazios; explique verdades profundas em linguagem que qualquer pessoa entenda.',
        ],
        exercise:
          'Pregue o seu esboço de 3 minutos em voz alta no quarto ou gravando no celular para revisar sua clareza.',
        checklist: [
          'Revisar seu esboço com foco em Cristo',
          'Treinar a entrega em voz alta por 3 minutos',
          'Orar antes de falar em público',
        ],
      },
    ],
    quickTips: [
      {
        id: 'preg-tip-1',
        category: 'Sermão Expositivo',
        title: 'Deixe o texto ditar os tópicos',
        description:
          'Em vez de inventar um tema e forçar versículos, siga a ordem natural do próprio parágrafo bíblico.',
      },
      {
        id: 'preg-tip-2',
        category: 'Púlpito',
        title: 'Clareza acima de eloquência',
        description:
          'O melhor pregador não é o que fala palavras difíceis, mas o que faz o povo sair entendendo a Bíblia e querendo obedecer a Deus.',
      },
    ],
  },
];
