// ==========================================
// CONFIGURAÇÕES GERAIS E BANCO (JSONBin)
// ==========================================
// 1. Crie conta em https://jsonbin.io
// 2. Vá em API Keys e copie a Master Key
// 3. Crie um Bin com o JSON inicial:
//    {
//      "votos": [],
//      "ultimosVotantes": [],
//      "ipsVotantes": [],
//      "assentosOcupados": [],
//      "usuarios": [],
//      "config": { "numFileiras": 8, "assentosPorFileira": 10 }
//    }
// 4. Cole o Bin ID e a Master Key abaixo

const BIN_ID = '6abcf5ffac6210605a0531a4';
const API_KEY = '$2a$10$Flk.vXmwEjLcATGnY6FI1O6G3QXQS2UNjuKGJOgqF3gbyzDf56TIS';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const SENHA_ADM = 'pirata123';

// Estado da sessão
let usuarioAtual = null;          // { nome, senha }
let filmeSelecionado = null;      // { id, titulo }
let assentoSelecionado = null;    // "C7"
let assentosOcupados = new Set(); // códigos ocupados
let configAssentos = { numFileiras: 8, assentosPorFileira: 10 };
let adminAutenticado = false;

// ==========================================
// MODAL CUSTOMIZADO (substitui alert/confirm)
// ==========================================
function mostrarAlerta(mensagem) {
    return new Promise(resolve => {
        const overlay = document.getElementById('modal-overlay');
        const texto = document.getElementById('modal-texto');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancelar');

        texto.textContent = mensagem;
        btnCancel.style.display = 'none';
        btnOk.textContent = 'OK';
        overlay.style.display = 'flex';

        const fechar = () => {
            overlay.style.display = 'none';
            btnOk.onclick = null;
            resolve();
        };
        btnOk.onclick = fechar;
    });
}

function mostrarConfirmacao(mensagem) {
    return new Promise(resolve => {
        const overlay = document.getElementById('modal-overlay');
        const texto = document.getElementById('modal-texto');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancelar');

        texto.textContent = mensagem;
        btnCancel.style.display = 'inline-block';
        btnOk.textContent = 'Confirmar';
        btnCancel.textContent = 'Cancelar';
        overlay.style.display = 'flex';

        const limpar = () => {
            overlay.style.display = 'none';
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };

        btnOk.onclick = () => { limpar(); resolve(true); };
        btnCancel.onclick = () => { limpar(); resolve(false); };
    });
}

