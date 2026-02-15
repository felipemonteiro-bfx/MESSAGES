/**
 * Gera título e corpo disfarçados de notícia para notificações push.
 * CORRIGIDO: Não expõe mais o conteúdo real da mensagem.
 * As notificações são 100% fake news — nenhum conteúdo real é vazado.
 */

const FAKE_HEADLINES = [
  'Economia brasileira apresenta novos indicadores positivos',
  'Avanço tecnológico promete transformar setor de saúde',
  'Previsão do tempo: mudanças climáticas em destaque',
  'Mercado financeiro reage a decisões do Banco Central',
  'Novas descobertas científicas surpreendem pesquisadores',
  'Governo anuncia medidas para infraestrutura urbana',
  'Esportes: resultados e destaques da rodada',
  'Cultura: eventos e lançamentos movimentam a semana',
  'Setor de energia renovável bate recorde de investimentos',
  'Pesquisa revela tendências de consumo para o próximo ano',
  'Educação: novas políticas públicas entram em vigor',
  'Saúde pública: campanha de vacinação é ampliada',
  'Tecnologia: startup brasileira recebe aporte milionário',
  'Meio ambiente: acordo internacional avança em negociações',
  'Transporte: obras de mobilidade urbana são inauguradas',
];

const FAKE_BODIES = [
  'Especialistas analisam os impactos das novas medidas econômicas.',
  'Confira os detalhes e análises dos principais veículos de imprensa.',
  'Saiba mais sobre os desdobramentos desta notícia.',
  'Acompanhe a cobertura completa em tempo real.',
  'Veja o que dizem os analistas sobre o tema.',
  'Entenda como isso pode afetar o seu dia a dia.',
  'Leia a reportagem completa com todos os detalhes.',
];

const NEWS_SOURCES = ['G1', 'BBC Brasil', 'Folha', 'UOL', 'CNN Brasil', 'Globo', 'Estadão', 'Reuters'];

export function generateFakeNewsTitle(): string {
  return FAKE_HEADLINES[Math.floor(Math.random() * FAKE_HEADLINES.length)];
}

export function generateFakeNewsBody(): string {
  const source = NEWS_SOURCES[Math.floor(Math.random() * NEWS_SOURCES.length)];
  const body = FAKE_BODIES[Math.floor(Math.random() * FAKE_BODIES.length)];
  return `${source} • ${body}`;
}
