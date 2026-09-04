// ==========================================
// CONFIGURAÇÕES GERAIS E BANCO
// ==========================================
const BIN_ID = '6a9ab03cf5f4af5e2969c9d5';
const API_KEY = '$2a$10$qJQyHCicBIBm9RJzr7tzFed0uQkAvUuywD9WXi5XHe6KJIbWKVlKy';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const SENHA_ADM = 'pirata123'; // Senha para o painel de administração

const FILMES_MOCK = [
    {
        id: 1,
        titulo: "Piratas do Caribe: A Maldição do Peróla Negra",
        genero: "Aventura / Fantasia",
        ano: 2003,
        imagem: "🏴‍☠️",
        avaliacao: "⭐⭐⭐⭐⭐",
        sinopse: "O ferreiro Will Turner se une ao excêntrico pirata Capitão Jack Sparrow para salvar sua amada."
    },
    {
        id: 2,
        titulo: "A Ilha da Garganta Cortada",
        genero: "Ação / Aventura",
        ano: 1995,
        imagem: "🗡️",
        avaliacao: "⭐⭐⭐⭐☆",
        sinopse: "Uma capitã pirata tenta encontrar um tesouro enterrado antes que seu tio cruel o alcance."
    },
    {
        id: 3,
        titulo: "Capitão Phillips",
        genero: "Biografia / Drama",
        ano: 2013,
        imagem: "⚓",
        avaliacao: "⭐⭐⭐⭐⭐",
        sinopse: "A história real do sequestro do navio MV Maersk Alabama por piratas somalis."
    }
];

// ==========================================
// OBTENÇÃO DO IP DO CLIENTE
// ==========================================
async function obterIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Erro ao obter IP:', error);
        return 'ip_desconhecido';
    }
}

// ==========================================
// INTEGRAÇÃO BANCO DE DADOS (JSONBIN)
// ==========================================
async function buscarDadosOnline() {
    try {
        const response = await fetch(JSONBIN_URL, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });
        const data = await response.json();
        return data.record || { votos: [], ultimosVotantes: [], ipsVotantes: [] };
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return { votos: [], ultimosVotantes: [], ipsVotantes: [] };
    }
}

async function salvarDadosOnline(novosDados) {
    try {
        await fetch(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(novosDados)
        });
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
    }
}

// ==========================================
// LÓGICA DE VOTAÇÃO
// ==========================================
async function votar(idFilme, tituloFilme) {
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = '🔍 Verificando pergaminhos do IP...';

    const userIP = await obterIP();
    const dadosAtuais = await buscarDadosOnline();

    // Garante que o array de IPs existe no JSON
    if (!dadosAtuais.ipsVotantes) dadosAtuais.ipsVotantes = [];

    // Validação de Voto Único por IP
    if (dadosAtuais.ipsVotantes.includes(userIP)) {
        alert(`⚠️ O seu IP (${userIP}) já realizou um voto! Cada pirata só pode votar uma vez.`);
        if (statusText) statusText.textContent = `❌ IP (${userIP}) já registrou voto nesta sessão.`;
        return;
    }

    const nomePirata = prompt("Digite o seu nome de pirata para registrar o voto:") || "Pirata Anônimo";

    // Registra Voto, Votante e IP
    dadosAtuais.votos.push(idFilme);
    dadosAtuais.ipsVotantes.push(userIP);
    dadosAtuais.ultimosVotantes.unshift({
        nome: nomePirata,
        filme: tituloFilme,
        ip: userIP,
        data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });

    dadosAtuais.ultimosVotantes = dadosAtuais.ultimosVotantes.slice(0, 10);

    await salvarDadosOnline(dadosAtuais);

    if (statusText) {
        statusText.innerHTML = `✅ Voto de <strong>${nomePirata}</strong> registrado!`;
    }

    alert(`⚔️ Voto salvo com sucesso, Capitão ${nomePirata}!`);
}

// ==========================================
// PAINEL DE ADMINISTRAÇÃO (LIBERAÇÃO DE IP)
// ==========================================
async function liberarIP() {
    const senha = document.getElementById('admin-pass').value;
    const msg = document.getElementById('admin-msg');

    if (senha !== SENHA_ADM) {
        msg.innerHTML = `<span style="color: var(--accent);">❌ Senha incorreta!</span>`;
        return;
    }

    const userIP = await obterIP();
    const dadosAtuais = await buscarDadosOnline();

    if (!dadosAtuais.ipsVotantes) dadosAtuais.ipsVotantes = [];

    // Remove o IP do usuário da lista de bloqueio
    dadosAtuais.ipsVotantes = dadosAtuais.ipsVotantes.filter(ip => ip !== userIP);

    await salvarDadosOnline(dadosAtuais);
    msg.innerHTML = `<span style="color: var(--gold);">✅ O IP (${userIP}) foi liberado para votar novamente!</span>`;
}