const FILMES_MOCK = [
    {
        id: 1,
        titulo: "Piratas do Caribe: A Maldição do Pérola Negra",
        genero: "Aventura / Fantasia",
        ano: 2003,
        imagem: "🏴‍☠️",
        avaliacao: "⭐⭐⭐⭐⭐",
        sinopse: "O ferreiro Will Turner se une ao excêntrico pirata Capitão Jack Sparrow para salvar sua amada."
    },
    {
        id: 2,
        titulo: "Um Dia De Fúria",
        genero: "Thriller/Crime",
        ano: 1993,
        imagem: "😡",
        avaliacao: "⭐⭐⭐⭐☆",
        sinopse: "Um policial tenta deter as atitudes violentas de William Foster, um homem de meia-idade estressado, que está desempregado e em processo de divórcio. Frustrado com o trânsito, o homem fica enfurecido, quando seu carro quebra em um engarrafamento gigante em uma das rodovias da área de Los Angeles."
    },
    {
        id: 3,
        titulo: "Se Beber Não Case 2",
        genero: "comédia",
        ano: 2011,
        imagem: "🍾",
        avaliacao: "⭐⭐⭐⭐☆",
        sinopse: "Dois anos depois da desastrosa despedida de solteiro de Doug em Las Vegas, agora é a vez de Stu. Ele decide se casar na Tailândia, país de sua futura mulher. Com medo de que os incidentes da despedida de solteiro em Las Vegas se repitam, Stu organiza muito bem a comemoração, mas nada sai como o esperado, e as confusões prometem ser inimagináveis."
    },
    {
        id: 4,
        titulo: "Guardiões da Galáxia",
        genero: "Ação/Ficção científica",
        ano: 2014,
        imagem: "🦝༘⋆📼 ೀ",
        avaliacao: "⭐⭐⭐⭐☆",
        sinopse: "O aventureiro do espaço, Peter Quill, torna-se presa de caçadores de recompensas após roubar a esfera do vilão traiçoeiro, Ronan. Para escapar do perigo, faz uma aliança com um grupo de quatro extraterrestres. Quill descobre que a esfera foi roubada e possui um poder capaz de mudar os rumos do universo. Ele e seu grupo precisam proteger o objeto para salvar o futuro da galáxia."
    },
    {
        id: 5,
        titulo: "De Volta para o Futuro",
        genero: "Ficção científica/Comédia",
        ano: 1985,
        imagem: "🚘",
        avaliacao: "⭐⭐⭐⭐⭐",
        sinopse: "O adolescente Marty McFly é transportado para o ano de 1955 quando uma experiência do excêntrico cientista Doc Brown é malsucedida. Marty viaja pelo tempo em um carro modificado e acaba conhecendo seus pais ainda jovens. O problema é que ele pode deixar de existir porque interferiu na rotina dos pais, que correm o risco de não se apaixonarem mais. Para complicar ainda mais a situação, Marty precisa voltar para casa a tempo de salvar o cientista."
    },
    {
        id: 6,
        titulo: "Sexta-feira 13",
        genero: "Terror/Crime",
        ano: 1980,
        imagem: "🔪",
        avaliacao: "⭐⭐⭐☆☆",
        sinopse: "Um grupo de monitores é brutalmente assassinado, um a um, em um acampamento de verão realizado no Camp Crystal Lake, quando o empresário Steve Christie reabre o local, que estava fechado há anos."
    }
];

// ==========================================
// IP E BANCO
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

