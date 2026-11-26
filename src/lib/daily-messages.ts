export interface DailyVerse {
  reference: string;
  text: string;
}

const MOTIVATIONAL_MESSAGES: string[] = [
  'Um passo de cada vez também te leva longe. Respire fundo e comece pelo mais importante.',
  'Constância vence intensidade. O pouco feito hoje constrói a paz de amanhã.',
  'Você não precisa resolver a vida inteira hoje — só o que está ao seu alcance agora.',
  'Organizar o dia é um ato de cuidado com você e com quem você ama.',
  'Pequenos avanços diários viram grandes conquistas quando você não desiste.',
  'Foque no que depende de você hoje e entregue o resto com leveza.',
  'Cada tarefa concluída é um peso a menos na mente. Comece pela menor se precisar.',
  'Dias difíceis também passam, mas o que você constrói com paciência permanece.',
  'Sua disciplina de hoje é a tranquilidade da sua noite.',
  'Não espere o cenário perfeito para agir: faça o melhor possível com o hoje.',
  'Cuidar da sua rotina é cuidar dos seus sonhos na prática.',
  'Mesmo em dias corridos, faça pausas curtas para lembrar por que você começou.',
  'A calma vem quando tiramos as coisas da cabeça e colocamos no plano.',
  'Hoje é uma nova chance de fazer diferente, com mais foco e menos ansiedade.',
  'Você já superou dias que pareciam impossíveis. Hoje também vai dar conta.',
  'Menos pressa, mais direção. Uma coisa bem feita vale por dez pela metade.',
  'Valorize cada pequeno progresso — eles são a prova de que você está caminhando.',
  'Que hoje não falte coragem para começar e serenidade para concluir.',
  'A vida fica mais leve quando cada compromisso tem seu lugar e sua hora.',
  'Faça hoje algo pelo qual o seu eu de amanhã vai agradecer.',
  'Grandes mudanças nascem de decisões simples repetidas todos os dias.',
  'Não se cobre perfeição; busque presença e constância.',
  'Quando o dia parecer cheio, priorize o essencial e solte o urgente falso.',
  'Você é mais capaz do que o cansaço de ontem tentou te fazer acreditar.',
  'Um bom dia começa com clareza no coração e um plano simples no papel.',
  'Avance no seu ritmo, sem se comparar. O seu caminho é único.',
  'Proteja sua paz, organize seu tempo e celebre cada vitória do dia.',
  'O segredo não é ter tempo sobrando, é escolher bem onde colocar sua energia.',
  'Comece antes que a dúvida cresça. O movimento traz clareza.',
  'Que hoje haja foco no trabalho, leveza na alma e gratidão nos detalhes.',
  'Cada manhã renova a oportunidade de escrever um dia melhor.',
];

