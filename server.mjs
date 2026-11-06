import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'dist');
const dbDir = path.join(root, 'data');
const dbFile = path.join(dbDir, 'zhep-radar.json');
const port = Number(process.env.PORT || 5050);

const seed = {
  campaigns: [{ id: 'camp-auto-itajai', name: 'Oficinas e auto centers - Itaja�', niche: 'Oficinas e auto centers', location: 'Itaja� � 20 km', offer: 'Site comercial com capta��o', active: true, createdAt: '2026-11-05T00:00:00.000Z' }],
  leads: [
    { id: 'lead-auto-prime', campaignId: 'camp-auto-itajai', name: 'Auto Prime Centro Automotivo', location: 'Itaja� � 2,4 km', tag: 'Site recomendado', site: 91, system: 46, score: 91, reason: 'Boa avalia��o local, mas sem site pr�prio.', status: 'Novo', evidence: ['Perfil do Google com 128 avalia��es e nota 4,8.', 'N�o foi identificado um dom�nio pr�prio no perfil.', 'Link principal direciona somente para rede social.'], message: 'Ol�, pessoal da Auto Prime! Vi que voc�s t�m uma reputa��o muito forte no Google, com excelentes avalia��es. Percebi que ainda n�o existe uma p�gina pr�pria para transformar essa busca em pedidos de or�amento no WhatsApp. Pensei numa estrutura bem espec�fica para oficinas. Posso mostrar uma ideia r�pida?', updatedAt: '2026-11-05T00:00:00.000Z' },
    { id: 'lead-diesel-sul', campaignId: 'camp-auto-itajai', name: 'Mec�nica Diesel Sul', location: 'Itaja� � 5,8 km', tag: 'Sistema avaliado', site: 72, system: 78, score: 78, reason: 'M�ltiplos servi�os e fluxo de or�amentos.', status: 'Novo', evidence: ['Site apresenta servi�os para frotas, diesel leve e manuten��o preventiva.', 'H� formul�rio gen�rico, sem rastreio do status de or�amento.', 'Servi�os e p�blico indicam opera��o com demanda recorrente.'], message: 'Ol�, pessoal da Mec�nica Diesel Sul! Analisei os servi�os de voc�s e vi uma opera��o com v�rios tipos de or�amento e manuten��o recorrente. Existe uma oportunidade de organizar as solicita��es e acompanhamentos em um fluxo simples, al�m de melhorar a capta��o do site. Posso compartilhar uma ideia aplicada a esse cen�rio?', updatedAt: '2026-11-05T00:00:00.000Z' },
    { id: 'lead-garage-11', campaignId: 'camp-auto-itajai', name: 'Garage 11 Est�tica Automotiva', location: 'Itaja� � 7,1 km', tag: 'Site recomendado', site: 84, system: 34, score: 84, reason: 'Instagram ativo sem funil de or�amento.', status: 'Aprovado', evidence: ['Instagram atualizado com servi�os e ve�culos finalizados.', 'Nenhuma p�gina de or�amento foi identificada no link da bio.', 'Atendimento depende de direct e WhatsApp sem triagem.'], message: 'Ol�, pessoal da Garage 11! O trabalho de voc�s no Instagram est� muito bem apresentado. Vi uma oportunidade de levar esse padr�o para uma p�gina r�pida de or�amento, separando polimento, vitrifica��o e detalhamento antes do contato no WhatsApp. Posso enviar uma refer�ncia curta?', updatedAt: '2026-11-05T00:00:00.000Z' }
  ],
  notifications: []
};