async function buscarDadosOnline() {
    try {
        const response = await fetch(`${JSONBIN_URL}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });
        if (!response.ok) {
            console.error('Erro HTTP ao buscar dados:', response.status);
            return dadosPadrao();
        }
        const data = await response.json();
        return normalizarDados(data.record || {});
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return dadosPadrao();
    }
}

function dadosPadrao() {
    return {
        votos: [],
        ultimosVotantes: [],
        ipsVotantes: [],
        assentosOcupados: [],
        usuarios: [],
        config: { numFileiras: 8, assentosPorFileira: 10 }
    };
}

function normalizarDados(d) {
    return {
        votos: Array.isArray(d.votos) ? d.votos : [],
        ultimosVotantes: Array.isArray(d.ultimosVotantes) ? d.ultimosVotantes : [],
        ipsVotantes: Array.isArray(d.ipsVotantes) ? d.ipsVotantes : [],
        assentosOcupados: Array.isArray(d.assentosOcupados) ? d.assentosOcupados : [],
        usuarios: Array.isArray(d.usuarios) ? d.usuarios : [],
        config: d.config && typeof d.config === 'object'
            ? { numFileiras: d.config.numFileiras || 8, assentosPorFileira: d.config.assentosPorFileira || 10 }
            : { numFileiras: 8, assentosPorFileira: 10 }
    };
}

async function salvarDadosOnline(dados) {
    try {
        const response = await fetch(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(dados)
        });
        if (!response.ok) {
            const erro = await response.text();
            console.error('Erro ao salvar dados:', response.status, erro);
            throw new Error(`Falha ao salvar (${response.status})`);
        }
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados online:', error);
        throw error;
    }
}

// ==========================================
// LOGIN / LOGOUT
// ==========================================
async function fazerLogin() {
    const nome = (document.getElementById('login-nome').value || '').trim();
    const senha = (document.getElementById('login-senha').value || '').trim();
    const msg = document.getElementById('login-msg');

    if (!nome || nome.length < 2) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Digite um nome de pirata (mín. 2 letras).</span>';
        return;
    }
    if (!senha || senha.length < 3) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ A senha precisa ter pelo menos 3 caracteres.</span>';
        return;
    }

    msg.innerHTML = '<span style="color:var(--gold);">🔍 Consultando o livro dos piratas...</span>';

    try {
        const dados = await buscarDadosOnline();
        const usuarioExistente = dados.usuarios.find(u => u.nome.toLowerCase() === nome.toLowerCase());

        if (usuarioExistente) {
            if (usuarioExistente.senha !== senha) {
                msg.innerHTML = '<span style="color:var(--accent);">❌ Senha incorreta para este pirata!</span>';
                return;
            }
            usuarioAtual = { nome: usuarioExistente.nome, senha: usuarioExistente.senha };
            msg.innerHTML = `<span style="color:var(--gold);">✅ Bem-vindo de volta, Capitão ${usuarioAtual.nome}!</span>`;
        } else {
            dados.usuarios.push({ nome, senha });
            await salvarDadosOnline(dados);
            usuarioAtual = { nome, senha };
            msg.innerHTML = `<span style="color:var(--gold);">✅ Cadastro criado! Bem-vindo, Capitão ${nome}!</span>`;
        }

        sessionStorage.setItem('cinevota_user', JSON.stringify(usuarioAtual));

        setTimeout(() => {
            document.getElementById('tela-login').style.display = 'none';
            document.getElementById('app-principal').style.display = 'block';
            document.getElementById('usuario-logado').textContent = `🏴‍☠️ Capitão ${usuarioAtual.nome}`;
            inicializarApp();
        }, 800);

    } catch (e) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Erro ao conectar no banco. Tente novamente.</span>';
    }
}

function fazerLogout() {
    sessionStorage.removeItem('cinevota_user');
    usuarioAtual = null;
    filmeSelecionado = null;
    assentoSelecionado = null;
    adminAutenticado = false;
    document.getElementById('app-principal').style.display = 'none';
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('login-nome').value = '';
    document.getElementById('login-senha').value = '';
    document.getElementById('login-msg').innerHTML = '';
    document.getElementById('admin-painel').style.display = 'none';
}

// ==========================================
// FLUXO DE VOTAÇÃO EM ETAPAS
// ==========================================
function escolherFilme(id, titulo) {
    filmeSelecionado = { id, titulo };
    document.getElementById('filme-escolhido-nome').textContent = titulo;
    irParaEtapa(2);
    carregarAssentosOcupados();
}

function irParaEtapa(num) {
    document.getElementById('etapa-filme').style.display = num === 1 ? 'block' : 'none';
    document.getElementById('etapa-assento').style.display = num === 2 ? 'block' : 'none';
    document.getElementById('etapa-confirma').style.display = num === 3 ? 'block' : 'none';

    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById(`etapa-${i}-ind`);
        el.classList.remove('active', 'concluida');
        if (i < num) el.classList.add('concluida');
        if (i === num) el.classList.add('active');
    }
}

function voltarParaFilmes() {
    assentoSelecionado = null;
    irParaEtapa(1);
}

function voltarParaAssentos() {
    irParaEtapa(2);
}

async function irParaConfirmacao() {
    if (!assentoSelecionado) {
        await mostrarAlerta('⚠️ Selecione um assento primeiro!');
        return;
    }
    document.getElementById('resumo-nome').textContent = usuarioAtual.nome;
    document.getElementById('resumo-filme').textContent = filmeSelecionado.titulo;
    document.getElementById('resumo-assento').textContent = assentoSelecionado;
    irParaEtapa(3);
}

async function confirmarVotoFinal() {
    if (!usuarioAtual || !filmeSelecionado || !assentoSelecionado) {
        await mostrarAlerta('⚠️ Dados incompletos. Reinicie o processo.');
        irParaEtapa(1);
        return;
    }

    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = '🔍 Registrando voto no livro dos piratas...';

    try {
        const userIP = await obterIP();
        const dados = await buscarDadosOnline();

        if (dados.ipsVotantes.includes(userIP)) {
            await mostrarAlerta(`⚠️ Seu IP (${userIP}) já registrou um voto! Cada pirata só pode votar uma vez.`);
            if (statusText) statusText.textContent = `❌ IP já votou.`;
            return;
        }

        if (dados.ultimosVotantes.some(v => v.nome.toLowerCase() === usuarioAtual.nome.toLowerCase())) {
            await mostrarAlerta(`⚠️ O pirata "${usuarioAtual.nome}" já votou!`);
            if (statusText) statusText.textContent = `❌ Este pirata já votou.`;
            return;
        }

        const ocupadosCodigos = dados.assentosOcupados.map(a => typeof a === 'string' ? a : a.codigo);
        if (ocupadosCodigos.includes(assentoSelecionado)) {
            await mostrarAlerta(`⚠️ O assento ${assentoSelecionado} acabou de ser ocupado! Escolha outro.`);
            assentosOcupados.add(assentoSelecionado);
            assentoSelecionado = null;
            renderizarMapaAssentos();
            irParaEtapa(2);
            return;
        }

        dados.votos.push(filmeSelecionado.id);
        dados.ipsVotantes.push(userIP);
        dados.assentosOcupados.push({
            codigo: assentoSelecionado,
            nome: usuarioAtual.nome,
            filmeId: filmeSelecionado.id
        });
        dados.ultimosVotantes.unshift({
            nome: usuarioAtual.nome,
            filme: filmeSelecionado.titulo,
            assento: assentoSelecionado,
            ip: userIP,
            data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
        dados.ultimosVotantes = dados.ultimosVotantes.slice(0, 20);

        await salvarDadosOnline(dados);

        assentosOcupados.add(assentoSelecionado);
        const assentoUsado = assentoSelecionado;
        const filmeUsado = filmeSelecionado.titulo;

        filmeSelecionado = null;
        assentoSelecionado = null;

        if (statusText) {
            statusText.innerHTML = `✅ Voto de <strong>${usuarioAtual.nome}</strong> registrado! Assento ${assentoUsado}`;
        }
        await mostrarAlerta(`⚔️ Voto confirmado, Capitão ${usuarioAtual.nome}!\n🎬 ${filmeUsado}\n🪑 Assento: ${assentoUsado}`);

        irParaEtapa(1);
        carregarFilmes();

    } catch (error) {
        await mostrarAlerta('❌ Não foi possível salvar o voto. Verifique a conexão / JSONBin.');
        if (statusText) statusText.textContent = '❌ Falha ao salvar o voto.';
    }
}

// ==========================================
// MAPA DE ASSENTOS
// ==========================================
function gerarLetrasFileiras(n) {
    const letras = [];
    for (let i = 0; i < n; i++) {
        letras.push(String.fromCharCode(65 + i));
    }
    return letras;
}

async function carregarAssentosOcupados() {
    const dados = await buscarDadosOnline();
    configAssentos = dados.config;
    assentosOcupados = new Set();

    dados.assentosOcupados.forEach(a => {
        if (typeof a === 'string') assentosOcupados.add(a);
        else if (a && a.codigo) assentosOcupados.add(a.codigo);
    });

    dados.ultimosVotantes.forEach(v => {
        if (v.assento) assentosOcupados.add(v.assento);
    });

    renderizarMapaAssentos();
}

function renderizarMapaAssentos() {
    const container = document.getElementById('mapa-assentos');
    if (!container) return;

    const fileiras = gerarLetrasFileiras(configAssentos.numFileiras);
    const porFileira = configAssentos.assentosPorFileira;
    const meio = Math.ceil(porFileira / 2);

    let html = '';
    fileiras.forEach(fileira => {
        html += `<div class="fileira">`;
        html += `<span class="fileira-label">${fileira}</span>`;

        for (let i = 1; i <= porFileira; i++) {
            if (i === meio + 1) html += `<div class="corredor"></div>`;

            const codigo = `${fileira}${i}`;
            let classes = 'seat';
            if (assentosOcupados.has(codigo)) classes += ' ocupado';
            else if (assentoSelecionado === codigo) classes += ' selecionado';
            else classes += ' livre';

            html += `<div class="${classes}" data-assento="${codigo}" onclick="selecionarAssento('${codigo}')" title="Assento ${codigo}">${i}</div>`;
        }

        html += `<span class="fileira-label">${fileira}</span></div>`;
    });

    container.innerHTML = html;
    atualizarTextoAssento();
}

function selecionarAssento(codigo) {
    if (assentosOcupados.has(codigo)) {
        mostrarAlerta(`⚠️ O assento ${codigo} já está ocupado!`);
        return;
    }
    assentoSelecionado = (assentoSelecionado === codigo) ? null : codigo;
    renderizarMapaAssentos();

    const btn = document.getElementById('btn-ir-confirmar');
    if (btn) btn.disabled = !assentoSelecionado;
}

function atualizarTextoAssento() {
    const el = document.getElementById('assento-selecionado-texto');
    if (!el) return;
    if (assentoSelecionado) {
        el.innerHTML = `✅ Assento selecionado: <strong>${assentoSelecionado}</strong>`;
    } else {
        el.textContent = 'Nenhum assento selecionado';
    }
}

// ==========================================
// LIBERAR MEU ASSENTO
// ==========================================
async function liberarMeuAssento() {
    const senha = (document.getElementById('senha-liberar').value || '').trim();
    const msg = document.getElementById('liberar-msg');

    if (!senha) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Digite a senha.</span>';
        return;
    }

    const isAdmin = senha === SENHA_ADM;
    const isOwner = usuarioAtual && senha === usuarioAtual.senha;

    if (!isAdmin && !isOwner) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Senha incorreta (cadastro ou ADM).</span>';
        return;
    }

    try {
        const dados = await buscarDadosOnline();
        const nomeBusca = usuarioAtual.nome.toLowerCase();

        const antes = dados.assentosOcupados.length;
        dados.assentosOcupados = dados.assentosOcupados.filter(a => {
            const nome = (typeof a === 'object' && a.nome) ? a.nome.toLowerCase() : null;
            return nome !== nomeBusca;
        });

        await salvarDadosOnline(dados);
        await carregarAssentosOcupados();

        const liberados = antes - dados.assentosOcupados.length;
        if (liberados > 0) {
            msg.innerHTML = `<span style="color:var(--gold);">✅ ${liberados} assento(s) de ${usuarioAtual.nome} liberado(s)!</span>`;
        } else {
            msg.innerHTML = `<span style="color:var(--gold);">ℹ️ Nenhum assento encontrado para ${usuarioAtual.nome}.</span>`;
        }
    } catch (e) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Erro ao liberar assento.</span>';
    }
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
    const totalIPs = dados.ipsVotantes.length;
    const totalAssentos = dados.assentosOcupados.length;
    const totalUsuarios = dados.usuarios.length;

    const listaVotantesHTML = dados.ultimosVotantes.length > 0
        ? dados.ultimosVotantes.map(v =>
            `<li><strong>${v.nome}</strong> votou em <em>${v.filme}</em>${v.assento ? ` (assento <strong>${v.assento}</strong>)` : ''} às ${v.data}</li>`
          ).join('')
        : '<li>Nenhum pirata votou ainda.</li>';

    statContent.innerHTML = `
        <div class="estatisticas-grid">
            <div class="stat-card">
                <span class="numero">${totalVotos}</span>
                <span class="label">Votos</span>
            </div>
            <div class="stat-card">
                <span class="numero">${totalAssentos}</span>
                <span class="label">Assentos Ocupados</span>
            </div>
            <div class="stat-card">
                <span class="numero">${totalIPs}</span>
                <span class="label">IPs</span>
            </div>
            <div class="stat-card">
                <span class="numero">${totalUsuarios}</span>
                <span class="label">Piratas Cadastrados</span>
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
// PAINEL DE ADMINISTRAÇÃO
// ==========================================
function verificarAdmin() {
    const senha = document.getElementById('admin-pass').value;
    const msg = document.getElementById('admin-msg');

    if (senha !== SENHA_ADM) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Senha incorreta!</span>';
        adminAutenticado = false;
        document.getElementById('admin-painel').style.display = 'none';
        return;
    }

    adminAutenticado = true;
    msg.innerHTML = '<span style="color:var(--gold);">✅ Acesso liberado, Capitão!</span>';
    document.getElementById('admin-painel').style.display = 'block';

    document.getElementById('cfg-fileiras').value = configAssentos.numFileiras;
    document.getElementById('cfg-assentos').value = configAssentos.assentosPorFileira;
}

async function salvarConfigAssentos() {
    if (!adminAutenticado) return;
    const msg = document.getElementById('cfg-msg');
    const nFileiras = parseInt(document.getElementById('cfg-fileiras').value, 10);
    const nAssentos = parseInt(document.getElementById('cfg-assentos').value, 10);

    if (isNaN(nFileiras) || nFileiras < 3 || nFileiras > 15 || isNaN(nAssentos) || nAssentos < 4 || nAssentos > 20) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Valores inválidos (fileiras 3-15, assentos 4-20).</span>';
        return;
    }

    try {
        const dados = await buscarDadosOnline();
        dados.config = { numFileiras: nFileiras, assentosPorFileira: nAssentos };
        await salvarDadosOnline(dados);
        configAssentos = dados.config;
        msg.innerHTML = `<span style="color:var(--gold);">✅ Configuração salva: ${nFileiras} fileiras × ${nAssentos} assentos.</span>`;
        await carregarAssentosOcupados();
    } catch (e) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Erro ao salvar configuração.</span>';
    }
}

