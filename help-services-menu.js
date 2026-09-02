(function () {
  'use strict';

  const EMAIL_SUPORTE = 'jeanaguiar636@gmail.com';

  const WHATSAPP_SUPORTE = '5511949885063';

  function enviarPedido(mensagem) {
    const texto = String(mensagem || '').trim();
    if (!texto) return;
    window.open(
      'https://wa.me/' + WHATSAPP_SUPORTE + '?text=' + encodeURIComponent(texto),
      '_blank',
      'noopener'
    );
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

    /* Gerador liberado gratuitamente por período temporário. */
    if (!document.getElementById('videoGeneratorBtn')) {
      const videoBtn = document.createElement('button');
      videoBtn.className = 'btn';
      videoBtn.id = 'videoGeneratorBtn';
      videoBtn.type = 'button';
      videoBtn.innerHTML = '🎬 Gerador de Vídeos <small style="font-size:10px;font-weight:900;background:#dcfce7;color:#166534;padding:3px 6px;border-radius:999px;white-space:nowrap">GRATUITO TEMPORARIAMENTE</small>';
      videoBtn.title = 'Gerador de vídeos gratuito temporariamente';
      videoBtn.addEventListener('click', function () {
        window.location.href = '/video-generator/';
      });
      planosBtn.parentElement.insertBefore(videoBtn, planosBtn);
    }

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
          '<p class="ajuda-intro">O Plano Básico é gratuito e permite criar seu próprio catálogo com até 30 produtos. Se preferir, você pode contratar apenas o serviço de montagem do catálogo.</p>' +
          '<div class="ajuda-pacotes">' +
            '<article class="ajuda-pacote">' +
              '<span class="ajuda-etiqueta">Até 30 produtos</span>' +
              '<h3>Catálogo Essencial</h3>' +
              '<strong>R$ 80,00</strong>' +
              '<p>Serviço de montagem do catálogo. O Plano Básico do ChatShop é gratuito.</p>' +
              '<button class="btn primary" type="button" data-servico="Quero contratar a montagem de um catálogo de até 30 produtos. Sei que o Plano Básico do ChatShop é gratuito.">Contratar pelo WhatsApp</button>' +
            '</article>' +
            '<article class="ajuda-pacote destaque">' +
              '<span class="ajuda-etiqueta">Mais de 30 produtos</span>' +
              '<h3>Catálogo Profissional</h3>' +
              '<strong>R$ 120,00</strong>' +
              '<p>Serviço de montagem para catálogo maior. Produtos ilimitados e Loja Virtual pertencem ao Plano Profissional.</p>' +
              '<button class="btn primary" type="button" data-servico="Quero contratar a montagem de um catálogo profissional com mais de 30 produtos.">Contratar pelo WhatsApp</button>' +
            '</article>' +
          '</div>' +
          '<small class="ajuda-aviso">Os valores acima são do serviço de montagem do catálogo. O Plano Básico é gratuito. O Plano Profissional custa R$ 49,90/mês.</small>' +
        '</div>' +
        '<div data-ajuda-view="loja" style="display:none">' +
          '<h2 id="ajudaTituloLoja">🛒 Contratar Loja Virtual</h2>' +
          '<p class="ajuda-intro">A Loja Virtual faz parte do Plano Profissional de R$ 49,90/mês. Se quiser, você também pode solicitar o serviço de montagem e configuração inicial.</p>' +
          '<div class="ajuda-pacote">' +
            '<h3>Loja Virtual Personalizada</h3>' +
            '<p>Após o contato, definiremos a quantidade de produtos e as configurações necessárias para preparar o orçamento do serviço de montagem.</p>' +
            '<button class="btn primary" type="button" data-servico="Quero contratar a construção da loja virtual do Plano Profissional.">Contratar pelo WhatsApp</button>' +
          '</div>' +
        '</div>' +
      '</section>';
    document.body.appendChild(modal);

    const style = document.createElement('style');
    style.textContent =
      '.ajuda-menu-wrap{position:relative;display:inline-flex}.ajuda-submenu{display:none;position:absolute;right:0;top:calc(100% + 7px);z-index:45;width:230px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:6px;box-shadow:0 12px 30px rgba(31,41,55,.18)}' +
      '.ajuda-submenu.open{display:grid;gap:4px}.ajuda-submenu button{border:0;background:#fff;text-align:left;padding:11px;border-radius:8px;cursor:pointer;font-weight:700;color:#1f2937}.ajuda-submenu button:hover{background:#f5f3ff;color:#4c1d95}' +
      '.ajuda-modal{position:fixed;inset:0;z-index:100;align-items:center;justify-content:center;padding:16px}.ajuda-overlay{position:absolute;inset:0;background:rgba(0,0,0,.55)}.ajuda-caixa{position:relative;background:#fff;border-radius:16px;padding:22px;max-width:760px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 18px 50px rgba(0,0,0,.25)}' +
      '.ajuda-fechar{position:absolute;right:12px;top:10px;border:0;background:none;font-size:26px;cursor:pointer;color:#6b7280}.ajuda-caixa h2{margin:0 34px 6px 0}.ajuda-intro{color:#6b7280;font-size:14px;line-height:1.5}.ajuda-pacotes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:18px 0}.ajuda-pacote{border:1px solid #e5e7eb;border-radius:14px;padding:16px;background:#fff}.ajuda-pacote.destaque{border:2px solid #6d28d9;background:#faf5ff}.ajuda-pacote h3{margin:8px 0}.ajuda-pacote strong{display:block;font-size:22px;color:#4c1d95;margin-bottom:8px}.ajuda-pacote p{font-size:13px;color:#6b7280;line-height:1.45;min-height:55px}.ajuda-pacote .btn{width:100%}.ajuda-etiqueta{font-size:11px;font-weight:800;color:#6d28d9;background:#ede9fe;border-radius:20px;padding:5px 9px;display:inline-block}.ajuda-aviso{display:block;color:#6b7280;background:#f9fafb;border-radius:8px;padding:10px}' +
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