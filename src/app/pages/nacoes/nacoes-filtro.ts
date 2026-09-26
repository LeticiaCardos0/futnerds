// Filtro com busca da tela "Nações" (Ligas e País/região): um clique abre a
// lista inteira, agrupada; digitar filtra; o item escolhido fica no campo com
// o ícone dele e um X para limpar. Mesmo estilo vanilla do resto do motor
// (nacoes-engine.ts), que monta as opções e decide o que a escolha faz.

export interface OpcaoFiltro {
  id: string;
  grupo: string;
  rotulo: string;
  /** Texto discreto à direita (ex.: país da liga, quantidade de clubes). */
  info?: string;
  icone: string;
  /** O ícone é uma bandeira (fica redondo), não um logo. */
  iconeBandeira?: boolean;
  /** Imagem usada quando o ícone não carrega (ex.: bandeira no lugar do logo da liga). */
  iconeReserva?: string;
  /** Outros nomes que também encontram a opção (ex.: nome em inglês). */
  termos?: string;
}

export interface Filtro {
  definirOpcoes(opcoes: OpcaoFiltro[]): void;
  /** Muda a seleção sem avisar o motor (usado para sincronizar com o globo). */
  definirValor(id: string | null): void;
  temOpcao(id: string): boolean;
}

export const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const escapar = (texto: string) =>
  texto.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Abaixo disso a lista abre para cima, se houver mais espaço lá. */
const ESPACO_MINIMO_ABAIXO = 280;