async function adminZerarVotos() {
    if (!adminAutenticado) return;
    if (!(await mostrarConfirmacao('Tem certeza que deseja ZERAR TODOS os votos?'))) return;
    const msg = document.getElementById('reset-msg');
    try {
        const dados = await buscarDadosOnline();
        dados.votos = [];
        dados.ultimosVotantes = [];
        await salvarDadosOnline(dados);
        msg.innerHTML = '<span style="color:var(--gold);">🔥 Todos os votos foram zerados!</span>';
    } catch (e) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Erro ao zerar votos.</span>';
    }
}

async function adminZerarAssentos() {
    if (!adminAutenticado) return;
    if (!(await mostrarConfirmacao('Tem certeza que deseja LIBERAR TODOS os assentos?'))) return;
    const msg = document.getElementById('reset-msg');
    try {
        const dados = await buscarDadosOnline();
        dados.assentosOcupados = [];
        dados.ultimosVotantes.forEach(v => { delete v.assento; });
        await salvarDadosOnline(dados);
        assentosOcupados.clear();
        renderizarMapaAssentos();
        msg.innerHTML = '<span style="color:var(--gold);">🪑 Todos os assentos foram liberados!</span>';
    } catch (e) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Erro ao liberar assentos.</span>';
    }
}

async function adminZerarIPs() {
    if (!adminAutenticado) return;
    if (!(await mostrarConfirmacao('Tem certeza que deseja ZERAR TODOS os IPs?'))) return;
    const msg = document.getElementById('reset-msg');
    try {
        const dados = await buscarDadosOnline();
        dados.ipsVotantes = [];
        await salvarDadosOnline(dados);
        msg.innerHTML = '<span style="color:var(--gold);">🌐 Todos os IPs foram zerados!</span>';
    } catch (e) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Erro ao zerar IPs.</span>';
    }
}