async function resetarTodosIPs() {
    const senha = document.getElementById('admin-pass').value;
    const msg = document.getElementById('admin-msg');

    if (senha !== SENHA_ADM) {
        msg.innerHTML = `<span style="color: var(--accent);">❌ Senha incorreta!</span>`;
        return;
    }

    const dadosAtuais = await buscarDadosOnline();
    dadosAtuais.ipsVotantes = [];

    await salvarDadosOnline(dadosAtuais);
    msg.innerHTML = `<span style="color: var(--gold);">🔥 Todos os IPs foram zerados do banco de dados!</span>`;
}

// ==========================================
// RESULTADOS E ESTATÍSTICAS
// ==========================================
async function carregarResultados() {
    const resContent = document.getElementById('resultados-content');
    resContent.innerHTML = `<div class="loading">Buscando mapa de votos atualizado...</div>`;

    const dados = await buscarDadosOnline();
    const totalVotos = dados.votos.length;

    if (totalVotos === 0) {
        resContent.innerHTML = `<p style="text-align: center;">📜 Nenhum voto computado até o momento.</p>`;
        return;
    }

    resContent.innerHTML = FILMES_MOCK.map(filme => {
        const votosDoFilme = dados.votos.filter(votoId => votoId === filme.id).length;
        const porcentagem = Math.round((votosDoFilme / totalVotos) * 100) || 0;

        return `
            <div class="resultado-item">
                <div class="top-info">
                    <span class="titulo">${filme.imagem} ${filme.titulo}</span>
                    <span class="votos-info">${votosDoFilme} Votos (${porcentagem}%)</span>
                </div>
                <div class="barra-progresso">
                    <div class="preenchimento" style="width: ${porcentagem}%;">${porcentagem}%</div>
                </div>
            </div>
        `;
    }).join('');
}

async function carregarEstatisticas() {
    const statContent = document.getElementById('estatisticas-content');
    statContent.innerHTML = `<div class="loading">Contando as moedas do baú...</div>`;

    const dados = await buscarDadosOnline();
    const totalVotos = dados.votos.length;

    const listaVotantesHTML = dados.ultimosVotantes && dados.ultimosVotantes.length > 0 
        ? dados.ultimosVotantes.map(v => `<li><strong>${v.nome}</strong> votou em <em>${v.filme}</em> às ${v.data} (IP: ${v.ip || 'Oculto'})</li>`).join('')
        : '<li>Nenhum pirata votou ainda.</li>';

    statContent.innerHTML = `
        <div class="estatisticas-grid">
            <div class="stat-card">
                <span class="numero">${totalVotos}</span>
                <span class="label">Total de Votos Registrados</span>
            </div>
            <div class="stat-card">
                <span class="numero">${dados.ipsVotantes ? dados.ipsVotantes.length : 0}</span>
                <span class="label">IPs Registrados</span>
            </div>
        </div>
        <div class="pirate-card" style="margin-top: 20px; padding: 20px;">
            <h3>📜 Últimos Piratas a Votar:</h3>
            <ul style="margin-top: 10px; padding-left: 20px; line-height: 1.8;">
                ${listaVotantesHTML}
            </ul>
        </div>
    `;
}

// ==========================================
// NAVEGAÇÃO E INICIALIZAÇÃO
// ==========================================
function inicializarNavegacao() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) content.classList.add('active');
            });

            if (targetTab === 'resultados') carregarResultados();
            if (targetTab === 'estatisticas') carregarEstatisticas();
        });
    });
}

function carregarFilmes() {
    const grid = document.getElementById('filmes-grid');
    const loading = document.getElementById('loading-filmes');

    setTimeout(() => {
        loading.style.display = 'none';
        grid.style.display = 'grid';

        grid.innerHTML = FILMES_MOCK.map(filme => `
            <div class="filme-card" data-id="${filme.id}">
                <span class="emoji">${filme.imagem}</span>
                <h3>${filme.titulo}</h3>
                <span class="genero">${filme.genero}</span>
                <span class="ano">${filme.ano}</span>
                <div style="margin: 8px 0; font-size: 1.1rem;">${filme.avaliacao}</div>
                <p class="sinopse">${filme.sinopse}</p>
                <button class="votar-btn" onclick="votar(${filme.id}, '${filme.titulo}')">🗡️ Escolher</button>
            </div>
        `).join('');
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarNavegacao();
    carregarFilmes();
});