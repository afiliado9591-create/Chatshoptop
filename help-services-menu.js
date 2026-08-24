(function () {
  'use strict';

  const EMAIL_SUPORTE = 'jeanaguiar636@gmail.com';

  function enviarPedido(servico) {
    const usuario = document.getElementById('userEmail')?.textContent?.trim() || '';
    const assunto = 'Pedido de ajuda ChatShop - ' + servico;
    const corpo = [
      'Olá! Quero contratar este serviço do ChatShop:',
      '',
      servico,
      usuario ? 'Conta: ' + usuario : '',
      '',
      'Por favor, envie as orientações para contratação.'
    ].filter(Boolean).join('\n');
    window.location.href = 'mailto:' + EMAIL_SUPORTE
      + '?subject=' + encodeURIComponent(assunto)
      + '&body=' + encodeURIComponent(corpo);
  }

  function fechar() {
    const modal = document.getElementById('ajudaContratacaoModal');
    if (modal) modal.style.display = 'none';
  }

  function abrir(view) {
    const modal = document.getElementById('ajudaContratacaoModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.querySelectorAll('[data-ajuda-view]').forEach(function (el) {
      el.style.display = el.dataset.ajudaView === view ? 'block' : 'none';
    });
  }

  function instalar() {
    const planosBtn = document.getElementById('verPlanosBtn');
    if (!planosBtn || document.getElementById('precisaAjudaBtn')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'ajuda-menu-wrap';
    wrapper.innerHTML =
      '<button class="btn" id="precisaAjudaBtn" type="button" aria-expanded="false">🤝 Precisa de ajuda? ▾</button>' +
      '<div class="ajuda-submenu" id="ajudaSubmenu" role="menu">' +
        '<button type="button" data-view="loja">🛒 Contratar Loja Virtual</button>' +
        '<button type="button" data-view="catalogo">📦 Contratar Catálogo</button>' +
      '</div>';
    planosBtn.parentElement.insertBefore(wrapper, planosBtn);

    const modal = document.createElement('div');
    modal.id = 'ajudaContratacaoModal';
    modal.className = 'ajuda-modal';
    modal.style.display = 'none';
    modal.innerHTML =
      '<div class="ajuda-overlay" data-fechar-ajuda></div>' +
      '<section class="ajuda-caixa" role="dialog" aria-modal="true" aria-labelledby="ajudaTitulo">' +
        '<button class="ajuda-fechar" type="button" data-fechar-ajuda aria-label="Fechar">×</button>' +
        '<div data-ajuda-view="catalogo">' +
          '<h2 id="ajudaTitulo">📦 Contratar catálogo pronto</h2>' +
          '<p class="ajuda-intro">Escolha o tamanho do catálogo. O valor mostrado é da montagem e o pacote inclui a contratação do plano indicado.</p>' +
          '<div class="ajuda-pacotes">' +
            '<article class="ajuda-pacote">' +
              '<span class="ajuda-etiqueta">10 a 30 produtos</span>' +
              '<h3>Catálogo Essencial</h3>' +
              '<strong>R$ 80,00</strong>' +
              '<p>Montagem do catálogo + contratação do Plano Básico.</p>' +
              '<button class="btn primary" type="button" data-servico="Catálogo de 10 a 30 produtos — R$ 80,00 + Plano Básico">Contratar este pacote</button>' +
            '</article>' +
            '<article class="ajuda-pacote destaque">' +
              '<span class="ajuda-etiqueta">Até 50 produtos</span>' +
              '<h3>Catálogo Completo</h3>' +
              '<strong>R$ 120,00</strong>' +
              '<p>Montagem do catálogo + contratação do Plano Básico.</p>' +
              '<button class="btn primary" type="button" data-servico="Catálogo de até 50 produtos — R$ 120,00 + Plano Básico">Contratar este pacote</button>' +
            '</article>' +
            '<article class="ajuda-pacote">' +
              '<span class="ajuda-etiqueta">Acima de 50 produtos</span>' +
              '<h3>Catálogo Especial</h3>' +
              '<strong>Sob orçamento</strong>' +
              '<p>Plano Especial + montagem personalizada do catálogo.</p>' +
              '<button class="btn primary" type="button" data-servico="Catálogo acima de 50 produtos — Plano Especial + orçamento">Pedir orçamento</button>' +
            '</article>' +
          '</div>' +
          '<small class="ajuda-aviso">A assinatura mensal do plano é informada e confirmada antes da contratação.</small>' +
        '</div>' +
        '<div data-ajuda-view="loja" style="display:none">' +
          '<h2 id="ajudaTituloLoja">🛒 Contratar Loja Virtual</h2>' +
          '<p class="ajuda-intro">Solicite a montagem da sua loja virtual com produtos, aparência e configurações iniciais.</p>' +
          '<div class="ajuda-pacote">' +
            '<h3>Loja Virtual Personalizada</h3>' +
            '<p>Após o contato, definiremos a quantidade de produtos e as configurações necessárias para preparar o orçamento.</p>' +
            '<button class="btn primary" type="button" data-servico="Montagem de Loja Virtual — solicitar orçamento">Solicitar orçamento</button>' +
          '</div>' +
        '</div>' +
      '</section>';
    document.body.appendChild(modal);

    const style = document.createElement('style');
    style.textContent =
      '.ajuda-menu-wrap{position:relative;display:inline-flex}.ajuda-submenu{display:none;position:absolute;right:0;top:calc(100% + 7px);z-index:45;width:230px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:6px;box-shadow:0 12px 30px rgba(31,41,55,.18)}' +
      '.ajuda-submenu.open{display:grid;gap:4px}.ajuda-submenu button{border:0;background:#fff;text-align:left;padding:11px;border-radius:8px;cursor:pointer;font-weight:700;color:#1f2937}.ajuda-submenu button:hover{background:#f5f3ff;color:#4c1d95}' +
      '.ajuda-modal{position:fixed;inset:0;z-index:100;align-items:center;justify-content:center;padding:16px}.ajuda-overlay{position:absolute;inset:0;background:rgba(0,0,0,.55)}.ajuda-caixa{position:relative;background:#fff;border-radius:16px;padding:22px;max-width:760px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 18px 50px rgba(0,0,0,.25)}' +
      '.ajuda-fechar{position:absolute;right:12px;top:10px;border:0;background:none;font-size:26px;cursor:pointer;color:#6b7280}.ajuda-caixa h2{margin:0 34px 6px 0}.ajuda-intro{color:#6b7280;font-size:14px;line-height:1.5}.ajuda-pacotes{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.ajuda-pacote{border:1px solid #e5e7eb;border-radius:14px;padding:16px;background:#fff}.ajuda-pacote.destaque{border:2px solid #6d28d9;background:#faf5ff}.ajuda-pacote h3{margin:8px 0}.ajuda-pacote strong{display:block;font-size:22px;color:#4c1d95;margin-bottom:8px}.ajuda-pacote p{font-size:13px;color:#6b7280;line-height:1.45;min-height:55px}.ajuda-pacote .btn{width:100%}.ajuda-etiqueta{font-size:11px;font-weight:800;color:#6d28d9;background:#ede9fe;border-radius:20px;padding:5px 9px;display:inline-block}.ajuda-aviso{display:block;color:#6b7280;background:#f9fafb;border-radius:8px;padding:10px}' +
      '@media(max-width:700px){.ajuda-menu-wrap{width:100%}.ajuda-menu-wrap>.btn{width:100%}.ajuda-submenu{left:0;right:auto;width:100%}.ajuda-pacotes{grid-template-columns:1fr}.ajuda-pacote p{min-height:0}}';
    document.head.appendChild(style);

    const menuBtn = document.getElementById('precisaAjudaBtn');
    const submenu = document.getElementById('ajudaSubmenu');
    menuBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      const aberto = submenu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
    submenu.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-view]');
      if (!btn) return;
      submenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      abrir(btn.dataset.view);
    });
    modal.addEventListener('click', function (event) {
      const fecharBtn = event.target.closest('[data-fechar-ajuda]');
      if (fecharBtn) fechar();
      const servicoBtn = event.target.closest('[data-servico]');
      if (servicoBtn) enviarPedido(servicoBtn.dataset.servico);
    });
    document.addEventListener('click', function (event) {
      if (!wrapper.contains(event.target)) {
        submenu.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') fechar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instalar);
  } else {
    instalar();
  }
})();