async function adminResetTotal() {
    if (!adminAutenticado) return;
    if (!(await mostrarConfirmacao('💀 ATENÇÃO: Isso apaga VOTOS, ASSENTOS, IPs e USUÁRIOS. Continuar?'))) return;
    if (!(await mostrarConfirmacao('Última confirmação: RESET COMPLETO do banco?'))) return;
    const msg = document.getElementById('reset-msg');
    try {
        const dados = dadosPadrao();
        dados.config = { ...configAssentos };
        await salvarDadosOnline(dados);
        assentosOcupados.clear();
        renderizarMapaAssentos();
        msg.innerHTML = '<span style="color:var(--gold);">💀 Banco completamente resetado!</span>';
    } catch (e) {
        msg.innerHTML = '<span style="color:var(--accent);">❌ Erro no reset.</span>';
    }
}

async function carregarListaVotosAdmin() {
    if (!adminAutenticado) return;
    const container = document.getElementById('lista-votos-admin');
    container.innerHTML = '<div class="loading">Carregando...</div>';

    const dados = await buscarDadosOnline();
    if (dados.ultimosVotantes.length === 0) {
        container.innerHTML = '<p style="color:var(--text-dark);">Nenhum voto registrado.</p>';
        return;
    }

    container.innerHTML = dados.ultimosVotantes.map((v, idx) => `
        <div class="voto-admin-item">
            <div class="info">
                <strong>${v.nome}</strong> → ${v.filme}
                ${v.assento ? ` | Assento: <strong>${v.assento}</strong>` : ''}
                <br><small>${v.data} · IP: ${v.ip || '?'}</small>
            </div>
            <button onclick="adminExcluirVoto(${idx})">🗑️ Excluir</button>
        </div>
    `).join('');
}