async function database() {
  try { return JSON.parse(await readFile(dbFile, 'utf8')); }
  catch { await mkdir(dbDir, { recursive: true }); await writeFile(dbFile, JSON.stringify(seed, null, 2), 'utf8'); return structuredClone(seed); }
}
async function save(data) { await mkdir(dbDir, { recursive: true }); await writeFile(dbFile, JSON.stringify(data, null, 2), 'utf8'); }
async function body(req) { let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function reply(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
function scoreLead(lead) {
  const text = [lead.reason, ...(lead.evidence || [])].join(' ').toLowerCase();
  const siteSignals = ['sem site', 'n�o foi identificado um dom�nio', 'sem funil', 'sem p�gina', 'formul�rio'];
  const systemSignals = ['frotas', 'recorrente', 'or�amentos', 'v�rios tipos', 'rastreio'];
  const site = Math.min(98, 52 + siteSignals.filter(s => text.includes(s)).length * 13);
  const system = Math.min(92, 34 + systemSignals.filter(s => text.includes(s)).length * 11);
  return { site, system, score: Math.max(site, system), tag: system > site ? 'Sistema avaliado' : 'Site recomendado' };
}
function contentType(file) { return file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/octet-stream'; }
function whatsAppConfig() {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    recipient: process.env.WHATSAPP_ALERT_RECIPIENT,
    template: process.env.WHATSAPP_TEMPLATE_NAME,
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR',
    version: process.env.WHATSAPP_GRAPH_VERSION || 'v24.0'
  };
}
async function sendWhatsAppAlert(message) {
  const config = whatsAppConfig();
  if (!config.token || !config.phoneNumberId || !config.recipient || !config.template) {
    return { sent: false, reason: 'Configura��o do WhatsApp pendente.' };
  }
  const response = await fetch(`https://graph.facebook.com/${config.version}/${config.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: config.recipient.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: config.template,
        language: { code: config.language },
        components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }]
      }
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'A Meta recusou o alerta.');
  return { sent: true, payload };
}
async function registerNotification(db, type, message) {
  const delivery = await sendWhatsAppAlert(message);
  db.notifications ??= [];
  db.notifications.unshift({ id: crypto.randomUUID(), type, message, delivery, createdAt: new Date().toISOString() });
  await save(db);
  return delivery;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return reply(res, 200, { ok: true, service: 'zhep-radar', ollama: Boolean(process.env.OLLAMA_HOST), whatsapp: Boolean(whatsAppConfig().token) });
    if (req.method === 'GET' && url.pathname === '/api/notifications') { const db = await database(); return reply(res, 200, db.notifications || []); }
    if (req.method === 'POST' && url.pathname === '/api/notifications/test') {
      const db = await database(); const delivery = await registerNotification(db, 'test', 'Teste do ZHEP Hunter: seus alertas comerciais est�o ativos.');
      return reply(res, delivery.sent ? 200 : 202, delivery);
    }
    if (req.method === 'GET' && url.pathname === '/api/campaigns') { const db = await database(); return reply(res, 200, db.campaigns); }
    if (req.method === 'GET' && url.pathname === '/api/leads') { const db = await database(); const campaignId = url.searchParams.get('campaignId'); return reply(res, 200, campaignId ? db.leads.filter(l => l.campaignId === campaignId) : db.leads); }
    if (req.method === 'POST' && url.pathname === '/api/campaigns') {
      const input = await body(req); if (!input.name || !input.niche || !input.location || !input.offer) return reply(res, 422, { error: 'Preencha nome, nicho, localidade e oferta.' });
      const db = await database(); const campaign = { id: crypto.randomUUID(), name: input.name.trim(), niche: input.niche.trim(), location: input.location.trim(), offer: input.offer, active: true, createdAt: new Date().toISOString() }; db.campaigns.unshift(campaign); await save(db); return reply(res, 201, campaign);
    }
    const leadMatch = url.pathname.match(/^\/api\/leads\/([^/]+)(?:\/(analyze))?$/);
    if (leadMatch) {
      const db = await database(); const lead = db.leads.find(item => item.id === leadMatch[1]); if (!lead) return reply(res, 404, { error: 'Lead n�o encontrado.' });
      if (req.method === 'PATCH') {
        const input = await body(req); if (input.status) lead.status = input.status; if (input.message) lead.message = input.message; lead.updatedAt = new Date().toISOString(); await save(db);
        if (lead.status === 'Aprovado') await registerNotification(db, 'lead_approved', `Lead aprovado: ${lead.name}. Potencial ${lead.score}/100 para ${lead.tag.toLowerCase()}.`);
        return reply(res, 200, lead);
      }
      if (req.method === 'POST' && leadMatch[2] === 'analyze') { Object.assign(lead, scoreLead(lead), { updatedAt: new Date().toISOString() }); await save(db); return reply(res, 200, lead); }
    }
    if (req.method === 'GET') {
      const requested = url.pathname === '/' ? 'index.html' : path.normalize(url.pathname).replace(/^([.][.][\\/])+/, '');
      const file = path.join(publicDir, requested); if (!file.startsWith(publicDir) || !(await stat(file)).isFile()) return reply(res, 404, { error: 'P�gina n�o encontrada.' });
      res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-cache' }); res.end(await readFile(file)); return;
    }
    reply(res, 405, { error: 'M�todo n�o permitido.' });
  } catch (error) { console.error(error); reply(res, 500, { error: 'Erro interno do Radar.' }); }
}).listen(port, () => console.log(`ZHEP Radar em http://localhost:${port}`));

