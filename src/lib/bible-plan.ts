export interface BibleReadingRef {
  bookAbbrev: string;
  bookName: string;
  startChapter: number;
  endChapter: number;
}

export interface DevotionalDayPlan {
  day: number;
  phase: string;
  title: string;
  readings: BibleReadingRef[];
  commentary: string;
  focusQuestion: string;
}

interface BookSpec {
  abbrev: string;
  name: string;
  chapters: number;
  phase: string;
  commentary: string;
}

// Chronological-spiritual order: Gospels first, then Acts/Epistles, then OT chronologically, then Revelation
const ORDERED_BOOKS: BookSpec[] = [
  // 1. Evangelhos (Conhecendo Jesus)
  { abbrev: 'jo', name: 'João', chapters: 21, phase: 'Conhecendo Jesus · Evangelhos', commentary: 'João revela quem Jesus é como o Filho de Deus, o Verbo vivo, a Luz e o Caminho. Leia observando os 7 sinais e os discursos de intimidade com o Pai.' },
  { abbrev: 'mc', name: 'Marcos', chapters: 16, phase: 'Conhecendo Jesus · Evangelhos', commentary: 'Marcos mostra Jesus em ação: servo incansável, cheio de autoridade sobre demônios, doenças e tempestades, caminhando decidido até a cruz.' },
  { abbrev: 'lc', name: 'Lucas', chapters: 24, phase: 'Conhecendo Jesus · Evangelhos', commentary: 'Lucas destaca a humanidade e a compaixão de Cristo pelos perdidos, pecadores e necessitados, além da ação do Espírito Santo e da oração.' },
  { abbrev: 'mt', name: 'Mateus', chapters: 28, phase: 'Conhecendo Jesus · Evangelhos', commentary: 'Mateus apresenta Jesus como o Rei prometido e o Mestre do Sermão do Monte. Observe como Ele cumpre as profecias e chama discípulos à obediência real.' },

  // 2. Igreja Primitiva & Cartas (em ordem cronológica aproximada)
  { abbrev: 'atos', name: 'Atos', chapters: 28, phase: 'Igreja Primitiva & Cartas', commentary: 'Atos narra o nascimento e a expansão da Igreja pelo poder do Espírito Santo, de Jerusalém até Roma.' },
  { abbrev: 'tg', name: 'Tiago', chapters: 5, phase: 'Igreja Primitiva & Cartas', commentary: 'Fé prática: domínio da língua, resistência nas provações e obras coerentes com o Evangelho.' },
  { abbrev: 'gl', name: 'Gálatas', chapters: 6, phase: 'Igreja Primitiva & Cartas', commentary: 'A verdadeira liberdade em Cristo pela graça, andando no Espírito e não na carne.' },
  { abbrev: '1ts', name: '1 Tessalonicenses', chapters: 5, phase: 'Igreja Primitiva & Cartas', commentary: 'Santidade diária, perseverança e a esperança viva da volta de Cristo.' },
  { abbrev: '2ts', name: '2 Tessalonicenses', chapters: 3, phase: 'Igreja Primitiva & Cartas', commentary: 'Firmeza doutrinária, trabalho diligente e vigilância diante dos tempos finais.' },
  { abbrev: '1co', name: '1 Coríntios', chapters: 16, phase: 'Igreja Primitiva & Cartas', commentary: 'Pureza do corpo como templo do Espírito Santo, unidade na igreja, dons e a supremacia do amor.' },
  { abbrev: '2co', name: '2 Coríntios', chapters: 13, phase: 'Igreja Primitiva & Cartas', commentary: 'O poder de Deus aperfeiçoado na fraqueza, reconciliação e integridade ministerial.' },
  { abbrev: 'rm', name: 'Romanos', chapters: 16, phase: 'Igreja Primitiva & Cartas', commentary: 'A coluna vertebral da teologia cristã: pecado, justificação pela fé, vida no Espírito e consagração total.' },
  { abbrev: 'ef', name: 'Efésios', chapters: 6, phase: 'Igreja Primitiva & Cartas', commentary: 'Nossa identidade em Cristo, casamento cristão, santidade prática e a armadura de Deus.' },
  { abbrev: 'fp', name: 'Filipenses', chapters: 4, phase: 'Igreja Primitiva & Cartas', commentary: 'Alegria inabalável em Cristo, mente renovada e contentamento em qualquer circunstância.' },
  { abbrev: 'cl', name: 'Colossenses', chapters: 4, phase: 'Igreja Primitiva & Cartas', commentary: 'A supremacia absoluta de Cristo sobre tudo e a morte para a velha natureza.' },
  { abbrev: 'fm', name: 'Filemom', chapters: 1, phase: 'Igreja Primitiva & Cartas', commentary: 'Perdão, reconciliação e transformação de relacionamentos pelo Evangelho.' },
  { abbrev: '1tm', name: '1 Timóteo', chapters: 6, phase: 'Igreja Primitiva & Cartas', commentary: 'Caráter de liderança, pureza, piedade e cuidado com a sã doutrina.' },
  { abbrev: 'tt', name: 'Tito', chapters: 3, phase: 'Igreja Primitiva & Cartas', commentary: 'A graça que educa o crente a renunciar às paixões mundanas e viver com domínio próprio.' },
  { abbrev: '1pe', name: '1 Pedro', chapters: 5, phase: 'Igreja Primitiva & Cartas', commentary: 'Santidade em meio a um mundo hostil e esperança viva em Cristo.' },
  { abbrev: '2pe', name: '2 Pedro', chapters: 3, phase: 'Igreja Primitiva & Cartas', commentary: 'Crescimento nas virtudes cristãs e alerta contra falsos mestres.' },
  { abbrev: '2tm', name: '2 Timóteo', chapters: 4, phase: 'Igreja Primitiva & Cartas', commentary: 'Fidelidade até o fim, manejo reto da Palavra e coragem para pregar o Evangelho.' },
  { abbrev: 'hb', name: 'Hebreus', chapters: 13, phase: 'Igreja Primitiva & Cartas', commentary: 'Jesus como Sumo Sacerdote superior a tudo e chamado à perseverança na fé.' },
  { abbrev: 'jd', name: 'Judas', chapters: 1, phase: 'Igreja Primitiva & Cartas', commentary: 'Batalhar pela fé entregue aos santos e guardar-se no amor de Deus.' },
  { abbrev: '1jo', name: '1 João', chapters: 5, phase: 'Igreja Primitiva & Cartas', commentary: 'Andar na luz, vencer o pecado pela confissão e amar de verdade.' },
  { abbrev: '2jo', name: '2 João', chapters: 1, phase: 'Igreja Primitiva & Cartas', commentary: 'Verdade e amor andando juntos sem comprometer a doutrina.' },
  { abbrev: '3jo', name: '3 João', chapters: 1, phase: 'Igreja Primitiva & Cartas', commentary: 'Hospitalidade e fidelidade aos cooperadores da verdade.' },

  // 3. Antigo Testamento em Cronologia
  { abbrev: 'gn', name: 'Gênesis', chapters: 50, phase: 'Cronologia · Origem e Patriarcas', commentary: 'Criação, queda, promessa de redenção e a caminhada de fé de Abraão, Isaque, Jacó e José.' },
  { abbrev: 'job', name: 'Jó', chapters: 42, phase: 'Cronologia · Origem e Patriarcas', commentary: 'Soberania de Deus diante do sofrimento e integridade mesmo quando tudo desaba.' },
  { abbrev: 'ex', name: 'Êxodo', chapters: 40, phase: 'Cronologia · Libertação e Lei', commentary: 'O Senhor liberta seu povo, entrega a Lei e habita no meio dele no Tabernáculo.' },
  { abbrev: 'lv', name: 'Levítico', chapters: 27, phase: 'Cronologia · Libertação e Lei', commentary: 'Santidade de Deus e o preço do sacrifício que aponta para Cristo.' },
  { abbrev: 'nm', name: 'Números', chapters: 36, phase: 'Cronologia · Deserto e Promessa', commentary: 'Lições da jornada no deserto: o custo da incredulidade e a fidelidade de Deus.' },
  { abbrev: 'dt', name: 'Deuteronômio', chapters: 34, phase: 'Cronologia · Deserto e Promessa', commentary: 'Renovação da aliança: amar o Senhor de todo o coração e obedecer à Sua voz.' },
  { abbrev: 'js', name: 'Josué', chapters: 24, phase: 'Cronologia · Conquista e Juízes', commentary: 'Coragem, meditação na Palavra dia e noite e cumprimento das promessas.' },
  { abbrev: 'jz', name: 'Juízes', chapters: 21, phase: 'Cronologia · Conquista e Juízes', commentary: 'O ciclo trágico de esquecer a Deus quando falta liderança temente e fiel.' },
  { abbrev: 'rt', name: 'Rute', chapters: 4, phase: 'Cronologia · Conquista e Juízes', commentary: 'Fidelidade, redenção e graça no cotidiano preparando a linhagem de Davi e Cristo.' },
  { abbrev: '1sm', name: '1 Samuel', chapters: 31, phase: 'Cronologia · Reino Unido', commentary: 'Deus olha o coração: contraste entre a aparência de Saul e o coração de Davi.' },
  { abbrev: '2sm', name: '2 Samuel', chapters: 24, phase: 'Cronologia · Reino Unido', commentary: 'Vitórias de Davi, o peso devastador do pecado secreto e o arrependimento verdadeiro.' },
  { abbrev: 'sl', name: 'Salmos', chapters: 150, phase: 'Cronologia · Adoração e Sabedoria', commentary: 'O livro de orações da Bíblia: clamor, arrependimento (Salmo 51), confiança e louvor.' },
  { abbrev: 'pv', name: 'Provérbios', chapters: 31, phase: 'Cronologia · Adoração e Sabedoria', commentary: 'Sabedoria prática diária para escolhas, pureza, trabalho, fala e família.' },
  { abbrev: 'ec', name: 'Eclesiastes', chapters: 12, phase: 'Cronologia · Adoração e Sabedoria', commentary: 'Tudo debaixo do sol é passageiro; o sentido da vida está em temer a Deus e guardar seus mandamentos.' },
  { abbrev: 'ct', name: 'Cânticos', chapters: 8, phase: 'Cronologia · Adoração e Sabedoria', commentary: 'A beleza da aliança, fidelidade e amor puro no casamento criado por Deus.' },
  { abbrev: '1rs', name: '1 Reis', chapters: 22, phase: 'Cronologia · Reino Dividido', commentary: 'Sabedoria de Salomão, divisão do reino e o ministério firme de Elias.' },
  { abbrev: '2rs', name: '2 Reis', chapters: 25, phase: 'Cronologia · Reino Dividido', commentary: 'Consequências da idolatria, avivamentos pontuais e o caminho para o exílio.' },
  { abbrev: '1cr', name: '1 Crônicas', chapters: 29, phase: 'Cronologia · Reino Dividido', commentary: 'A história relida sob a ótica da aliança, adoração e fidelidade de Deus.' },
  { abbrev: '2cr', name: '2 Crônicas', chapters: 36, phase: 'Cronologia · Reino Dividido', commentary: 'Quando o povo se humilha e ora, o Senhor ouve dos céus e restaura a terra.' },
  { abbrev: 'ob', name: 'Obadias', chapters: 1, phase: 'Cronologia · Profetas', commentary: 'A soberba cai diante da justiça de Deus.' },
  { abbrev: 'jl', name: 'Joel', chapters: 3, phase: 'Cronologia · Profetas', commentary: 'Rasguem o coração e não as vestes: arrependimento e derramamento do Espírito.' },
  { abbrev: 'jn', name: 'Jonas', chapters: 4, phase: 'Cronologia · Profetas', commentary: 'A misericórdia de Deus alcança até quem não merecia — e confronta o coração do profeta.' },
  { abbrev: 'am', name: 'Amós', chapters: 9, phase: 'Cronologia · Profetas', commentary: 'Deus rejeita culto vazio sem justiça e retidão prática.' },
  { abbrev: 'os', name: 'Oséias', chapters: 14, phase: 'Cronologia · Profetas', commentary: 'O amor fiel de Deus perseguindo um povo infiel para trazê-lo de volta.' },
  { abbrev: 'mq', name: 'Miquéias', chapters: 7, phase: 'Cronologia · Profetas', commentary: 'Praticar a justiça, amar a misericórdia e andar humildemente com Deus.' },
  { abbrev: 'is', name: 'Isaías', chapters: 66, phase: 'Cronologia · Profetas', commentary: 'A santidade do Senhor e as profecias claras do Servo Sofredor, Jesus Cristo.' },
  { abbrev: 'na', name: 'Naum', chapters: 3, phase: 'Cronologia · Profetas', commentary: 'O Senhor é refúgio no dia da angústia e justo juiz dos opressores.' },
  { abbrev: 'sf', name: 'Sofonias', chapters: 3, phase: 'Cronologia · Profetas', commentary: 'Busquem ao Senhor em humildade antes do dia do juízo.' },
  { abbrev: 'hc', name: 'Habacuque', chapters: 3, phase: 'Cronologia · Profetas', commentary: 'O justo viverá pela fé, regozijando-se no Senhor mesmo na escassez.' },
  { abbrev: 'jr', name: 'Jeremias', chapters: 52, phase: 'Cronologia · Exílio e Restauração', commentary: 'Fidelidade solitária à Palavra e a promessa da Nova Aliança no coração.' },
  { abbrev: 'lm', name: 'Lamentações', chapters: 5, phase: 'Cronologia · Exílio e Restauração', commentary: 'As misericórdias do Senhor se renovam a cada manhã, mesmo em meio às ruínas.' },
  { abbrev: 'ez', name: 'Ezequiel', chapters: 48, phase: 'Cronologia · Exílio e Restauração', commentary: 'A glória de Deus, responsabilidade pessoal e a promessa de um coração novo.' },
  { abbrev: 'dn', name: 'Daniel', chapters: 12, phase: 'Cronologia · Exílio e Restauração', commentary: 'Pureza e firmeza inegociável em terra estrangeira, sob o governo soberano de Deus.' },
  { abbrev: 'ed', name: 'Esdras', chapters: 10, phase: 'Cronologia · Exílio e Restauração', commentary: 'Reconstrução espiritual baseada no estudo e prática da Palavra.' },
  { abbrev: 'ag', name: 'Ageu', chapters: 2, phase: 'Cronologia · Exílio e Restauração', commentary: 'Priorize a casa e a obra de Deus acima do comodismo.' },
  { abbrev: 'zc', name: 'Zacarias', chapters: 14, phase: 'Cronologia · Exílio e Restauração', commentary: 'Não por força nem por violência, mas pelo Espírito do Senhor.' },
  { abbrev: 'et', name: 'Ester', chapters: 10, phase: 'Cronologia · Exílio e Restauração', commentary: 'A providência silenciosa de Deus livrando seu povo no momento exato.' },
  { abbrev: 'ne', name: 'Neemias', chapters: 13, phase: 'Cronologia · Exílio e Restauração', commentary: 'Liderança com oração, vigilância e reconstrução dos muros.' },
  { abbrev: 'ml', name: 'Malaquias', chapters: 4, phase: 'Cronologia · Exílio e Restauração', commentary: 'Fidelidade na aliança, na família e na adoração antes da vinda do Messias.' },

  // 4. Consumação
  { abbrev: 'ap', name: 'Apocalipse', chapters: 22, phase: 'Consumação · Eternidade', commentary: 'Cristo vence! Chamado às igrejas para vencer até o fim e viver para a Nova Jerusalém.' },
];