async function adminExcluirVoto(index) {
    if (!adminAutenticado) return;
    if (!(await mostrarConfirmacao('Excluir este voto?'))) return;

    try {
        const dados = await buscarDadosOnline();
        if (index < 0 || index >= dados.ultimosVotantes.length) return;

        const removido = dados.ultimosVotantes[index];
        dados.ultimosVotantes.splice(index, 1);

        const filmeObj = FILMES_MOCK.find(f => f.titulo === removido.filme);
        if (filmeObj) {
            const pos = dados.votos.indexOf(filmeObj.id);
            if (pos !== -1) dados.votos.splice(pos, 1);
        }

        if (removido.assento) {
            dados.assentosOcupados = dados.assentosOcupados.filter(a => {
                const cod = typeof a === 'string' ? a : a.codigo;
                return cod !== removido.assento;
            });
            assentosOcupados.delete(removido.assento);
        }

        if (removido.ip) {
            const ipPos = dados.ipsVotantes.indexOf(removido.ip);
            if (ipPos !== -1) dados.ipsVotantes.splice(ipPos, 1);
        }

        await salvarDadosOnline(dados);
        renderizarMapaAssentos();
        carregarListaVotosAdmin();
        await mostrarAlerta(`✅ Voto de ${removido.nome} excluído.`);
    } catch (e) {
        await mostrarAlerta('❌ Erro ao excluir voto.');
    }
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
    if (!grid) return;

    setTimeout(() => {
        if (loading) loading.style.display = 'none';
        grid.style.display = 'grid';
        grid.innerHTML = FILMES_MOCK.map(filme => `
            <div class="filme-card" data-id="${filme.id}">
                <span class="emoji">${filme.imagem}</span>
                <h3>${filme.titulo}</h3>
                <span class="genero">${filme.genero}</span>
                <span class="ano">${filme.ano}</span>
                <div style="margin: 8px 0; font-size: 1.1rem;">${filme.avaliacao}</div>
                <p class="sinopse">${filme.sinopse}</p>
                <button class="votar-btn" onclick="escolherFilme(${filme.id}, '${filme.titulo.replace(/'/g, "\\'")}')">
                    🗡️ Escolher este filme
                </button>
            </div>
        `).join('');
    }, 400);
}

function inicializarApp() {
    inicializarNavegacao();
    carregarFilmes();
    carregarAssentosOcupados();
    irParaEtapa(1);

    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = `⚔️ Pronto para votar, Capitão ${usuarioAtual.nome}!`;
}

document.addEventListener('DOMContentLoaded', () => {
    const salvo = sessionStorage.getItem('cinevota_user');
    if (salvo) {
        try {
            usuarioAtual = JSON.parse(salvo);
            document.getElementById('tela-login').style.display = 'none';
            document.getElementById('app-principal').style.display = 'block';
            document.getElementById('usuario-logado').textContent = `🏴‍☠️ Capitão ${usuarioAtual.nome}`;
            inicializarApp();
            return;
        } catch (e) {
            sessionStorage.removeItem('cinevota_user');
        }
    }
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('app-principal').style.display = 'none';
});