export function criarFiltro(raiz: HTMLElement, aoEscolher: (opcao: OpcaoFiltro | null) => void): Filtro {
  const campo = raiz.querySelector<HTMLInputElement>('.filtro-campo')!;
  const lista = raiz.querySelector<HTMLUListElement>('.filtro-lista')!;
  const iconeEl = raiz.querySelector<HTMLElement>('.filtro-icone')!;
  const limparEl = raiz.querySelector<HTMLButtonElement>('.filtro-limpar')!;
  const iconeVazio = iconeEl.innerHTML;
  const placeholder = campo.placeholder;

  let opcoes: OpcaoFiltro[] = [];
  let visiveis: OpcaoFiltro[] = [];
  let selecionada: OpcaoFiltro | null = null;
  let indice = -1;

  function imagem(opcao: OpcaoFiltro): string {
    const reserva = opcao.iconeReserva ? ` data-reserva="${escapar(opcao.iconeReserva)}"` : '';
    const classe = opcao.iconeBandeira ? ' class="filtro-img-bandeira"' : '';
    return `<img src="${escapar(opcao.icone)}"${classe}${reserva} alt="" loading="lazy" />`;
  }

  function mostrarSelecionada(): void {
    campo.value = selecionada?.rotulo ?? '';
    iconeEl.innerHTML = selecionada ? imagem(selecionada) : iconeVazio;
    raiz.classList.toggle('nacoes-filtro--preenchido', !!selecionada);
    limparEl.hidden = !selecionada;
  }

  /** Mantém a ordem dos grupos; dentro de cada um, quem começa com o termo vem antes. */
  function filtrar(termo: string): OpcaoFiltro[] {
    const q = semAcento(termo);
    if (!q) return opcoes;
    return opcoes
      .map((opcao, ordem) => {
        const nome = semAcento(opcao.rotulo);
        const outros = semAcento(opcao.termos ?? '');
        const pos = nome.startsWith(q) ? 0 : nome.includes(` ${q}`) ? 1 : nome.includes(q) || outros.includes(q) ? 2 : -1;
        return { opcao, pos, ordem };
      })
      .filter((r) => r.pos >= 0)
      .sort((a, b) => (a.opcao.grupo === b.opcao.grupo ? a.pos - b.pos || a.ordem - b.ordem : a.ordem - b.ordem))
      .map((r) => r.opcao);
  }

  function renderizar(): void {
    let grupoAtual = '';
    lista.innerHTML = visiveis.length
      ? visiveis
          .map((opcao, i) => {
            const cabecalho =
              opcao.grupo !== grupoAtual ? `<li class="filtro-grupo" role="presentation">${escapar((grupoAtual = opcao.grupo))}</li>` : '';
            const classes = ['filtro-item'];
            if (i === indice) classes.push('filtro-item--ativo');
            if (opcao.id === selecionada?.id) classes.push('filtro-item--selecionado');
            return `${cabecalho}
        <li id="${lista.id}-op-${i}" role="option" class="${classes.join(' ')}" data-indice="${i}" aria-selected="${opcao.id === selecionada?.id}">
          <span class="filtro-item-icone">${imagem(opcao)}</span>
          <span class="filtro-item-nome">${escapar(opcao.rotulo)}</span>
          ${opcao.info ? `<span class="filtro-item-info">${escapar(opcao.info)}</span>` : ''}
        </li>`;
          })
          .join('')
      : '<li class="filtro-vazio" role="presentation">Nada encontrado.</li>';
    if (indice >= 0) campo.setAttribute('aria-activedescendant', `${lista.id}-op-${indice}`);
    else campo.removeAttribute('aria-activedescendant');
  }

  function rolarAteAtivo(): void {
    lista.querySelector('.filtro-item--ativo')?.scrollIntoView({ block: 'nearest' });
  }

  /** limparCampo: false quando quem abre é a própria digitação (a tecla já está no campo). */
  function abrir(limparCampo = true): void {
    if (!lista.hidden) return;
    const caixa = raiz.getBoundingClientRect();
    const abaixo = window.innerHeight - caixa.bottom;
    raiz.classList.toggle('nacoes-filtro--acima', abaixo < ESPACO_MINIMO_ABAIXO && caixa.top > abaixo);
    // abre com tudo à vista, já no item escolhido; o campo fica livre para
    // digitar e o nome escolhido passa a ser o placeholder
    if (limparCampo) {
      campo.value = '';
      visiveis = opcoes;
      indice = selecionada ? opcoes.findIndex((o) => o.id === selecionada!.id) : -1;
      renderizar();
    }
    campo.placeholder = selecionada?.rotulo ?? placeholder;
    lista.hidden = false;
    raiz.classList.add('nacoes-filtro--aberto');
    campo.setAttribute('aria-expanded', 'true');
    rolarAteAtivo();
  }

  function fechar(): void {
    lista.hidden = true;
    raiz.classList.remove('nacoes-filtro--aberto');
    campo.setAttribute('aria-expanded', 'false');
    campo.removeAttribute('aria-activedescendant');
    campo.placeholder = placeholder;
    mostrarSelecionada();
  }

  function escolher(opcao: OpcaoFiltro | null): void {
    selecionada = opcao;
    fechar();
    campo.blur(); // no celular fecha o teclado e deixa o painel à vista
    aoEscolher(opcao);
  }

  campo.addEventListener('focus', () => abrir());
  // clicar no campo já focado (lista fechada pelo Esc) reabre
  campo.addEventListener('mousedown', () => {
    if (document.activeElement === campo) abrir();
  });
  campo.addEventListener('blur', () => setTimeout(fechar, 120));
  campo.addEventListener('input', () => {
    if (lista.hidden) abrir(false);
    visiveis = filtrar(campo.value);
    indice = visiveis.length ? 0 : -1;
    renderizar();
    lista.scrollTop = 0;
  });
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (lista.hidden) return abrir();
      if (!visiveis.length) return;
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      indice = (indice + passo + visiveis.length) % visiveis.length;
      renderizar();
      rolarAteAtivo();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!lista.hidden && visiveis.length) escolher(visiveis[Math.max(0, indice)]);
    } else if (e.key === 'Escape') {
      fechar();
    }
  });
  // mousedown (e não click): escolhe antes do blur do campo fechar a lista
  lista.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const item = (e.target as HTMLElement).closest<HTMLElement>('.filtro-item');
    if (item) escolher(visiveis[Number(item.dataset['indice'])]);
  });
  // o ícone e a seta também abrem o filtro, como num select
  raiz.addEventListener('mousedown', (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo === campo || lista.contains(alvo) || limparEl.contains(alvo)) return;
    e.preventDefault();
    if (document.activeElement === campo) abrir();
    else campo.focus();
  });
  limparEl.addEventListener('mousedown', (e) => e.preventDefault());
  limparEl.addEventListener('click', () => escolher(null));
  // logo que não carrega vira a bandeira de reserva; sem reserva, some.
  // `error` não borbulha, por isso a captura.
  raiz.addEventListener(
    'error',
    (e) => {
      const img = e.target as HTMLImageElement;
      if (img.tagName !== 'IMG') return;
      const reserva = img.dataset['reserva'];
      if (reserva) {
        delete img.dataset['reserva'];
        img.src = reserva;
        img.classList.add('filtro-img-bandeira');
      } else {
        img.style.visibility = 'hidden';
      }
    },
    true
  );

  return {
    definirOpcoes(novas) {
      opcoes = novas;
      if (selecionada) selecionada = opcoes.find((o) => o.id === selecionada!.id) ?? null;
      if (!lista.hidden) {
        visiveis = filtrar(campo.value);
        renderizar();
      } else {
        mostrarSelecionada();
      }
    },
    definirValor(id) {
      selecionada = id ? opcoes.find((o) => o.id === id) ?? null : null;
      if (lista.hidden) mostrarSelecionada();
    },
    temOpcao(id) {
      return opcoes.some((o) => o.id === id);
    },
  };
}