export function buildBiblePlan(): DevotionalDayPlan[] {
  // Flatten all 1,189 chapters in our ordered sequence
  const allChapters: Array<{ book: BookSpec; chapter: number }> = [];
  for (const book of ORDERED_BOOKS) {
    for (let c = 1; c <= book.chapters; c++) {
      allChapters.push({ book, chapter: c });
    }
  }

  const totalDays = 365;
  const totalChapters = allChapters.length; // 1189
  const plan: DevotionalDayPlan[] = [];
  let cursor = 0;

  for (let day = 1; day <= totalDays; day++) {
    const remainingDays = totalDays - day + 1;
    const remainingChapters = totalChapters - cursor;
    const count = Math.ceil(remainingChapters / remainingDays);
    const slice = allChapters.slice(cursor, cursor + count);
    cursor += count;

    // Group contiguous chapters by book
    const readings: BibleReadingRef[] = [];
    for (const item of slice) {
      const last = readings[readings.length - 1];
      if (last && last.bookAbbrev === item.book.abbrev) {
        last.endChapter = item.chapter;
      } else {
        readings.push({
          bookAbbrev: item.book.abbrev,
          bookName: item.book.name,
          startChapter: item.chapter,
          endChapter: item.chapter,
        });
      }
    }

    const firstBook = slice[0]?.book;
    const title = readings
      .map((r) =>
        r.startChapter === r.endChapter
          ? `${r.bookName} ${r.startChapter}`
          : `${r.bookName} ${r.startChapter}–${r.endChapter}`
      )
      .join(' · ');

    plan.push({
      day,
      phase: firstBook?.phase ?? 'Leitura Bíblica',
      title,
      readings,
      commentary: firstBook?.commentary ?? 'Medite com atenção no texto sagrado de hoje.',
      focusQuestion:
        'O que esse texto revela sobre Deus e o que precisa mudar na minha prática hoje?',
    });
  }

  return plan;
}

export const BIBLE_PLAN = buildBiblePlan();
