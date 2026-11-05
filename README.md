# ZHEP Radar

MVP do painel de prospec��o da ZHEP. Esta primeira vers�o possui campanhas e leads persistidos localmente, com an�lise explic�vel e sem coleta ou envio real.

## Pr�ximas integra��es

1. Google Places API para descoberta de empresas por campanha.
2. Banco PostgreSQL e autentica��o.
3. Worker para an�lise de sites e pontua��o baseada em evid�ncias.
4. IA para resumo e rascunho de abordagem.
5. WhatsApp Cloud API apenas para conversas permitidas e respostas recebidas.

## Execu��o local

```powershell
npm run dev
```

Abra `http://localhost:5050`. Na primeira execu��o, os dados de demonstra��o s�o criados em `data/zhep-radar.json`.

## Integra��es futuras

- `GOOGLE_MAPS_API_KEY`: descoberta de empresas por segmento e localidade.
- `OLLAMA_HOST`: an�lise e abordagem local com Ollama.
- WhatsApp Cloud API: respostas e automa��es permitidas.