const DAILY_VERSES: DailyVerse[] = [
  {
    reference: 'Salmos 118:24',
    text: 'Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.',
  },
  {
    reference: 'Provérbios 16:3',
    text: 'Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.',
  },
  {
    reference: 'Filipenses 4:6-7',
    text: 'Não andem ansiosos por coisa alguma, mas em tudo, pela oração e súplicas, apresentem seus pedidos a Deus.',
  },
  {
    reference: 'Isaías 41:10',
    text: 'Não tema, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o ajudarei.',
  },
  {
    reference: 'Jeremias 29:11',
    text: 'Porque sou eu que conheço os planos que tenho para vocês, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.',
  },
  {
    reference: 'Salmos 23:1',
    text: 'O Senhor é o meu pastor; de nada terei falta.',
  },
  {
    reference: 'Mateus 6:34',
    text: 'Portanto, não se preocupem com o amanhã, pois o amanhã trará as suas próprias preocupações. Basta a cada dia o seu próprio mal.',
  },
  {
    reference: 'Josué 1:9',
    text: 'Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.',
  },
  {
    reference: 'Salmos 37:5',
    text: 'Entregue o seu caminho ao Senhor; confie nele, e ele agirá.',
  },
  {
    reference: 'Romanos 8:28',
    text: 'Sabemos que Deus age em todas as coisas para o bem daqueles que o amam.',
  },
  {
    reference: '1 Coríntios 16:14',
    text: 'Façam tudo com amor.',
  },
  {
    reference: 'Salmos 46:1',
    text: 'Deus é o nosso refúgio e a nossa fortaleza, auxílio sempre presente na adversidade.',
  },
  {
    reference: 'Lamentações 3:22-23',
    text: 'As misericórdias do Senhor são a causa de não sermos consumidos; renovam-se cada manhã. Grande é a sua fidelidade.',
  },
  {
    reference: 'Provérbios 3:5-6',
    text: 'Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento; reconheça o Senhor em todos os seus caminhos, e ele endireitará as suas veredas.',
  },
  {
    reference: 'Filipenses 4:13',
    text: 'Tudo posso naquele que me fortalece.',
  },
  {
    reference: 'Salmos 121:1-2',
    text: 'Levanto os meus olhos para os montes e pergunto: De onde me vem o socorro? O meu socorro vem do Senhor, que fez os céus e a terra.',
  },
  {
    reference: 'Mateus 11:28',
    text: 'Venham a mim, todos os que estão cansados e sobrecarregados, e eu darei descanso a vocês.',
  },
  {
    reference: 'Salmos 27:1',
    text: 'O Senhor é a minha luz e a minha salvação; de quem terei temor?',
  },
  {
    reference: 'Colossenses 3:23',
    text: 'Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens.',
  },
  {
    reference: 'Isaías 40:31',
    text: 'Mas aqueles que esperam no Senhor renovam as suas forças. Voam alto como águias; correm e não ficam exaustos.',
  },
  {
    reference: 'Salmos 91:1-2',
    text: 'Aquele que habita no abrigo do Altíssimo descansará à sombra do Todo-poderoso.',
  },
  {
    reference: 'Tiago 1:5',
    text: 'Se algum de vocês tem falta de sabedoria, peça-a a Deus, que a todos dá livremente, de boa vontade.',
  },
  {
    reference: 'Salmos 16:8',
    text: 'Sempre tenho o Senhor diante de mim. Com ele à minha direita, não serei abalado.',
  },
  {
    reference: 'Efésios 4:32',
    text: 'Sejam bondosos e compassivos uns para com os outros, perdoando-se mutuamente.',
  },
  {
    reference: 'Salmos 34:8',
    text: 'Provem e vejam como o Senhor é bom. Como é feliz o homem que nele se refugia!',
  },
  {
    reference: '2 Timóteo 1:7',
    text: 'Pois Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.',
  },
  {
    reference: 'Salmos 119:105',
    text: 'A tua palavra é lâmpada que ilumina os meus passos e luz que clareia o meu caminho.',
  },
  {
    reference: 'Gálatas 6:9',
    text: 'E não nos cansemos de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos.',
  },
  {
    reference: 'Salmos 139:14',
    text: 'Eu te louvo porque me fizeste de modo especial e admirável. Tuas obras são maravilhosas!',
  },
  {
    reference: '1 Pedro 5:7',
    text: 'Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.',
  },
  {
    reference: 'João 14:27',
    text: 'Deixo a paz a vocês; a minha paz dou a vocês. Não a dou como o mundo a dá. Não se perturbe o seu coração.',
  },
];

export function getDayOfYearIndex(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export function getDailyMotivation(dateStr: string): string {
  const idx = getDayOfYearIndex(dateStr);
  return MOTIVATIONAL_MESSAGES[idx % MOTIVATIONAL_MESSAGES.length];
}

export function getDailyVerse(dateStr: string): DailyVerse {
  const idx = getDayOfYearIndex(dateStr);
  return DAILY_VERSES[idx % DAILY_VERSES.length];
}

