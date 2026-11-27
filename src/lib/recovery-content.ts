export interface ConfrontationCard {
  id: string;
  pillar: 'Graça & Temor' | 'Homem & Marido' | 'Família & Honra' | 'Verdade Crua';
  title: string;
  message: string;
  verse?: string;
}

export const CONFRONTATION_CARDS: ConfrontationCard[] = [
  {
    id: 'graca-1',
    pillar: 'Graça & Temor',
    title: 'Pare de usar a graça como desculpa',
    message:
      'Você diz que ama a Deus, mas quando está sozinho troca a presença dEle por minutos de lixo numa tela. A graça de Cristo não custou barato para você transformar em licença para pecar. Levante, feche essa porta e pare de brincar com o que custou a cruz.',
    verse: 'Tito 2:11-12 — "A graça de Deus se manifestou salvadora... ensinando-nos a renunciar à impiedade e às paixões mundanas."',
  },
  {
    id: 'graca-2',
    pillar: 'Graça & Temor',
    title: 'Aba anônima não esconde nada de Deus',
    message:
      'Você apaga o histórico, tranca a porta e acha que ninguém viu. Mas o Senhor viu cada clique, cada desculpa e cada vez que você preferiu a sujeira à obediência. Não chame de "fraqueza inocente" o que você escolhe alimentar.',
    verse: 'Provérbios 5:21 — "Os caminhos do homem estão diante dos olhos do Senhor, e ele examina todas as suas veredas."',
  },
  {
    id: 'marido-1',
    pillar: 'Homem & Marido',
    title: 'Olhe nos olhos da sua esposa',
    message:
      'Ela confia em você — e você vai entregar seus olhos, seu desejo e sua energia para pixels e estranhos? Isso não é alívio, é traição silenciosa da sua aliança. Seja homem de verdade: honre a mulher que está ao seu lado mesmo quando ela não está olhando.',
  },
  {
    id: 'homem-1',
    pillar: 'Homem & Marido',
    title: 'Homem que não se governa é escravo',
    message:
      'De que adianta ser forte no trabalho ou na frente dos outros se um desejo barato no quarto te coloca de joelhos? Enquanto você obedecer a qualquer impulso da carne, você não está no controle da própria vida. Domine a si mesmo hoje.',
  },
  {
    id: 'familia-1',
    pillar: 'Família & Honra',
    title: 'E se o seu secreto fosse projetado na sala?',
    message:
      'Pense nos seus pais, nos seus irmãos, nos seus sobrinhos, nos seus amigos. Você teria coragem de olhar no rosto de cada um deles se tudo o que você vê escondido aparecesse hoje? Pare de sustentar uma vida dupla. Sua família merece um homem inteiro, não uma fachada.',
  },
  {
    id: 'familia-2',
    pillar: 'Família & Honra',
    title: 'Que referência você está construindo?',
    message:
      'Os seus sobrinhos, amigos e quem caminha com você olham para quem você é. Quem vive preso em vícios secretos perde autoridade moral e carrega peso na consciência. Recupere o respeito por si mesmo antes de exigir respeito de qualquer pessoa.',
  },
  {
    id: 'verdade-1',
    pillar: 'Verdade Crua',
    title: 'Você já sabe como essa mentira termina',
    message:
      'O impulso promete prazer, mas sempre entrega a mesma conta: nojo, mente nublada, culpa e distância de Deus. Nunca valeu a pena. Nunca trouxe paz. Não negocie com "só uma olhadinha" — quem abre uma fresta já decidiu cair.',
  },
  {
    id: 'graca-3',
    pillar: 'Graça & Temor',
    title: 'Corte o gatilho, não passe a mão na cabeça',
    message:
      'Não adianta chorar depois se você continua levando o celular para o quarto, seguindo perfis que te provocam e ficando sozinho sem fazer nada. Arrependimento sem corte prático é teatro. Ore, mas também corte pela raiz agora.',
    verse: 'Mateus 5:29 — "Se o teu olho direito te faz tropeçar, arranca-o e lança-o fora de ti."',
  },
];

export const RECOVERY_MILESTONES = [
  { days: 1, title: 'Dia 1 · Decisão firme', desc: 'Você quebrou a inércia e escolheu lutar hoje.' },
  { days: 3, title: 'Dia 3 · Saída da névoa', desc: 'Os primeiros 72h são o pico do impulso. Você está vencendo.' },
  { days: 7, title: '7 dias · Primeira semana livre', desc: 'Sua mente começa a desacelerar a busca por dopamina rápida.' },
  { days: 14, title: '14 dias · Clareza e presença', desc: 'Mais energia, foco no trabalho e olhar mais limpo.' },
  { days: 30, title: '30 dias · Novo padrão', desc: 'Um mês inteiro de domínio próprio e fidelidade.' },
  { days: 90, title: '90 dias · Renovação profunda', desc: 'Novos caminhos neurais consolidados. Vida transformada.' },
];

export const DEFAULT_RESCUE_ACTIONS = [
  'Largar o celular em outro cômodo imediatamente',
  'Ir para a sala ou para um lugar com pessoas',
  'Fazer 20 flexões ou lavar o rosto com água bem fria',
  'Orar em voz alta o Salmo 51 pedindo força e pureza',
  'Sair para caminhar 10 minutos sem fone nem tela',
];
