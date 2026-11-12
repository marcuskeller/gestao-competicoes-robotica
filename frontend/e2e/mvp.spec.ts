import { test, expect, type Page } from '@playwright/test';
import type { Database } from '../src/app/core/models';

async function database(page: Page): Promise<Database> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('arena-robotica:db:v2')!));
}
async function login(page: Page, name = 'Marina Coordenação'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Tipo de pessoa').selectOption(name.includes('Bianca') ? 'voluntario' : 'administrador');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
}

test('entrada exige login e todos os módulos abrem com dados', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  for (const [route, title] of [
    ['edicoes', 'Edições'],
    ['modalidades', 'Modalidades e critérios'],
    ['criterios', 'Critérios de pontuação'],
    ['desempates', 'Critérios de desempate'],
    ['regras', 'Regras versionadas'],
    ['escolas', 'Escolas'],
    ['equipes', 'Equipes'],
    ['participantes', 'Participantes'],
    ['inscricoes', 'Inscrições'],
    ['etapas', 'Etapas e chaveamento'],
    ['disputas', 'Disputas'],
    ['resultados', 'Pontuações registradas'],
    ['classificacao', 'Classificação'],
    ['publicacao', 'Homologação e publicação'],
    ['auditoria', 'Trilha de auditoria'],
    ['interop', 'Interoperabilidade'],
  ]) {
    await page.goto(`/app/${route}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('painel orienta a jornada principal e se adapta a telas pequenas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await expect(page.getByRole('heading', { name: 'Jornada da competição' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Revisar inscrições' })).toHaveAttribute(
    'href',
    '/app/inscricoes',
  );
  await expect(page.getByRole('link', { name: 'Acompanhar disputas' })).toHaveAttribute(
    'href',
    '/app/disputas',
  );
  await expect(page.getByRole('link', { name: 'Homologar resultados' })).toHaveAttribute(
    'href',
    '/app/publicacao',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('cria contas de administração, voluntariado e empresa e permite entrar pelo tipo', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Cadastrar' }).click();

  await page.getByLabel('Nome completo').fill('Ana Administradora');
  await page.getByLabel('E-mail de contato').fill('ana.admin@demo.test');
  await page.getByLabel('Tipo de pessoa').selectOption('administrador');
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  expect((await database(page)).usuarios.find((user) => user.email === 'ana.admin@demo.test'))
    .toMatchObject({ tipo_conta: 'administrador', perfil: 'administrador' });
  await page.getByRole('button', { name: 'Sair' }).click();

  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await page.getByLabel('Nome completo').fill('Bruno Voluntário');
  await page.getByLabel('E-mail de contato').fill('bruno.voluntario@demo.test');
  await page.getByLabel('CPF').fill('529.982.247-25');
  await page.getByLabel('Tipo de pessoa').selectOption('voluntario');
  await page.getByLabel('Cargo voluntário').selectOption('2');
  await page.getByLabel('Telefone de contato').fill('(47) 90000-1000');
  await page.getByLabel('Disponibilidade').selectOption({ label: '11/11 · Manhã' });
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  const volunteerDb = await database(page);
  const volunteer = volunteerDb.usuarios.find((user) => user.email === 'bruno.voluntario@demo.test');
  expect(volunteer).toMatchObject({ tipo_conta: 'voluntario', perfil: 'voluntario' });
  expect(volunteerDb.inscricoesVoluntarios.find((item) => item.usuario_id === volunteer?.id)?.cpf)
    .toBe('52998224725');
  await page.getByRole('button', { name: 'Sair' }).click();

  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await page.getByLabel('Nome completo').fill('Carla Parceira');
  await page.getByLabel('E-mail de contato').fill('carla@empresa.demo');
  await page.getByLabel('Tipo de pessoa').selectOption('empresa');
  await page.getByLabel('Nome da empresa').fill('Robôs Joinville');
  await page.getByLabel('CNPJ').fill('33444555000104');
  await page.getByLabel('Telefone de contato').fill('(47) 90000-2000');
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await expect(page.getByRole('alert')).toContainText('CNPJ válido');
  await page.getByLabel('CNPJ').fill('33445555000104');
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Área da empresa apoiadora' })).toBeVisible();
  await page.getByLabel('Valor que pretende doar (R$)').fill('2500');
  await page.getByLabel('Descreva a doação').fill('Doação fictícia de materiais para a arena.');
  await page.getByRole('button', { name: 'Contribuir agora' }).click();
  await expect(page.getByRole('heading', { name: 'Contribuição financeira' })).toBeVisible();
  await page.getByRole('button', { name: /Pix/ }).click();
  await page.getByRole('button', { name: /Simular contribuição/ }).click();
  await expect(page.getByRole('status')).toContainText('Contribuição de demonstração registrada');
  expect((await database(page)).usuarios.find((user) => user.email === 'carla@empresa.demo'))
    .toMatchObject({ tipo_conta: 'empresa', perfil: 'empresa', organizacao: 'Robôs Joinville' });
  const companyDb = await database(page);
  const companyUser = companyDb.usuarios.find((user) => user.email === 'carla@empresa.demo');
  expect(companyDb.parcerias.find((item) => item.usuario_id === companyUser?.id))
    .toMatchObject({ valor_proposto: 2500, tipo_apoio: 'financeiro', metodo_pagamento: 'pix', status: 'contribuicao_demo' });
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.getByLabel('Tipo de pessoa').selectOption('empresa');
  await page.getByRole('button', { name: /Robôs Joinville/ }).click();
  await expect(page.getByRole('heading', { name: 'Área da empresa apoiadora' })).toBeVisible();
});

test('participante cria a conta e cadastra equipes e alunos depois do login', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await page.getByLabel('Nome completo').fill('Estudante Teste');
  await page.getByLabel('E-mail de contato').fill('estudante@demo.test');
  await page.getByLabel('Tipo de pessoa').selectOption('participante');
  await page.getByLabel('Telefone de contato').fill('(47) 90000-3000');
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Minhas equipes' })).toBeVisible();
  const pessoaDb = await database(page);
  const pessoaId = pessoaDb.usuarios.find((user) => user.email === 'estudante@demo.test')!.id;
  expect(pessoaDb.usuarios.find((user) => user.id === pessoaId)).toMatchObject({ tipo_participante: 'pessoa_fisica' });
  expect(pessoaDb.cadastrosParticipantes.some((item) => item.usuario_id === pessoaId)).toBe(false);
  await page.getByLabel('Escola da equipe').fill('Escola de Demonstração');
  await page.getByLabel('Rede de ensino').selectOption('municipal');
  await page.getByLabel('UF').fill('SC');
  await page.getByLabel('Município').fill('Joinville');
  await page.getByLabel('Nome da equipe').fill('Equipe de Demonstração');
  await page.getByLabel('Modalidade').selectOption('1');
  await page.getByRole('textbox', { name: /Informe de 2 a 4/ }).fill('Estudante Um | 8º ano\nEstudante Dois | 9º ano');
  await page.getByRole('button', { name: 'Salvar equipe e alunos' }).click();
  await expect(page.getByText('Equipe de Demonstração')).toBeVisible();
  expect((await database(page)).equipes.some((item) => item.responsavel_usuario_id === pessoaId)).toBe(true);
  await page.getByRole('button', { name: 'Sair' }).click();

  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await page.getByLabel('Nome completo').fill('Diretora Teste');
  await page.getByLabel('E-mail de contato').fill('escola@demo.test');
  await page.getByLabel('Tipo de pessoa').selectOption('participante');
  await page.getByLabel('Tipo de inscrição').selectOption('escola');
  await page.getByLabel('Nome da escola').fill('Escola de Demonstração CNPJ');
  await page.getByLabel('CNPJ da escola').fill('44556666000104');
  await page.getByLabel('Telefone de contato').fill('(47) 90000-4000');
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Minhas equipes' })).toBeVisible();
  const escolaDb = await database(page);
  const escolaUserId = escolaDb.usuarios.find((user) => user.email === 'escola@demo.test')!.id;
  expect(escolaDb.usuarios.find((user) => user.id === escolaUserId)).toMatchObject({
    tipo_participante: 'escola', cnpj: '44556666000104', organizacao: 'Escola de Demonstração CNPJ',
  });
  await page.getByLabel('Rede de ensino').selectOption('municipal');
  await page.getByLabel('UF').fill('SC');
  await page.getByLabel('Município').fill('Joinville');
  await page.getByLabel('Nome da equipe').fill('Equipe CNPJ Demo');
  await page.getByLabel('Modalidade').selectOption('1');
  await page.getByRole('textbox', { name: /Informe de 2 a 4/ }).fill('Estudante Um | 6º ano\nEstudante Dois | 7º ano');
  await page.getByRole('button', { name: 'Salvar equipe e alunos' }).click();
  await expect(page.getByText('Estudante Um')).toBeVisible();
  expect((await database(page)).equipes.some((item) => item.responsavel_usuario_id === escolaUserId)).toBe(true);
});

test('administra usuários por categoria, cargos, vagas e permissões', async ({ page }) => {
  await login(page);
  await page.goto('/app/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuários e acessos' })).toBeVisible();
  await expect(page.getByText('Julia Mentora')).toBeVisible();

  const voluntaria = page.locator('article').filter({ hasText: 'Julia Mentora' });
  await voluntaria.getByText('Permissões individuais').click();
  await voluntaria.getByLabel('Consultar disputas').check();
  expect((await database(page)).usuarios.find((user) => user.email === 'julia.mentora@arena.demo')?.permissoes)
    .toContain('disputa.ver');
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.getByLabel('Tipo de pessoa').selectOption('voluntario');
  await page.getByRole('button', { name: /Julia Mentora/ }).click();
  await page.goto('/app/disputas');
  await expect(page.getByRole('heading', { name: 'Disputas', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await login(page);
  await page.goto('/app/usuarios');
  await page.getByRole('button', { name: 'Parcerias' }).click();
  await expect(page.getByText('Tecnologia Joinville Demo')).toBeVisible();
  await page.getByRole('button', { name: 'Participantes' }).click();
  const escolaParceira = page.locator('article').filter({ hasText: 'Escola / CNPJ' });
  await expect(escolaParceira.getByRole('heading', { name: 'Escola Municipal de Robótica Demo' })).toBeVisible();

  await page.getByRole('button', { name: 'Cargos e vagas' }).click();
  await page.getByLabel('Nome do cargo').fill('Apoio de demonstração');
  await page.getByLabel('Descrição').fill('Cargo fictício para validar a configuração.');
  await page.getByLabel('Vagas', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Adicionar cargo' }).click();
  await expect(page.getByText('Apoio de demonstração')).toBeVisible();
});

test('cadastro de escola persiste após recarregar e gera auditoria', async ({ page }) => {
  await login(page);
  await page.goto('/app/escolas');
  await page.getByRole('button', { name: 'Nova escola' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Escola de Teste MVP');
  await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('municipal');
  await page.getByLabel('Município').fill('Joinville');
  await page.getByLabel('UF', { exact: true }).fill('SC');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Escola de Teste MVP', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name: 'Escola de Teste MVP', exact: true })).toBeVisible();
  const db = await database(page);
  expect(
    db.logs.some((l) => l.tabela === 'escolas' && l.valor_novo === 'Escola de Teste MVP'),
  ).toBe(true);
});

test('mesário não acessa auditoria nem cadastra escolas', async ({ page }) => {
  await login(page, 'Bianca Mesária');
  await page.goto('/app/auditoria');
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await page.goto('/app/escolas');
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await page.goto('/app/pontuar/7');
  await expect(page.getByRole('button', { name: 'Salvar pontuação' }).first()).toBeDisabled();
});

test('pontuar, homologar, publicar e retificar preserva snapshot anterior', async ({ page }) => {
  await login(page);
  const before = await database(page);
  const stageId = 2;
  const pending = before.disputas.filter(
    (d) => d.etapa_id === stageId && !['concluida', 'cancelada', 'wo'].includes(d.status),
  );
  for (const match of pending) {
    await page.goto(`/app/pontuar/${match.id}`);
    for (const form of await page.locator('main form').all()) {
      for (const input of await form.locator('input[type=number]').all()) await input.fill('5');
      await form.getByRole('button', { name: 'Salvar pontuação' }).click();
      await expect(page.getByRole('status')).toContainText('Pontuação salva');
    }
    await page.getByRole('button', { name: 'Concluir disputa' }).click();
  }
  await page.goto('/app/publicacao');
  const row = page.getByRole('row').filter({ hasText: 'Fase de Grupos — Nível 2' });
  await row.getByRole('button', { name: 'Homologar', exact: true }).click();
  await row.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(row).toContainText('Publicada');
  const published = (await database(page)).publicacoes.find(
    (p) => p.etapa_id === stageId && p.status === 'publicada',
  )!;
  expect(published.snapshot?.classificacao.length).toBeGreaterThan(0);
  await page.goto('/publico');
  await expect(page.getByRole('heading', { name: /Fase de Grupos/ })).toBeVisible();
  await page.goto('/app/publicacao');
  await row.getByRole('button', { name: 'Retificar', exact: true }).click();
  await page.getByLabel('Justificativa da retificação').fill('Correção conferida na súmula');
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.goto(`/app/pontuar/${pending[0].id}`);
  const form = page.locator('main form').first();
  await form.locator('input[type=number]').first().fill('20');
  await form.getByRole('button', { name: 'Salvar pontuação' }).click();
  await page.getByRole('button', { name: 'Concluir disputa' }).click();
  expect((await database(page)).publicacoes.find((p) => p.id === published.id)?.snapshot).toEqual(
    published.snapshot,
  );
  await page.goto('/app/publicacao');
  await row.getByRole('button', { name: 'Homologar', exact: true }).click();
  await row.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await database(page)).publicacoes.find(
          (p) => p.etapa_id === stageId && p.status === 'publicada',
        )?.versao,
    )
    .toBe(published.versao + 1);
  const after = await database(page);
  const latest = after.publicacoes.find((p) => p.etapa_id === stageId && p.status === 'publicada')!;
  expect(latest.versao).toBe(published.versao + 1);
  expect(latest.motivo_retificacao).toBe('Correção conferida na súmula');
  expect(latest.snapshot).not.toEqual(published.snapshot);
  expect(after.publicacoes.find((p) => p.id === published.id)?.snapshot).toEqual(
    published.snapshot,
  );
  expect(after.publicacoes.find((p) => p.id === published.id)?.status).toBe('retificada');
});

test('homologação bloqueia etapa com disputas pendentes', async ({ page }) => {
  await login(page);
  await page.goto('/app/publicacao');
  await page
    .getByRole('row')
    .filter({ hasText: 'Fase de Grupos — Nível 2' })
    .getByRole('button', { name: 'Homologar', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('pendente');
});

test('portal público não expõe usuários ou resultados não publicados', async ({ page }) => {
  await page.goto('/publico');
  await expect(page.getByRole('heading', { name: 'Resultados públicos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Fase de Grupos/ })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('@arena.demo');
  await expect(page.locator('body')).not.toContainText('Bianca');
});

test('menu funciona em dispositivo móvel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('link', { name: 'Disputas M7' }).click();
  await expect(page.getByRole('heading', { name: 'Disputas', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('nova edição permite cadastrar equipes, inscrever, aprovar e gerar confronto', async ({
  page,
}) => {
  await login(page);
  async function create(
    route: string,
    button: string,
    values: Record<string, string>,
  ): Promise<void> {
    await page.goto(`/app/${route}`);
    await page.getByRole('button', { name: button, exact: true }).click();
    for (const [key, value] of Object.entries(values)) {
      const control = page.locator(`#field-${key}`);
      if (await control.evaluate((e) => e.tagName === 'SELECT')) await control.selectOption(value);
      else await control.fill(value);
    }
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Adicionar registro' })).toHaveCount(0);
  }
  await create('edicoes', 'Nova edição', {
    nome: 'Campeonato MVP 2027',
    ano: '2027',
    numero: '7',
    tema: 'Robótica',
    local: 'Joinville',
    data_inicio: '2027-11-01',
    data_fim: '2027-11-03',
  });
  const edition = (await database(page)).edicoes.find((e) => e.ano === 2027)!;
  await page
    .getByRole('row')
    .filter({ hasText: 'Campeonato MVP 2027' })
    .getByRole('button', { name: 'Avançar status' })
    .click();
  await create('modalidades', 'Nova modalidade', {
    edicao_id: String(edition.id),
    nome: 'Seguidor MVP',
    slug: 'seguidor-mvp',
    descricao: 'Percurso de teste',
    tipo: 'equipe',
    min_integrantes: '1',
    max_integrantes: '2',
  });
  const modality = (await database(page)).modalidades.find((m) => m.slug === 'seguidor-mvp')!;
  await create('criterios', 'Novo critério', {
    modalidade_id: String(modality.id),
    nome: 'Percurso',
    descricao: 'Pontos por percurso',
    peso: '2',
  });
  await create('desempates', 'Novo desempate', {
    modalidade_id: String(modality.id),
    nome: 'Mais pontos',
    campo: 'pontos_finais',
    direcao: 'desc',
  });
  await create('regras', 'Publicar regra', {
    edicao_id: String(edition.id),
    modalidade_id: String(modality.id),
    titulo: 'Regras MVP',
    conteudo: 'Vence a equipe com mais pontos.',
  });
  for (const name of ['Equipe MVP A', 'Equipe MVP B']) {
    await create('equipes', 'Nova equipe', {
      edicao_id: String(edition.id),
      escola_id: '1',
      nome: name,
    });
    const team = (await database(page)).equipes.find((e) => e.nome === name)!;
    await create('participantes', 'Novo participante', {
      equipe_id: String(team.id),
      nome: `Capitão ${name}`,
      papel: 'capitao',
      serie: '9º ano',
    });
    await create('inscricoes', 'Nova inscrição', {
      equipe_id: String(team.id),
      modalidade_id: String(modality.id),
    });
    await page
      .getByRole('row')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Aprovar', exact: true })
      .click();
  }
  await create('etapas', 'Nova etapa', {
    modalidade_id: String(modality.id),
    nome: 'Grupos MVP',
    tipo: 'grupos',
    data_inicio: '2027-11-01',
    data_fim: '2027-11-02',
  });
  await page
    .getByRole('row')
    .filter({ hasText: 'Grupos MVP' })
    .getByRole('button', { name: 'Gerar chaveamento' })
    .click();
  await expect(page.getByRole('status')).toContainText('sucesso');
  await expect
    .poll(async () => {
      const db = await database(page);
      return db.disputas.filter(
        (d) => d.etapa_id === db.etapas.find((e) => e.nome === 'Grupos MVP')?.id,
      ).length;
    })
    .toBe(1);
});
