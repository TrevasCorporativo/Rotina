export interface ConfrontationCard {
  id: string;
  pillar: 'Graça & Fé' | 'Homem & Marido' | 'Família & Amigos' | 'Mente & Caráter';
  title: string;
  message: string;
  verse?: string;
}

export const CONFRONTATION_CARDS: ConfrontationCard[] = [
  {
    id: 'graca-1',
    pillar: 'Graça & Fé',
    title: 'A graça não é licença, é poder',
    message:
      'Cristo não derramou sangue na cruz para você negociar sua liberdade por minutos de ilusão na tela. A graça do Senhor te levanta da culpa, mas também te chama a fechar a porta que Ele mandou fechar.',
    verse: 'Tito 2:11-12 — "A graça de Deus se manifestou salvadora... ensinando-nos a renunciar à impiedade e às paixões mundanas."',
  },
  {
    id: 'graca-2',
    pillar: 'Graça & Fé',
    title: 'No secreto, Deus está vendo — e estendendo a mão',
    message:
      'Quando você está sozinho com o celular, não está escondido. Deus está ali, não para te esmagar com condenação, mas oferecendo a saída agora. Você vai escolher a luz ou a sombra?',
    verse: '1 Coríntios 10:13 — "Deus é fiel; ele não permitirá que vocês sejam tentados além do que podem suportar."',
  },
  {
    id: 'marido-1',
    pillar: 'Homem & Marido',
    title: 'O marido que sua esposa merece',
    message:
      'Olhe para a sua vida como homem e marido. Cada vez que você cede ao vício, você divide o seu olhar, rouba a sua admiração e entrega para pixels o que pertence ao seu casamento. Honre sua aliança mesmo quando ninguém está olhando.',
  },
  {
    id: 'homem-1',
    pillar: 'Homem & Marido',
    title: 'Caráter é o que você recusa no escuro',
    message:
      'Qualquer um parece forte em público. Homem de verdade é quem domina os próprios impulsos quando está cansado, entediado ou sozinho. Não seja escravo de um desejo que dura segundos e te rouba a paz por dias.',
  },
  {
    id: 'familia-1',
    pillar: 'Família & Amigos',
    title: 'Filho, irmão, tio e amigo de verdade',
    message:
      'Pense nas pessoas que te olham com respeito: seus pais, seus irmãos, seus sobrinhos, seus amigos. Que homem existe por trás do sorriso que você dá para eles? Seja inteiro por dentro, para não carregar segredos que te diminuem.',
  },
  {
    id: 'familia-2',
    pillar: 'Família & Amigos',
    title: 'Você foi feito para proteger, não para se esconder',
    message:
      'Quem vive preso em vícios secretos perde a coragem de olhar nos olhos de quem ama. Hoje você pode recuperar essa firmeza. Cada "não" que você dá ao impulso devolve a sua autoridade moral.',
  },
  {
    id: 'mente-1',
    pillar: 'Mente & Caráter',
    title: 'O impulso é uma onda — não alimente',
    message:
      'A fissura parece urgente, mas dura poucos minutos se você não der atenção. A queda, porém, traz névoa mental, desânimo e culpa. Troque 5 minutos de prazer falso por dias de cabeça erguida.',
  },
  {
    id: 'graca-3',
    pillar: 'Graça & Fé',
    title: 'Coração limpo se pede de joelhos',
    message:
      'Não tente vencer só na força do braço. Quando o desejo apertar, dobre o joelho ou ore em voz alta agora mesmo. O Senhor responde a quem clama com sinceridade.',
    verse: 'Salmos 51:10 — "Cria em mim um coração puro, ó Deus, e renova dentro de mim um espírito estável."',
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

