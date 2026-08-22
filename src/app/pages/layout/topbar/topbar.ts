import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TemaService } from '../../../tema/tema';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  protected readonly temaService = inject(TemaService);
}