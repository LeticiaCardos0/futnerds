import { Component, AfterViewInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { inicializarGlobo } from './nacoes-engine';

/**
 * Tela "Nações" — globo 3D interativo (Three.js) com ligas/clubes reais
 * vindos do backend (futdb, GET /api/nacoes/resumo).
 *
 * Toda a lógica pesada (cena 3D, câmera, raycasting, dados) vive em
 * nacoes-engine.ts, mantido próximo do formato do protótipo original para
 * reduzir risco de regressão — este componente só cuida do ciclo de vida
 * Angular: inicia o motor depois que a view está pronta, e garante que ele
 * seja desligado corretamente ao sair da rota (evita vazar o contexto WebGL
 * e os listeners de `window` para outras páginas do app).
 *
 * encapsulation: None é necessário aqui — o motor preenche o tooltip e o
 * painel via innerHTML puro (portado do protótipo vanilla), e o Angular só
 * aplica CSS com escopo em elementos que ele mesmo processou no template.
 * Conteúdo inserido via innerHTML nunca recebe o atributo de escopo, então
 * com encapsulamento padrão (Emulated) o CSS do componente simplesmente não
 * bate nesses elementos — ficam sem estilo nenhum. As classes já usam o
 * prefixo/nomes específicos (.painel-*, .tooltip-*, .liga-*, --nacoes-*)
 * para minimizar risco de colisão com o resto do app.
 */
@Component({
  selector: 'app-nacoes',
  standalone: true,
  imports: [],
  templateUrl: './nacoes.html',
  // navegador e painel em arquivos à parte por causa do budget anyComponentStyle (avaliado por arquivo)
  styleUrls: ['./nacoes.css', './nacoes-navegador.css', './nacoes-painel.css'],
  encapsulation: ViewEncapsulation.None,
})

export class NacoesComponent implements AfterViewInit, OnDestroy {
  private destruirGlobo: (() => void) | null = null;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    // setTimeout(0) garante que o template já foi 100% pintado no DOM antes
    // do motor procurar os elementos via getElementById.
    setTimeout(() => {
      this.destruirGlobo = inicializarGlobo((rota: string, params: any) => {
        this.router.navigate([rota], { queryParams: params });
      });
    });
  }

  ngOnDestroy(): void {
    this.destruirGlobo?.();
    this.destruirGlobo = null;
  }
}